"use client";

import { useEffect, useState } from "react";
import type { InteractiveProps } from "./types";

export function LetterInteractive({ body, authorName, onRevealed, surface = "dark" }: InteractiveProps) {
  const [opened, setOpened] = useState(false);
  const subClass = surface === "dark" ? "text-white/70" : "text-ink/60";

  useEffect(() => { if (opened) onRevealed?.(); }, [opened, onRevealed]);

  return (
    <div className="w-full flex flex-col items-center text-center px-4 select-none">
      <button
        onClick={() => setOpened(true)}
        aria-label="Open letter"
        disabled={opened}
        className="relative w-72 aspect-[4/5] active:scale-[0.98] transition-transform"
      >
        {/* Envelope back */}
        <div className="absolute inset-0 rounded-2xl shadow-card overflow-hidden"
             style={{ background: "linear-gradient(160deg, #FAF3E7 0%, #EFE3CC 100%)" }}>
          {/* Letter inside, unfolds when opened */}
          <div
            className="absolute inset-3 bg-white rounded-lg shadow-soft p-5 origin-top transition-transform duration-700"
            style={{
              transform: opened ? "translateY(0) scale(1)" : "translateY(40%) scale(0.9)",
              opacity: opened ? 1 : 0.0,
            }}
          >
            {body && (
              <p className="serif text-ink text-lg leading-snug whitespace-pre-wrap text-left"
                 style={{ fontStyle: "italic" }}>{body}</p>
            )}
            <p className="mt-6 text-[10px] uppercase tracking-widest text-ink/55 text-right">— {authorName}</p>
          </div>

          {/* Envelope flap */}
          <div
            className="absolute inset-x-0 top-0 origin-top transition-transform duration-700"
            style={{
              transform: opened ? "rotateX(180deg)" : "rotateX(0deg)",
              backfaceVisibility: "hidden",
            }}
          >
            <svg viewBox="0 0 100 60" className="w-full h-auto block">
              <polygon points="0,0 100,0 50,55" fill="#F3E5C7" stroke="#D9C9A6" strokeWidth="0.5" />
            </svg>
          </div>

          {/* Wax seal */}
          {!opened && (
            <span
              className="absolute left-1/2 -translate-x-1/2 top-[34%] size-12 rounded-full grid place-items-center shadow-md"
              style={{
                background: "radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--accent) 80%, white), var(--accent))",
                color: "white",
                fontWeight: 700,
                animation: "sealPulse 2.4s ease-in-out infinite",
              }}
            >
              ♥
            </span>
          )}
        </div>
      </button>

      {!opened && (
        <p className={`mt-6 text-sm uppercase tracking-[0.3em] ${subClass}`}>Tap the seal</p>
      )}

      <style>{`
        @keyframes sealPulse {
          0%, 100% { transform: translate(-50%, 0) scale(1); }
          50%      { transform: translate(-50%, 0) scale(1.07); }
        }
      `}</style>
    </div>
  );
}
