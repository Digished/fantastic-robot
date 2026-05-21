export function formatNaira(kobo: number | bigint | null | undefined): string {
  if (kobo == null) return "₦0";
  const n = typeof kobo === "bigint" ? Number(kobo) : kobo;
  const naira = n / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(naira);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(
    new Date(iso),
  );
}
