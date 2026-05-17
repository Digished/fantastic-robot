"use client";

import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import type { InteractiveProps } from "./types";

export function GiftInteractive({ body, authorName, onRevealed, surface = "dark" }: InteractiveProps) {
  const [opened, setOpened] = useState(false);
  const inkClass = surface === "dark" ? "text-white" : "text-ink";
  const subClass = surface === "dark" ? "text-white/70" : "text-ink/60";

  useEffect(() => { if (opened) onRevealed?.(); }, [opened, onRevealed]);

  return (
    <div className="w-full flex flex-col items-center text-center px-4 select-none">
      {!opened ? (
        <>
          <button
            onClick={() => setOpened(true)}
            aria-label="Unwrap gift"
            className="relative size-56 active:scale-95 transition-transform"
            style={{ animation: "giftShake 2.8s ease-in-out infinite" }}
          >
            <span className="absolute inset-0 rounded-2xl shadow-card"
                  style={{ background: "linear-gradient(160deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 70%, black) 100%)" }} />
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 bg-white/90" />
            <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 bg-white/90" />
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 w-20 h-12 rounded-full bg-white/90 shadow-md" />
            <span className="absolute inset-0 grid place-items-center pointer-events-none">
              <Gift className="size-16 text-white drop-shadow-lg" />
            </span>
          </button>
          <p className={`mt-8 text-sm uppercase tracking-[0.3em] ${subClass}`}>Tap to unwrap</p>
        </>
      ) : (
        <div className="w-full fade-up">
          <Confetti />
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
        @keyframes giftShake {
          0%, 92%, 100% { transform: rotate(0deg); }
          94% { transform: rotate(-6deg); }
          96% { transform: rotate(6deg); }
          98% { transform: rotate(-3deg); }
        }
      `}</style>
    </div>
  );
}

function Confetti() {
  const palette = ["#FBBF24", "#F472B6", "#34D399", "#60A5FA", "#F87171", "#A78BFA"];
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-0">
      {Array.from({ length: 26 }).map((_, i) => {
        const left = (i * 41) % 100;
        const color = palette[i % palette.length];
        const delay = (i % 6) * 0.06;
        const dur = 1.4 + (i % 4) * 0.2;
        return (
          <span key={i}
            className="absolute"
            style={{
              left: `${left}%`, top: 0, width: 8, height: 12, background: color,
              transform: "translateY(-20px)",
              animation: `confettiFall ${dur}s ease-out ${delay}s forwards`,
              borderRadius: 2,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confettiFall {
          0%   { opacity: 1; transform: translateY(-40px) rotate(0deg); }
          100% { opacity: 0; transform: translateY(220px) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
