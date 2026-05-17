export type InteractiveKind = "none" | "gift" | "letter" | "cake" | "heart";

export type InteractiveProps = {
  body: string | null;
  payload?: Record<string, unknown> | null;
  authorName: string;
  onRevealed?: () => void;
  /** Display variant. `dark` for player slides (on themed bg), `light` for wall viewer. */
  surface?: "light" | "dark";
};

export type InteractiveMeta = {
  id: Exclude<InteractiveKind, "none">;
  label: string;
  caption: string;
  /** Emoji glyph for the picker thumbnail only (still uses Lucide elsewhere). */
  glyph: string;
};

export const INTERACTIVE_OPTIONS: InteractiveMeta[] = [
  { id: "gift",   label: "Wrapped gift",   caption: "Tap to unwrap",          glyph: "🎁" },
  { id: "letter", label: "Sealed letter",  caption: "Crack the seal",         glyph: "✉️" },
  { id: "cake",   label: "Birthday cake",  caption: "Blow out the candles",   glyph: "🎂" },
  { id: "heart",  label: "Tap-to-heart",   caption: "Tap to send love back",  glyph: "❤️" },
];
