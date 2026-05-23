// Date math for self-created pages. Lagos has no DST (UTC+1), so we anchor
// every celebration at 09:00 Africa/Lagos. Recurring (birthday) pages roll
// the chosen month/day forward until the next occurrence is far enough out.

const LAGOS_OFFSET = "+01:00";
export const MIN_LEAD_MS = 96 * 3600 * 1000; // matches the 96h create rule

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function at9amLagos(year: number, month: number, day: number): Date {
  return new Date(`${pad(year)}-${pad(month)}-${pad(day)}T09:00:00${LAGOS_OFFSET}`);
}

/**
 * Turn a `YYYY-MM-DD` date into the celebration timestamp.
 * - Recurring: ignores the input year and finds the next occurrence of the
 *   month/day that is at least 96h away.
 * - One-off: uses the date as given.
 * Returns an ISO string, or null if the (one-off) date is too soon / invalid.
 */
export function buildSelfCelebrationDate(
  dateYmd: string,
  recurring: boolean,
  now: number = Date.now(),
): string | null {
  const [y, m, d] = dateYmd.split("-").map(Number);
  if (!y || !m || !d) return null;

  if (!recurring) {
    const dt = at9amLagos(y, m, d);
    if (Number.isNaN(dt.getTime()) || dt.getTime() < now + MIN_LEAD_MS) return null;
    return dt.toISOString();
  }

  let year = new Date(now).getUTCFullYear();
  let dt = at9amLagos(year, m, d);
  // Guard against an unreachable loop (bad month/day) with a small cap.
  for (let i = 0; i < 8 && dt.getTime() < now + MIN_LEAD_MS; i++) {
    year += 1;
    dt = at9amLagos(year, m, d);
  }
  if (Number.isNaN(dt.getTime()) || dt.getTime() < now + MIN_LEAD_MS) return null;
  return dt.toISOString();
}
