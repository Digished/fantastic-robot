"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Palette, X } from "lucide-react";
import { THEMES, type Theme } from "@/lib/themes";

/**
 * Compact theme control: a single pill that shows the current theme and
 * opens a popup grid. Replaces the always-on swatch row so the editor
 * toolbar stays slim.
 */
export function ThemePickerButton({
  value,
  onChange,
}: {
  value: Theme;
  onChange: (v: Theme) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = THEMES.find((t) => t.id === value) ?? THEMES[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        data-no-loading="true"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2.5 rounded-2xl border border-ink/15 bg-white px-3 py-2.5 hover:border-ink/30 transition text-left"
      >
        <span
          className="size-7 shrink-0 rounded-full ring-1 ring-ink/10"
          style={{ background: selected.swatch }}
          aria-hidden
        />
        <span className="min-w-0">
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-ink/45 leading-none">
            <Palette className="size-3" /> Theme
          </span>
          <span className="block text-sm font-medium text-ink leading-tight mt-0.5">
            {selected.label}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-ink/30" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/50 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full sm:max-w-md bg-[#FDFCFB] rounded-t-[28px] sm:rounded-[28px] shadow-2xl flex flex-col max-h-[80vh] sm:max-h-[70vh]">
            <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
              <div className="w-10 h-1 rounded-full bg-ink/15" />
            </div>
            <div className="flex items-center justify-between px-5 pt-4 pb-3.5 shrink-0">
              <div>
                <p className="font-semibold text-ink text-[15px]">Theme</p>
                <p className="text-xs text-ink/40 mt-0.5">Sets the colour palette across the page</p>
              </div>
              <button
                type="button"
                data-no-loading="true"
                onClick={() => setOpen(false)}
                className="grid size-7 place-items-center rounded-full bg-ink/8 text-ink/50 hover:bg-ink/14 transition"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="h-px bg-ink/8 mx-5 shrink-0" />

            <div className="overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {THEMES.map((t) => {
                  const isSel = t.id === value;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      data-no-loading="true"
                      onClick={() => { onChange(t.id); setOpen(false); }}
                      className="flex flex-col items-center gap-1.5"
                      aria-pressed={isSel}
                    >
                      <span
                        className={`relative aspect-square w-full rounded-2xl transition ${
                          isSel
                            ? "ring-2 ring-ink ring-offset-2 ring-offset-[#FDFCFB]"
                            : "ring-1 ring-ink/10 hover:ring-ink/30"
                        }`}
                        style={{ background: t.swatch }}
                      >
                        {isSel && (
                          <span className="absolute inset-0 grid place-items-center">
                            <Check className="size-5 text-white drop-shadow" />
                          </span>
                        )}
                      </span>
                      <span className={`text-xs ${isSel ? "text-ink font-medium" : "text-ink/55"}`}>
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-safe-b sm:hidden shrink-0" />
          </div>
        </div>
      )}
    </>
  );
}
