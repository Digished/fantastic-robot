"use client";

import { useEffect, useMemo, useState } from "react";
import type { InteractiveProps } from "./types";
import { Revealed } from "./revealed";

const COLORS = ["#F472B6", "#FBBF24", "#34D399", "#60A5FA", "#F87171", "#A78BFA", "#FB923C"];

export function BalloonsInteractive({
  body, mediaKind, mediaPath, authorName, onRevealed, surface = "dark",
}: InteractiveProps) {
  const balloons = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: 8 + (i * 17) % 84,
      y: 10 + ((i * 23) % 35),
      color: COLORS[i % COLORS.length],
      delay: (i % 4) * 0.4,
    })),
    [],
  );
  const [popped, setPopped] = useState<Set<number>>(new Set());
  const allPopped = popped.size >= balloons.length;
  const subClass = surface === "dark" ? "text-white/70" : "text-ink/60";

  useEffect(() => { if (allPopped) onRevealed?.(); }, [allPopped, onRevealed]);

  if (allPopped) {
    return (
      <div className="w-full fade-up px-4">
        <Revealed body={body} mediaKind={mediaKind} mediaPath={mediaPath} authorName={authorName} surface={surface} />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center px-4 select-none">
      <div className="relative w-full max-w-sm aspect-[3/4]">
        {balloons.map((b) => popped.has(b.id) ? null : (
          <button
            key={b.id}
            onClick={() => setPopped((p) => new Set(p).add(b.id))}
            className="absolute active:scale-90 transition-transform"
            style={{
              left: `${b.x}%`, top: `${b.y}%`,
              animation: `balloonFloat 4s ease-in-out ${b.delay}s infinite alternate`,
            }}
            aria-label="Pop balloon"
          >
            <span className="block size-14 rounded-full shadow-md relative"
                  style={{ background: `radial-gradient(circle at 30% 30%, color-mix(in srgb, ${b.color} 70%, white), ${b.color})` }}>
              <span className="absolute left-1/2 -translate-x-1/2 -bottom-1 size-2 rotate-45"
                    style={{ background: b.color }} />
            </span>
            <span className="block mx-auto w-px h-14 bg-white/40" />
          </button>
        ))}
      </div>
      <p className={`mt-4 text-sm uppercase tracking-[0.3em] ${subClass}`}>
        Pop them all ({balloons.length - popped.size} left)
      </p>

      <style>{`
        @keyframes balloonFloat {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-14px); }
        }
      `}</style>
    </div>
  );
}
