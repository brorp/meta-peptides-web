import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "admin-session";
const JWT_SECRET = new TextEncoder().encode(
    process.env.ADMIN_JWT_SECRET || "fallback-secret-change-me",
);

export async function validateAccessCode(code: string): Promise<boolean> {
    const expectedCode = process.env.ADMIN_ACCESS_CODE;
    if (!expectedCode) return false;

    const a = Buffer.from(code);
    const b = Buffer.from(expectedCode);

    if (a.length !== b.length) return false;

    return crypto.timingSafeEqual(a, b);
}

export async function createAdminSession(): Promise<string> {
    const token = await new SignJWT({ role: "admin" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(JWT_SECRET);

    return token;
}

export async function verifyAdminSession(token: string): Promise<boolean> {
    try {
        await jwtVerify(token, JWT_SECRET);
        return true;
    } catch {
        return false;
    }
}

export async function getAdminSessionFromCookies(): Promise<boolean> {
    const cookieStore = await cookies();
    const session = cookieStore.get(COOKIE_NAME);
    if (!session?.value) return false;
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
