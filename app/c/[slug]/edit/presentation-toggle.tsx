"use client";

import { Clapperboard, BookOpen } from "lucide-react";

type Style = "reel" | "book";

const OPTIONS: { value: Style; label: string; desc: string; icon: typeof BookOpen }[] = [
  { value: "reel", label: "Reel", desc: "Cinematic full-screen slides", icon: Clapperboard },
  { value: "book", label: "Book", desc: "Page-turn slides & a bound page", icon: BookOpen },
];

export function PresentationToggle({
  value,
  onChange,
}: {
  value: Style;
  onChange: (v: Style) => void;
}) {
  return (
    <div className="rounded-3xl2 bg-white shadow-ring p-5 space-y-3">
      <div>
        <p className="font-medium text-ink">Presentation</p>
        <p className="text-xs text-ink/50 mt-0.5">How the slideshow and page look.</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {OPTIONS.map(({ value: v, label, desc, icon: Icon }) => {
          const active = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              aria-pressed={active}
              className={`rounded-2xl border p-3.5 text-left transition ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-ink/12 hover:border-ink/25"
              }`}
            >
              <Icon className={`size-5 ${active ? "text-[var(--accent)]" : "text-ink/45"}`} />
              <p className="text-sm font-medium text-ink mt-2">{label}</p>
              <p className="text-xs text-ink/50 mt-0.5 leading-snug">{desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
