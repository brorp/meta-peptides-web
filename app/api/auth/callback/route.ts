import { createClientCookies } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import {
  buildVisitorMetadata,
  ensureProfileExistsForUser,
  getProviderLabel,
  getUserDisplayName,
} from "@/lib/auth-notifications";
import { sendRegisteredUserEmails } from "@/lib/email-service";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClientCookies();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user && !user.is_anonymous && user.email) {
          const isNewUser = await ensureProfileExistsForUser(user);

          if (isNewUser) {
            await sendRegisteredUserEmails({
              customerName: getUserDisplayName(user),
              customerEmail: user.email,
              userId: user.id,
              providerLabel: getProviderLabel(user, "google"),
              createdAt: user.created_at,
              shopUrl: `${origin}/shop`,
              metadata: buildVisitorMetadata(request),
            });
          }
        }
      } catch (notificationError) {
        console.error("[Auth] Google callback notification failed:", notificationError);
      }

      return NextResponse.redirect(`${origin}/shop`);
    }

    console.error("Exchange Code Error:", error);
  }

  return NextResponse.redirect(`${origin}/auth?error=verifier-missing`);
}
