export const dynamic = "force-dynamic";

import { errorResponse, successResponse } from "@/lib/api-response";
import { createClientCookies } from "@/lib/supabase-server";
import { after } from "next/server";
import { recordVisitorRequest } from "@/lib/visitor-ip-logs";

export async function GET(request: Request) {
  try {
    const supabaseServer = await createClientCookies();
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return errorResponse("User not found or not authenticated", 401);
    }
    after(() => recordVisitorRequest(request, { user, source: "session" }));

    const { data: profile } = await supabaseServer
      .from("profiles")
      .select("id, email, full_name, phone, role, created_at")
      .eq("id", user.id)
      .single();

    return successResponse(
      {
        id: user.id,
        email: user.email,
        profile: profile || null,
      },
      "User data retrieved successfully",
    );
  } catch (err: any) {
    return errorResponse("Failed to load user data", 500);
  }
}
