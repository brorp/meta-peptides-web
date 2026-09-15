import { NextRequest, NextResponse } from "next/server";
import { createClientCookies } from "@/lib/supabase-server";
import { getTrustedRequestOrigin } from "@/lib/app-origin";

export async function GET(req: NextRequest) {
  const appOrigin = getTrustedRequestOrigin(req.url);
  const supabaseServer = await createClientCookies();
  const { data, error } = await supabaseServer.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appOrigin}/api/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error) {
    return NextResponse.redirect(
      `${appOrigin}/shop?error=google-authentication-failed`,
    );
  }

  // Supabase akan memberikan URL Google Consent Screen
  return NextResponse.redirect(data.url);
}
