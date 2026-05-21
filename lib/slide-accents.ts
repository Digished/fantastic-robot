// Per-slide accent within the active theme. Each slide can pick one of the
// theme's palette slots as its dominant tint; "default" keeps the built-in
// scene gradient. Stored inside intro_content.slideStyles so no schema change.

export type SlideAccent =
  | "default" | "accent" | "meshA" | "meshB" | "meshC" | "meshD";

export const SLIDE_ACCENTS: ReadonlyArray<{
  id: SlideAccent;
  label: string;
  cssVar: string | null;
}> = [
  { id: "default", label: "Auto", cssVar: null },
  { id: "accent", label: "Accent", cssVar: "var(--accent)" },
  { id: "meshA", label: "Tint 1", cssVar: "var(--mesh-a)" },
  { id: "meshB", label: "Tint 2", cssVar: "var(--mesh-b)" },
  { id: "meshC", label: "Tint 3", cssVar: "var(--mesh-c)" },
  { id: "meshD", label: "Tint 4", cssVar: "var(--mesh-d)" },
];

export function slideAccentVar(id: string | undefined | null): string | null {
  const found = SLIDE_ACCENTS.find((s) => s.id === id);
  return found?.cssVar ?? null;
}

/** A full-bleed gradient built from the chosen accent, or null for default. */
export function slideAccentBg(id: string | undefined | null): string | null {
  const v = slideAccentVar(id);
  if (!v) return null;
  return `radial-gradient(125% 95% at 25% 10%, ${v}, transparent 62%), radial-gradient(90% 90% at 100% 100%, color-mix(in srgb, ${v} 45%, transparent), transparent 60%), var(--mesh-a)`;
}

export type SlideStyles = Record<string, { accent?: SlideAccent }>;

/** Stable storage key for a slide so its style survives reordering. */
export function slideStyleKey(
  kind: string,
  chapterIdx?: number,
): string | null {
  switch (kind) {
    case "intro-welcome": return "welcome";
    case "intro-occasion": return "occasion";
    case "intro-together": return "together";
    case "intro-about": return "about";
    case "intro-ready": return "ready";
    case "intro-final": return "final";
    case "intro-chapter":
      return typeof chapterIdx === "number" ? `chapter-${chapterIdx}` : null;
    default:
      return null; // gallery and message slides aren't styled here
  }
}
