import { createClientCookies } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClientCookies();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}/shop`);
    }

    console.error("Exchange Code Error:", error);
  }

  return NextResponse.redirect(`${origin}/login?error=verifier-missing`);
}
