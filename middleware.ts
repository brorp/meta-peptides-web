import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // BUAT INSTANCE SUPABASE KHUSUS MIDDLEWARE
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookieOptions: {
        name: "auth-token",
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Sekarang user tidak akan null jika token ada di cookie
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("User Status:", user);

  // 1. Proteksi Halaman Checkout
  if (request.nextUrl.pathname.startsWith("/checkout") && !user) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  // 2. Proteksi API Checkout
  if (request.nextUrl.pathname.startsWith("/api/checkout") && !user) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 },
    );
  }

  return response;
}

export const config = {
  matcher: ["/checkout/:path*", "/api/checkout/:path*"],
};
