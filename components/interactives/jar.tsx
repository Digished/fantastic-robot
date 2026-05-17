"use client";

import { useEffect, useMemo, useState } from "react";
import type { InteractiveProps } from "./types";
import { Revealed } from "./revealed";

const NOTE_COLORS = ["#FEF3C7", "#FBCFE8", "#DBEAFE", "#DCFCE7", "#FDE68A", "#FECACA"];

export function JarInteractive({
  body, mediaKind, mediaPath, authorName, onRevealed, surface = "dark",
}: InteractiveProps) {
  const notes = useMemo(
    () => Array.from({ length: 5 }, (_, i) => ({
      id: i,
      rot: (i * 53) % 30 - 15,
      color: NOTE_COLORS[i % NOTE_COLORS.length],
    })),
    [],
  );
  const [pulled, setPulled] = useState(0);
  const subClass = surface === "dark" ? "text-white/70" : "text-ink/60";
  const allPulled = pulled >= notes.length;

  useEffect(() => { if (allPulled) onRevealed?.(); }, [allPulled, onRevealed]);

  function pull() { setPulled((n) => Math.min(notes.length, n + 1)); }

  if (allPulled) {
    return (
      <div className="w-full fade-up px-4">
        <Revealed body={body} mediaKind={mediaKind} mediaPath={mediaPath} authorName={authorName} surface={surface} />
      </div>
    );
  }

  const remaining = notes.slice(pulled);

  return (
    <div className="w-full flex flex-col items-center px-4 select-none">
      <button
        onClick={pull}
        className="relative w-60 h-72 active:scale-[0.98] transition-transform"
        aria-label="Pull a note from the jar"
      >
        {/* Jar */}
        <div className="absolute inset-x-4 top-6 bottom-0 rounded-b-[36px] rounded-t-2xl border-2 border-white/60"
             style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)" }} />
        {/* Jar lid */}
        <div className="absolute left-2 right-2 top-0 h-8 rounded-full"
             style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--accent) 80%, white), var(--accent))" }} />
        {/* Notes inside */}
        <div className="absolute inset-x-6 top-14 bottom-4 flex flex-wrap items-end gap-1 justify-center">
          {remaining.map((n) => (
            <span key={n.id} className="block w-6 h-8 rounded-sm shadow"
                  style={{ background: n.color, transform: `rotate(${n.rot}deg)` }} />
          ))}
        </div>
      </button>

      {pulled > 0 && pulled < notes.length && (
        <p className={`mt-4 text-sm uppercase tracking-[0.3em] ${subClass}`}>
          {notes.length - pulled} more in the jar
        </p>
      )}
      {pulled === 0 && (
        <p className={`mt-4 text-sm uppercase tracking-[0.3em] ${subClass}`}>Tap the jar</p>
      )}
    </div>
  );
}
