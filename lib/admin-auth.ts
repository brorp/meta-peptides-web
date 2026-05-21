import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "admin-session";
const JWT_SECRET = new TextEncoder().encode(
    process.env.ADMIN_JWT_SECRET || "fallback-secret-change-me",
);

export type AdminRole = "root" | "admin";

export async function validateAccessCode(code: string): Promise<AdminRole | null> {
    const expectedCode = process.env.ADMIN_ACCESS_CODE;
    const salesAdminCode =
        process.env.ADMIN_SALES_ACCESS_CODE || "adminmeta123";

    const matchesCode = (candidate: string, expected?: string | null) => {
        if (!expected) return false;

        const a = Buffer.from(candidate);
        const b = Buffer.from(expected);

        if (a.length !== b.length) return false;

        return crypto.timingSafeEqual(a, b);
    };

    if (matchesCode(code, expectedCode)) return "root";
    if (matchesCode(code, salesAdminCode)) return "admin";

    return null;
}

export async function createAdminSession(role: AdminRole): Promise<string> {
    const token = await new SignJWT({ role })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(JWT_SECRET);

    return token;
}

export async function verifyAdminSession(token: string): Promise<AdminRole | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload.role === "root" || payload.role === "admin"
            ? payload.role
            : null;
    } catch {
        return null;
    }
}

export async function getAdminSessionFromCookies(): Promise<AdminRole | null> {
    const cookieStore = await cookies();
    const session = cookieStore.get(COOKIE_NAME);
    if (!session?.value) return null;
    return verifyAdminSession(session.value);
}

export async function setAdminSessionCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
    });
}

export async function clearAdminSession() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}
