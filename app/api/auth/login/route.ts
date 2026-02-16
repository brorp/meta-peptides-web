import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { createClientCookies, supabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const supabase = await createClientCookies();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return errorResponse("Invalid credentials or unverified email.", 401);
    }

    return successResponse(
      { user: data.user, session: data.session },
      "Login Successfully. Welcome back to MetaPeptides.",
    );
  } catch (err: any) {
    return errorResponse("An unexpected error occurred during login.", 500);
  }
}
