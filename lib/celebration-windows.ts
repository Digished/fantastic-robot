// Two separate clocks gate what a celebration page allows:
//
//   ┌───────── content lock (1h before) ─── wall posts, gallery uploads,
//   │                                       and creator edits to copy,
//   │                                       cover, gallery, theme, music
//   │
//   ├───────── contribution lock (72h before) ─── money contributions
//   │                                             and recipient-bank changes
//   │
//   └───────── celebration_date ─── slideshow plays; gift unlocks
//
// `deadline_at` in the celebrations table is the contribution lock (set by a
// DB trigger to celebration_date - 72h). The content lock is derived in code
// from celebration_date because it doesn't have its own column.

const ONE_HOUR_MS = 60 * 60 * 1000;
export const CONTENT_LOCK_HOURS = 1;
export const CONTRIBUTION_LOCK_HOURS = 72;

function toMs(value: string | Date): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/** When the content-edit window closes (1 hour before the celebration). */
export function contentWindowClosesAt(celebrationDate: string | Date): Date {
  return new Date(toMs(celebrationDate) - CONTENT_LOCK_HOURS * ONE_HOUR_MS);
}

/** True until 1 hour before the celebration starts. */
export function contentWindowOpen(
  celebrationDate: string | Date,
  now: number = Date.now(),
): boolean {
  return contentWindowClosesAt(celebrationDate).getTime() > now;
}
