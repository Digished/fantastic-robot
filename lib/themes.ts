export type Theme =
  | "ivory" | "bloom" | "sage" | "ocean" | "dusk"
  | "coral" | "lavender" | "gold" | "forest" | "berry"
  | "sky" | "sunset" | "mint" | "peach"
  | "midnight" | "noir";

export const THEMES: { id: Theme; label: string; swatch: string }[] = [
  { id: "ivory",    label: "Ivory",    swatch: "linear-gradient(135deg,#FDF3E2 0%,#F6CFA8 60%,#FBE7C9 100%)" },
  { id: "bloom",    label: "Bloom",    swatch: "linear-gradient(135deg,#FCE7F3 0%,#F9A8D4 60%,#FFE4E6 100%)" },
  { id: "sage",     label: "Sage",     swatch: "linear-gradient(135deg,#DCFCE7 0%,#86EFAC 60%,#ECFCCB 100%)" },
  { id: "ocean",    label: "Ocean",    swatch: "linear-gradient(135deg,#DBEAFE 0%,#93C5FD 60%,#E0F2FE 100%)" },
  { id: "dusk",     label: "Dusk",     swatch: "linear-gradient(135deg,#FFD6BA 0%,#FFAE8F 50%,#B97AC0 100%)" },
  { id: "coral",    label: "Coral",    swatch: "linear-gradient(135deg,#FFF1F0 0%,#FCA5A5 60%,#FECDD3 100%)" },
  { id: "lavender", label: "Lavender", swatch: "linear-gradient(135deg,#F5F3FF 0%,#C4B5FD 60%,#DDD6FE 100%)" },
  { id: "gold",     label: "Gold",     swatch: "linear-gradient(135deg,#FFFBEB 0%,#FCD34D 60%,#FDE68A 100%)" },
  { id: "forest",   label: "Forest",   swatch: "linear-gradient(135deg,#ECFDF5 0%,#6EE7B7 60%,#A7F3D0 100%)" },
  { id: "berry",    label: "Berry",    swatch: "linear-gradient(135deg,#FDF2F8 0%,#F472B6 60%,#FBCFE8 100%)" },
  { id: "sky",      label: "Sky",      swatch: "linear-gradient(135deg,#F0F9FF 0%,#7DD3FC 60%,#BAE6FD 100%)" },
  { id: "sunset",   label: "Sunset",   swatch: "linear-gradient(135deg,#FFF7ED 0%,#FDBA74 60%,#FED7AA 100%)" },
  { id: "mint",     label: "Mint",     swatch: "linear-gradient(135deg,#F0FDFA 0%,#5EEAD4 60%,#99F6E4 100%)" },
  { id: "peach",    label: "Peach",    swatch: "linear-gradient(135deg,#FFF5EC 0%,#FFBE99 60%,#FFD4B8 100%)" },
  { id: "midnight", label: "Midnight", swatch: "linear-gradient(135deg,#2A1421 0%,#3B1F2B 60%,#4A2538 100%)" },
  { id: "noir",     label: "Noir",     swatch: "linear-gradient(135deg,#292524 0%,#0C0A09 60%,#44403C 100%)" },
];

export const THEME_IDS = THEMES.map((t) => t.id) as [Theme, ...Theme[]];

export function isTheme(v: unknown): v is Theme {
  return typeof v === "string" && THEMES.some((t) => t.id === v);
}
