export type InteractiveKind =
  | "none"
  | "gift" | "letter" | "cake" | "heart"
  | "scratch" | "polaroid" | "balloons" | "jar" | "sparkler" | "toast";

export type MediaKind = "none" | "audio" | "video" | "image";

export type InteractiveProps = {
  body: string | null;
  mediaKind?: MediaKind;
  mediaPath?: string | null;
  payload?: Record<string, unknown> | null;
  authorName: string;
  onRevealed?: () => void;
  /** `dark` for player slides, `light` for wall viewer (which uses a dark backdrop). */
  surface?: "light" | "dark";
};

export type InteractiveMeta = {
  id: Exclude<InteractiveKind, "none">;
  label: string;
  caption: string;
  glyph: string;
};

export const INTERACTIVE_OPTIONS: InteractiveMeta[] = [
  { id: "gift",     label: "Wrapped gift",  caption: "Tap to unwrap",         glyph: "🎁" },
  { id: "letter",   label: "Sealed letter", caption: "Crack the seal",        glyph: "✉️" },
  { id: "cake",     label: "Birthday cake", caption: "Blow out the candles",  glyph: "🎂" },
  { id: "heart",    label: "Tap-to-heart",  caption: "Tap to send love back", glyph: "❤️" },
  { id: "scratch",  label: "Scratch card",  caption: "Scratch to reveal",     glyph: "🪙" },
  { id: "polaroid", label: "Polaroid",      caption: "Develop the photo",     glyph: "📸" },
  { id: "balloons", label: "Balloon pop",   caption: "Pop the balloons",      glyph: "🎈" },
  { id: "jar",      label: "Memory jar",    caption: "Pull out the notes",    glyph: "🫙" },
  { id: "sparkler", label: "Sparkler",      caption: "Draw with your finger", glyph: "✨" },
  { id: "toast",    label: "Toast glasses", caption: "Tap to clink",          glyph: "🥂" },
];
