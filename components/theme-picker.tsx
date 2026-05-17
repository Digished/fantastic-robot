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
  const selected = THEMES.find((t) => t.id === value);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="label">Theme</p>
        {selected && <p className="text-xs text-ink/50">{selected.label}</p>}
      </div>
      <input type="hidden" name={name} value={value} />
      <div className="grid grid-cols-8 gap-2">
        {THEMES.map((t) => {
          const isSel = t.id === value;
          return (
            <button
              key={t.id}
              type="button"
              data-no-loading="true"
              onClick={() => onChange(t.id)}
              title={t.label}
              aria-label={t.label}
              aria-pressed={isSel}
              className={`aspect-square rounded-full transition ${
                isSel
                  ? "ring-2 ring-ink ring-offset-2 ring-offset-white scale-105"
                  : "ring-1 ring-ink/10 hover:ring-ink/30"
              }`}
              style={{ background: t.swatch }}
            />
          );
        })}
      </div>
    </div>
  );
}
