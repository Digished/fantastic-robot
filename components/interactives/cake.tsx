"use client";

import { useEffect, useState } from "react";
import type { InteractiveProps } from "./types";

export function CakeInteractive({ body, payload, authorName, onRevealed, surface = "dark" }: InteractiveProps) {
  const requested = Math.max(1, Math.min(12, Number(payload?.candles ?? 5)));
  const [lit, setLit] = useState<boolean[]>(() => Array.from({ length: requested }, () => true));
  const allOut = lit.every((x) => !x);
  const inkClass = surface === "dark" ? "text-white" : "text-ink";
  const subClass = surface === "dark" ? "text-white/70" : "text-ink/60";

  useEffect(() => { if (allOut) onRevealed?.(); }, [allOut, onRevealed]);

  function extinguish(i: number) {
    setLit((prev) => prev.map((v, idx) => (idx === i ? false : v)));
  }

  return (
    <div className="w-full flex flex-col items-center text-center px-4 select-none">
      {!allOut && (
        <>
          {/* Candles row */}
          <div className="relative w-72 flex justify-center items-end gap-2 mb-1 z-10">
            {lit.map((on, i) => (
              <button key={i} onClick={() => extinguish(i)} aria-label={`Blow out candle ${i + 1}`}
                      className="flex flex-col items-center active:scale-95 transition-transform">
                {on ? (
                  <span className="block size-3 rounded-full mb-0.5"
                        style={{
                          background: "radial-gradient(circle at 50% 30%, #FFF0B3 0%, #FFB627 55%, #E25822 100%)",
                          boxShadow: "0 0 12px 2px rgba(255,170,40,0.7)",
                          animation: "flameFlicker 0.6s ease-in-out infinite alternate",
                        }}
                  />
                ) : (
                  <span className="block size-1.5 rounded-full mb-1 bg-white/40" />
                )}
                <span className="block w-1.5 h-7 rounded-sm"
                      style={{ background: i % 2 ? "#F472B6" : "#FBBF24" }} />
              </button>
            ))}
          </div>

          {/* Cake body */}
          <div className="w-72 rounded-t-2xl shadow-card"
               style={{ background: "linear-gradient(180deg, #FFF7ED 0%, #FED7AA 100%)", height: 28 }} />
          <div className="w-72 shadow-card"
               style={{ background: "linear-gradient(180deg, #D97706 0%, #B45309 100%)", height: 64 }} />
          <div className="w-72 rounded-b-2xl shadow-card"
               style={{ background: "linear-gradient(180deg, #92400E 0%, #78350F 100%)", height: 36 }} />

          <p className={`mt-8 text-sm uppercase tracking-[0.3em] ${subClass}`}>
            Tap each candle ({lit.filter(Boolean).length} left)
          </p>
        </>
      )}

      {allOut && (
        <div className="w-full fade-up">
          <p className={`text-[11px] uppercase tracking-[0.35em] mb-4 ${subClass}`}>Your wish</p>
          {body && (
            <p className={`serif whitespace-pre-wrap ${inkClass} ${
              body.length < 80 ? "text-4xl leading-tight" : "text-2xl leading-snug"
            }`}>{body}</p>
          )}
          <p className={`mt-8 text-[11px] uppercase tracking-[0.3em] ${subClass}`}>
            — {authorName}
          </p>
        </div>
      )}

      <style>{`
        @keyframes flameFlicker {
          0%   { transform: scale(1)    translateY(0); }
          100% { transform: scale(1.15) translateY(-2px); }
        }
      `}</style>
    </div>
  );
}
