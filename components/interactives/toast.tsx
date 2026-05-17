"use client";

import { useEffect, useState } from "react";
import type { InteractiveProps } from "./types";
import { Revealed } from "./revealed";

export function ToastInteractive({
  body, mediaKind, mediaPath, authorName, onRevealed, surface = "dark",
}: InteractiveProps) {
  const [stage, setStage] = useState<"idle" | "clinked" | "done">("idle");
  const subClass = surface === "dark" ? "text-white/70" : "text-ink/60";

  useEffect(() => {
    if (stage !== "clinked") return;
    const t = setTimeout(() => { setStage("done"); onRevealed?.(); }, 900);
    return () => clearTimeout(t);
  }, [stage, onRevealed]);

  if (stage === "done") {
    return (
      <div className="w-full fade-up px-4">
        <Revealed body={body} mediaKind={mediaKind} mediaPath={mediaPath} authorName={authorName} surface={surface} />
      </div>
    );
  }

  const clinked = stage === "clinked";

  return (
    <div className="w-full flex flex-col items-center px-4 select-none">
      <button onClick={() => { if (stage === "idle") setStage("clinked"); }}
              className="relative w-72 h-56 active:scale-[0.98] transition-transform"
              aria-label="Clink the glasses">
        <Glass side="left" clinked={clinked} />
        <Glass side="right" clinked={clinked} />
        {clinked && (
          <>
            <span className="absolute left-1/2 top-12 -translate-x-1/2 size-8 rounded-full bg-white/80 blur-md"
                  style={{ animation: "clinkFlash 0.5s ease-out forwards" }} />
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="absolute left-1/2 top-16 size-1.5 rounded-full bg-white/80"
                    style={{
                      transform: `translate(-50%, 0) rotate(${i * 30}deg) translateY(-30px)`,
                      animation: `bubblePop 0.8s ease-out ${i * 0.02}s forwards`,
                    }} />
            ))}
          </>
        )}
      </button>
      <p className={`mt-4 text-sm uppercase tracking-[0.3em] ${subClass}`}>
        Tap to clink
      </p>

      <style>{`
        @keyframes clinkFlash {
          0%   { opacity: 0; transform: translate(-50%, 0) scale(0.6); }
          40%  { opacity: 1; transform: translate(-50%, 0) scale(1.4); }
          100% { opacity: 0; transform: translate(-50%, 0) scale(1.6); }
        }
        @keyframes bubblePop {
          0%   { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -50px) rotate(0deg) translateY(-60px); }
        }
      `}</style>
    </div>
  );
}

function Glass({ side, clinked }: { side: "left" | "right"; clinked: boolean }) {
  const isLeft = side === "left";
  const transform = clinked
    ? "translateX(0)"
    : isLeft ? "translateX(-46px) rotate(-12deg)" : "translateX(46px) rotate(12deg)";
  return (
    <div className="absolute top-2 transition-transform duration-500"
         style={{
           left: isLeft ? "30%" : "auto",
           right: isLeft ? "auto" : "30%",
           transform,
         }}>
      {/* Bowl */}
      <svg viewBox="0 0 60 80" width="60" height="80">
        <path d="M10 5 L50 5 L42 38 Q30 60 18 38 Z"
              fill="rgba(255,255,255,0.65)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
        <path d="M30 38 V70" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
        <ellipse cx="30" cy="74" rx="14" ry="3"
                 fill="rgba(255,255,255,0.75)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
        {/* champagne fill */}
        <path d="M14 14 L46 14 L40 36 Q30 52 20 36 Z"
              fill="rgba(232,184,75,0.5)" />
      </svg>
    </div>
  );
}
