import crypto from "node:crypto";

export function normaliseAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hashAnswer(answer: string): string {
  return crypto.createHash("sha256").update(normaliseAnswer(answer)).digest("hex");
}

export function answerMatches(answer: string, expectedHash: string): boolean {
  const a = Buffer.from(hashAnswer(answer));
  const b = Buffer.from(expectedHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
