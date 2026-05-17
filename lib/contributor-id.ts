// Client-side contributor identity. A stable UUID per device, stored in a
// cookie so the contributor can edit or delete their own wall messages
// without signing up.

export const CONTRIBUTOR_COOKIE = "sb_cid";

export function getOrCreateContributorId(): string {
  if (typeof document === "undefined") return "";
  const existing = document.cookie
    .split("; ")
    .find((r) => r.startsWith(`${CONTRIBUTOR_COOKIE}=`));
  if (existing) return decodeURIComponent(existing.split("=")[1]);

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);

  const maxAge = 60 * 60 * 24 * 365 * 2; // 2 years
  document.cookie = `${CONTRIBUTOR_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${maxAge}; samesite=lax`;
  return id;
}

export function readContributorId(): string {
  if (typeof document === "undefined") return "";
  const c = document.cookie
    .split("; ")
    .find((r) => r.startsWith(`${CONTRIBUTOR_COOKIE}=`));
  return c ? decodeURIComponent(c.split("=")[1]) : "";
}
