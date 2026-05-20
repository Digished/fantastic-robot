// Admin dashboard authentication — a separate, env-driven login that is
// independent of the Supabase user system. Email/password live in
// ADMIN_EMAIL / ADMIN_PASSWORD; the session cookie is a signed JWT.

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

const COOKIE_NAME = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;  // 7 days

function secretKey() {
  return new TextEncoder().encode(env.adminSessionSecret());
}

export async function signAdminToken(email: string): Promise<string> {
  return new SignJWT({ sub: email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifyAdminToken(
  token: string | undefined,
): Promise<{ email: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    const email = typeof payload.sub === "string" ? payload.sub : null;
    if (!email || email !== env.adminEmail()) return null;
    return { email };
  } catch {
    return null;
  }
}

export async function setAdminSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearAdminSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getAdminSession(): Promise<{ email: string } | null> {
  const jar = await cookies();
  return verifyAdminToken(jar.get(COOKIE_NAME)?.value);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
