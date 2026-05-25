// Label for the creator-only "52 Weeks of Blessings" entry on a celebration
// page. A paid plan stays reachable per celebration; null means none bought yet.
export type BlessingEntryStatus =
  | "awaiting_redemption"
  | "active"
  | "completed"
  | null
  | undefined;

export function blessingEntryLabel(status: BlessingEntryStatus): string {
  switch (status) {
    case "awaiting_redemption":
      return "52 Weeks of Blessings · share link";
    case "active":
      return "52 Weeks of Blessings · active";
    case "completed":
      return "52 Weeks of Blessings · complete";
    default:
      return "Add 52 Weeks of Blessings";
  }
}
