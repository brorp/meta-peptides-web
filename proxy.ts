import { createServerClient } from "@supabase/ssr";
import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "fallback-secret-change-me",
);

type AdminRole = "root" | "admin";

const SALES_ADMIN_PANEL_PREFIXES = [
  "/panel-xyz123/daily-tasks",
  "/panel-xyz123/users",
  "/panel-xyz123/orders",
  "/panel-xyz123/resellers",
  "/panel-xyz123/vouchers",
  "/panel-xyz123/customers",
];

const SALES_ADMIN_API_PREFIXES = [
  "/api/admin/auth",
  "/api/admin/daily-tasks",
  "/api/admin/users",
  "/api/admin/orders",
  "/api/admin/resellers",
  "/api/admin/vouchers",
  "/api/admin/customers",
  "/api/admin/upload",
];

async function verifyAdminToken(token: string): Promise<AdminRole | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.role === "root" || payload.role === "admin"
      ? payload.role
      : null;
  } catch {
    return null;
  }
}

const isAllowedForSalesAdmin = (pathname: string, prefixes: string[]) =>
  prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- ADMIN ROUTE PROTECTION ---
  if (pathname.startsWith("/panel-xyz123")) {
    const session = request.cookies.get("admin-session");
    const role = session?.value ? await verifyAdminToken(session.value) : null;
    if (!role) {
      return NextResponse.redirect(new URL("/login-panel", request.url));
    }

    if (role === "admin") {
      if (pathname === "/panel-xyz123") {
        return NextResponse.redirect(
          new URL("/panel-xyz123/daily-tasks", request.url),
        );
      }

      if (!isAllowedForSalesAdmin(pathname, SALES_ADMIN_PANEL_PREFIXES)) {
        return NextResponse.redirect(
          new URL("/panel-xyz123/daily-tasks", request.url),
        );
      }
    }

    return NextResponse.next();
  }

  // Redirect authenticated admin away from login
  if (pathname.startsWith("/login-panel")) {
    const session = request.cookies.get("admin-session");
    const role = session?.value ? await verifyAdminToken(session.value) : null;
    if (role) {
      return NextResponse.redirect(
        new URL(
          role === "admin" ? "/panel-xyz123/daily-tasks" : "/panel-xyz123",
          request.url,
        ),
      );
    }
    return NextResponse.next();
  }

  // Protect admin API routes
  if (pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/auth")) {
    const session = request.cookies.get("admin-session");
    const role = session?.value ? await verifyAdminToken(session.value) : null;
    if (!role) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    if (
      role === "admin" &&
      !isAllowedForSalesAdmin(pathname, SALES_ADMIN_API_PREFIXES)
    ) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    return NextResponse.next();
  }

  // --- STOREFRONT ROUTE PROTECTION (existing logic) ---
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

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
          cookiesToSet.forEach(({ name, value }) =>
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname.startsWith("/auth") && user) {
    return NextResponse.redirect(new URL("/shop", request.url));
  }

  if (pathname.startsWith("/checkout") && !user) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  if (pathname.startsWith("/api/checkout") && !user) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 },
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/auth/:path*",
    "/checkout/:path*",
    "/api/checkout/:path*",
    "/panel-xyz123/:path*",
    "/login-panel",
    "/api/admin/:path*",
  ],
};
