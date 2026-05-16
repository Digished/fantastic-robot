export function timeUntil(target: Date | string): string {
  const t = typeof target === "string" ? new Date(target).getTime() : target.getTime();
  const ms = t - Date.now();
  if (ms <= 0) return "now";
  const sec = Math.floor(ms / 1000);
  const day = Math.floor(sec / 86400);
  const hr  = Math.floor((sec % 86400) / 3600);
  const min = Math.floor((sec % 3600) / 60);
  if (day > 0) return `${day}d ${hr}h`;
  if (hr  > 0) return `${hr}h ${min}m`;
  return `${min}m`;
}

export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(date);
}
