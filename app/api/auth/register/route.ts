import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { createClientCookies } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const supabaseServer = await createClientCookies();
    const { email, password } = await req.json();

    if (!email || !password) {
      return errorResponse("Email and password are required.", 400);
    }

    const { data, error: authError } =
      await supabaseServer.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) return errorResponse(authError.message, 400);

    const user = data.user;

    const { error: profileError } = await supabaseServer
      .from("profiles")
      .insert([
        {
          id: user.id,
          email: email,
        },
      ]);

    if (profileError) {
      console.error("Profile creation failed:", profileError.message);
    }

    return successResponse(
      { userId: user.id },
      "Registration successful. Your account is now active.",
      201,
    );
  } catch (err: any) {
    return errorResponse(err.message || "Internal Server Error", 500);
  }
}
