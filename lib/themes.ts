export type Theme = "ivory" | "midnight" | "bloom" | "sage" | "ocean" | "dusk";

export const THEMES: { id: Theme; label: string; swatch: string }[] = [
  { id: "ivory",    label: "Ivory",    swatch: "linear-gradient(135deg,#FDF3E2 0%,#F6CFA8 60%,#FBE7C9 100%)" },
  { id: "bloom",    label: "Bloom",    swatch: "linear-gradient(135deg,#FCE7F3 0%,#F9A8D4 60%,#FFE4E6 100%)" },
  { id: "sage",     label: "Sage",     swatch: "linear-gradient(135deg,#DCFCE7 0%,#86EFAC 60%,#ECFCCB 100%)" },
  { id: "ocean",    label: "Ocean",    swatch: "linear-gradient(135deg,#DBEAFE 0%,#93C5FD 60%,#E0F2FE 100%)" },
  { id: "dusk",     label: "Dusk",     swatch: "linear-gradient(135deg,#FFD6BA 0%,#FFAE8F 50%,#B97AC0 100%)" },
  { id: "midnight", label: "Midnight", swatch: "linear-gradient(135deg,#2A1421 0%,#3B1F2B 60%,#4A2538 100%)" },
];

export function isTheme(v: unknown): v is Theme {
  return typeof v === "string" && THEMES.some((t) => t.id === v);
}
