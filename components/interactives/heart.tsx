"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import type { InteractiveProps } from "./types";
import { Revealed } from "./revealed";

type Burst = { id: number; x: number; y: number };

export function HeartInteractive({
  body, mediaKind, mediaPath, authorName, onRevealed, surface = "dark",
}: InteractiveProps) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const idRef = useRef(0);
  const subClass = surface === "dark" ? "text-white/70" : "text-ink/60";

  useEffect(() => {
    if (count >= 3 && !done) {
      setDone(true);
      onRevealed?.();
    }
  }, [count, done, onRevealed]);

  function spawn(e: React.PointerEvent) {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = ++idRef.current;
    setBursts((b) => [...b, { id, x, y }]);
    setCount((c) => c + 1);
    setTimeout(() => setBursts((b) => b.filter((it) => it.id !== id)), 1300);
  }

  return (
    <div
      onPointerDown={spawn}
      className="relative w-full min-h-[60vh] flex flex-col items-center justify-center text-center px-4 select-none overflow-hidden"
    >
      <Revealed body={body} mediaKind={mediaKind} mediaPath={mediaPath} authorName={authorName} surface={surface} />
      <p className={`mt-6 text-sm uppercase tracking-[0.3em] ${subClass}`}>
        Tap anywhere — send love back ({count})
      </p>

      {bursts.map((b) => (
        <Heart key={b.id}
          className="pointer-events-none absolute size-8 text-[var(--accent)] fill-current"
          style={{
            left: b.x - 16, top: b.y - 16,
            animation: "heartFloat 1.2s ease-out forwards",
            filter: "drop-shadow(0 0 12px rgba(190, 24, 93, 0.45))",
          }} />
      ))}

      <style>{`
        @keyframes heartFloat {
          0%   { opacity: 1; transform: translateY(0)    scale(0.6) rotate(-8deg); }
          30%  { opacity: 1; transform: translateY(-10px) scale(1.1) rotate(0deg); }
          100% { opacity: 0; transform: translateY(-160px) scale(0.9) rotate(12deg); }
        }
      `}</style>
    </div>
  );
}
