"use client";

import { THEMES, type Theme } from "@/lib/themes";

export function ThemePicker({
  name = "theme",
  value,
  onChange,
}: {
  name?: string;
  value: Theme;
  onChange: (v: Theme) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="label">Theme</p>
      <input type="hidden" name={name} value={value} />
      <div className="grid grid-cols-3 gap-2">
        {THEMES.map((t) => {
          const selected = t.id === value;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={`group relative overflow-hidden rounded-2xl p-3 text-left transition ${
                selected ? "ring-2 ring-ink/80" : "ring-1 ring-ink/10"
              }`}
              style={{ background: t.swatch }}
            >
              <span className="block aspect-[5/4] w-full" />
              <span
                className={`absolute bottom-2 left-2 right-2 text-[11px] uppercase tracking-widest rounded-full px-2 py-1 backdrop-blur ${
                  t.id === "midnight" ? "bg-white/15 text-white" : "bg-white/70 text-ink"
                }`}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
