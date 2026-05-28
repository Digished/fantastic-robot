import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

const TTL_MS = 10 * 60 * 1000; // 10 minutes

// Derive a stable signing secret from the service key — never exposed to clients.
function secret() {
  return Buffer.from(env.supabaseServiceKey().slice(0, 32), "utf8");
}

export function generateOtp(): { code: string; expires: number } {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  return { code, expires: Date.now() + TTL_MS };
}

// Returns an opaque string that binds email + code + expiry together.
// The code is NOT included — it stays only in the email.
export function signOtp(email: string, code: string, expires: number): string {
  const payload = `${email}:${code}:${expires}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${expires}.${sig}`;
}

// Returns true only if the code matches the signature and hasn't expired.
export function verifyOtp(email: string, code: string, token: string): boolean {
  const dotIdx = token.indexOf(".");
  if (dotIdx === -1) return false;
  const expires = Number(token.slice(0, dotIdx));
  const sig = token.slice(dotIdx + 1);
  if (!expires || Date.now() > expires) return false;
  const expected = createHmac("sha256", secret())
    .update(`${email}:${code}:${expires}`)
    .digest("base64url");
  try {
    return timingSafeEqual(Buffer.from(sig, "base64url"), Buffer.from(expected, "base64url"));
  } catch {
    return false;
  }
}
