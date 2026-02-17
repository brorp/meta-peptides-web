export const dynamic = "force-dynamic";

import { errorResponse, successResponse } from "@/lib/api-response";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return errorResponse("User not found or not authenticated", 401);
    }

    const { data: profile } = await supabaseServer
      .from("profiles")
      .select("*")
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
    return errorResponse(err.message || "Internal Server Error", 500);
  }
}
