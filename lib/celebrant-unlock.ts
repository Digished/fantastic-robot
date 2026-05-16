import crypto from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

const PREFIX = "sbu_";
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function secret(): string {
  // Reuse the service-role key as an HMAC key (server-only, always present).
  return env.supabaseServiceKey();
}

function sign(slug: string): string {
  const ts = Date.now().toString(36);
  const payload = `${slug}.${ts}`;
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("hex").slice(0, 32);
  return `${payload}.${sig}`;
}

function verify(token: string | undefined, slug: string): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [tSlug, ts, sig] = parts;
  if (tSlug !== slug) return false;
  const expected = crypto.createHmac("sha256", secret()).update(`${tSlug}.${ts}`).digest("hex").slice(0, 32);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function isCelebrantUnlocked(slug: string): Promise<boolean> {
  const store = await cookies();
  return verify(store.get(`${PREFIX}${slug}`)?.value, slug);
}

export async function setCelebrantUnlocked(slug: string): Promise<void> {
  const store = await cookies();
  store.set(`${PREFIX}${slug}`, sign(slug), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: MAX_AGE,
  });
}
