import { NextRequest } from "next/server";
import * as z from "zod";
import { errorResponse, successResponse } from "@/lib/api-response";
import { sendPasswordResetEmail } from "@/lib/email-service";
import { supabaseAdmin } from "@/lib/supabase-server";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
});

const GENERIC_SUCCESS_MESSAGE =
  "If an account exists for that email, we have sent a secure password reset link.";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsedBody = forgotPasswordSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message || "Please enter a valid email address.",
        400,
      );
    }

    const email = parsedBody.data.email.toLowerCase();

    if (!process.env.RESEND_API_KEY) {
      return errorResponse(
        "Password reset email service is not configured right now.",
        500,
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (profileError) {
      console.error("[Auth] Forgot password profile lookup failed:", profileError);
      return errorResponse(
        "Unable to prepare a password reset email right now. Please try again.",
        500,
      );
    }

    if (!profile) {
      return successResponse({ email }, GENERIC_SUCCESS_MESSAGE);
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
      new URL(req.url).origin;

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${appUrl}/auth/reset-password`,
        },
      });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("[Auth] Forgot password link generation failed:", linkError);
      return errorResponse(
        "Unable to prepare a password reset email right now. Please try again.",
        500,
      );
    }

    const isEmailSent = await sendPasswordResetEmail({
      customerEmail: email,
      resetUrl: linkData.properties.action_link,
    });

    if (!isEmailSent) {
      return errorResponse(
        "We could not send the password reset email. Please try again.",
        500,
      );
    }

    return successResponse({ email }, GENERIC_SUCCESS_MESSAGE);
  } catch (err: any) {
    return errorResponse(err.message || "Internal Server Error", 500);
  }
}
