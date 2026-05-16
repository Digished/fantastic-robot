import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNaira(kobo: bigint | number): string {
  const n = typeof kobo === "bigint" ? Number(kobo) : kobo;
  return "₦" + (n / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 });
}
