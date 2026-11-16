import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

export const locationCookie = (id: string) => `visitor-location-${id}`;
export const locationCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/visitor-location",
  maxAge: 7200,
};
function key() {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) throw Error("Location signing key unavailable");
  return new TextEncoder().encode(secret);
}
export async function createLocationSession(origin: string, deviceKey: string) {
  const id = randomUUID();
  const token = await new SignJWT({ device: deviceKey })
    .setProtectedHeader({ alg: "HS256" }).setIssuer("visitor-location")
    .setAudience(origin).setSubject(id).setIssuedAt().setExpirationTime("2h").sign(key());
  return { id, token };
}
export async function verifyLocationSession(token: string, id: string, origin: string, deviceKey: string) {
  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: ["HS256"], issuer: "visitor-location", audience: origin,
    });
    return payload.sub === id && payload.device === deviceKey;
  } catch { return false; }
}
