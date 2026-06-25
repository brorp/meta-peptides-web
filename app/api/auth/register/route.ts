import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  buildVisitorMetadata,
  getProviderLabel,
  getUserDisplayName,
} from "@/lib/auth-notifications";
import { sendRegisteredUserEmails } from "@/lib/email-service";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    if (!normalizedEmail || !password) {
      return errorResponse("Email and password are required.", 400);
    }

    const { data, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
      });

    if (authError) {
      console.error("[Auth] Registration create user failed:", authError);
      return errorResponse("Registration failed. Please try again.", 400);
    }

    const user = data.user;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: normalizedEmail,
        },
        { onConflict: "id" },
      );

    if (profileError) {
      console.error("Profile creation failed:", profileError.message);

      const { error: rollbackError } = await supabaseAdmin.auth.admin.deleteUser(
        user.id,
      );

      if (rollbackError) {
        console.error("Auth rollback failed:", rollbackError.message);
      }

      return errorResponse(
        "Registration failed while initializing the user profile. Please try again.",
        500,
      );
    }

    const shopUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
      new URL(req.url).origin;

    await sendRegisteredUserEmails({
      customerName: getUserDisplayName(user),
      customerEmail: normalizedEmail,
      userId: user.id,
      providerLabel: getProviderLabel(user, "email"),
      createdAt: user.created_at,
      shopUrl: `${shopUrl}/shop`,
      metadata: buildVisitorMetadata(req),
    });

    return successResponse(
      { userId: user.id },
      "Registration successful. Your account is now active.",
      201,
    );
  } catch (err: any) {
    console.error("[Auth] Registration error:", err);
    return errorResponse("Registration failed. Please try again.", 500);
  }
}
