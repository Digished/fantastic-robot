"use client";

import { useEffect, useState } from "react";
import { Lock, Cake, Gift, MessageCircle } from "lucide-react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * A self-contained mock of a sealed celebration page used on the landing
 * page. The countdown ticks live so the section feels alive. Target is set
 * on mount to avoid hydration mismatch.
 */
export function SealedPreview() {
  const [target, setTarget] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setTarget(Date.now() + (18 * 86400 + 6 * 3600 + 42 * 60 + 9) * 1000);
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const p = target === null ? null : parts(target - now);
  const units: [string, string][] = [
    [p ? pad(p.d) : "—", "days"],
    [p ? pad(p.h) : "—", "hrs"],
    [p ? pad(p.m) : "—", "min"],
    [p ? pad(p.s) : "—", "sec"],
  ];

  return (
    <div data-theme="dusk" className="relative rounded-3xl2 overflow-hidden shadow-card aspect-[4/5]">
      <div className="absolute inset-0 theme-mesh" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/35 to-black/80" />

      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6 text-white">
        {/* Avatar with a soft pulsing ring */}
        <div className="relative mb-4">
          <span
            className="absolute -inset-3 rounded-full bg-white"
            style={{ animation: "ringPulse 2.6s ease-in-out infinite" }}
            aria-hidden
          />
          <span className="relative size-16 rounded-full bg-white/15 grid place-items-center ring-2 ring-white/40">
            <Cake className="size-7" />
          </span>
        </div>

        <p className="text-[10px] uppercase tracking-[0.3em] text-white/75">Birthday · 14 June</p>
        <p className="serif text-3xl mt-2 leading-[0.95] drop-shadow-sm">Ada turns 25</p>

        {/* Live countdown */}
        <div className="mt-4 flex items-end justify-center gap-3.5">
          {units.map(([value, label]) => (
            <div key={label} className="text-center">
              <p className="serif text-2xl tabular-nums leading-none">{value}</p>
              <p className="text-[8px] uppercase tracking-[0.22em] text-white/55 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Sealed pill */}
        <p className="mt-4 inline-flex items-center gap-1.5 glass-dark rounded-full px-3.5 py-1.5 text-xs text-white/85">
          <Lock className="size-3.5" /> Sealed until the day
        </p>

        {/* Wishlist mini */}
        <div className="mt-3 w-full max-w-[220px] glass-dark rounded-2xl p-3 text-left">
          <p className="text-[8px] uppercase tracking-[0.2em] text-white/55 inline-flex items-center gap-1 mb-1.5">
            <Gift className="size-3" /> Ada&apos;s wishlist
          </p>
          <div className="flex flex-wrap gap-1.5">
            {["Pottery class", "Travel fund", "Good coffee"].map((w) => (
              <span key={w} className="text-[10px] text-white/90 bg-white/10 rounded-full px-2 py-0.5">
                {w}
              </span>
            ))}
          </div>
        </div>

        {/* Actions — same pairing as the live page */}
        <div className="mt-3 flex gap-2 w-full max-w-[240px]">
          <span className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--accent)] text-white text-[11px] font-medium py-2.5 shadow-glow">
            <MessageCircle className="size-3.5" /> Message
          </span>
          <span className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-white/90 text-ink text-[11px] font-medium py-2.5">
            <Gift className="size-3.5" /> Send a gift
          </span>
        </div>
      </div>

      {/* Floating gift pill — desktop only, where there's room below the column */}
      <div
        className="hidden md:block absolute left-4 bottom-4 bg-white rounded-2xl shadow-card px-3.5 py-2.5"
        style={{ animation: "floatY 7s ease-in-out infinite 1s" }}
      >
        <p className="text-[8px] uppercase tracking-[0.24em] text-ink/40">Waiting</p>
        <p className="serif text-lg leading-none mt-0.5" style={{ color: "var(--accent)" }}>12 · 8</p>
        <p className="text-[9px] text-ink/40 mt-0.5">messages · gifts</p>
      </div>
    </div>
  );
}
