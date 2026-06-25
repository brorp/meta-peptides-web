import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { createClientCookies } from "@/lib/supabase-server";
import {
  buildVisitorMetadata,
  getProviderLabel,
} from "@/lib/auth-notifications";
import { sendGuestSessionAlertEmail } from "@/lib/email-service";

type GuestRequestBody = {
  language?: string;
  timezone?: string;
  platform?: string;
  screenSize?: string;
  viewport?: string;
  entryPath?: string;
  referer?: string;
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClientCookies();
    const body = ((await req.json().catch(() => ({}))) || {}) as GuestRequestBody;

    const visitorMetadata = buildVisitorMetadata(req, {
      language: body.language || null,
      timezone: body.timezone || null,
      platform: body.platform || null,
      screenSize: body.screenSize || null,
      viewport: body.viewport || null,
      entryPath: body.entryPath || null,
      referer: body.referer || req.headers.get("referer"),
    });

    const { data, error } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          guest_entry_path: visitorMetadata.entryPath,
          guest_language: visitorMetadata.language,
          guest_timezone: visitorMetadata.timezone,
          guest_platform: visitorMetadata.platform,
          guest_screen_size: visitorMetadata.screenSize,
          guest_viewport: visitorMetadata.viewport,
          guest_origin: visitorMetadata.origin,
        },
      },
    });

    if (error || !data.user) {
      return errorResponse(
        error?.message || "Unable to start guest session.",
        400,
      );
    }

    await sendGuestSessionAlertEmail({
      guestId: data.user.id,
      createdAt: data.user.created_at,
      metadata: visitorMetadata,
    });

    return successResponse(
      {
        user: {
          id: data.user.id,
          email: data.user.email || null,
          is_anonymous: data.user.is_anonymous,
        },
        provider: getProviderLabel(data.user, "anonymous"),
      },
      "Continuing as guest.",
    );
  } catch (err: any) {
    console.error("[Auth] Guest session error:", err);
    return errorResponse("Unable to continue as guest right now.", 500);
  }
}
