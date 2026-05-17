"use client";

import { useEffect, useState } from "react";
import type { InteractiveProps } from "./types";
import { Revealed } from "./revealed";

export function LetterInteractive({
  body, mediaKind, mediaPath, authorName, onRevealed, surface = "dark",
}: InteractiveProps) {
  const [opened, setOpened] = useState(false);
  const subClass = surface === "dark" ? "text-white/70" : "text-ink/60";

  useEffect(() => { if (opened) onRevealed?.(); }, [opened, onRevealed]);

  if (opened) {
    return (
      <div className="w-full fade-up px-4">
        <Revealed body={body} mediaKind={mediaKind} mediaPath={mediaPath} authorName={authorName} surface={surface} />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center text-center px-4 select-none">
      <button
        onClick={() => setOpened(true)}
        aria-label="Open letter"
        className="relative w-72 aspect-[4/5] active:scale-[0.98] transition-transform"
      >
        <div className="absolute inset-0 rounded-2xl shadow-card overflow-hidden"
             style={{ background: "linear-gradient(160deg, #FAF3E7 0%, #EFE3CC 100%)" }}>
          <div className="absolute inset-0 origin-top">
            <svg viewBox="0 0 100 60" className="w-full h-auto block">
              <polygon points="0,0 100,0 50,55" fill="#F3E5C7" stroke="#D9C9A6" strokeWidth="0.5" />
            </svg>
          </div>
          <span
            className="absolute left-1/2 -translate-x-1/2 top-[34%] size-14 rounded-full grid place-items-center shadow-md text-white font-bold"
            style={{
              background: "radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--accent) 80%, white), var(--accent))",
              animation: "sealPulse 2.4s ease-in-out infinite",
            }}
          >♥</span>
        </div>
      </button>
      <p className={`mt-6 text-sm uppercase tracking-[0.3em] ${subClass}`}>Tap the seal</p>

      <style>{`
        @keyframes sealPulse {
          0%, 100% { transform: translate(-50%, 0) scale(1); }
          50%      { transform: translate(-50%, 0) scale(1.07); }
        }
      `}</style>
    </div>
  );
}
