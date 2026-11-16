import { after, NextRequest } from "next/server";
import { recordVisitorRequest } from "@/lib/visitor-ip-logs";
import { errorResponse, successResponse } from "@/lib/api-response";
import { createClientCookies } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const supabase = await createClientCookies();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return errorResponse("Invalid credentials or unverified email.", 401);
    }

    const loggedInUser = data.user;
    after(() => recordVisitorRequest(req, { user: loggedInUser, source: "login" }));
    return successResponse(
      { user: data.user, session: data.session },
      "Login Successfully. Welcome back to MetaPeptides.",
    );
  } catch (err: any) {
    return errorResponse("An unexpected error occurred during login.", 500);
  }
}
