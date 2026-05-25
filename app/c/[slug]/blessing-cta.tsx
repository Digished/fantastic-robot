"use client";

import Link from "next/link";
import { Gift, ArrowRight, Check } from "lucide-react";
import type { BlessingEntryStatus } from "@/lib/blessings/labels";

// The creator's entry into 52 Weeks of Blessings. Before it's bought this is a
// loud, premium, gently-bouncing CTA that makes clear it's a one-time gift;
// once bought it settles into a calm "gifted" state. Works on both the light
// revealed page and the dark sealed countdown.
export function BlessingCta({
  slug,
  status,
  surface = "light",
}: {
  slug: string;
  status: BlessingEntryStatus;
  surface?: "light" | "dark";
}) {
  const href = `/blessings/new/${slug}`;
  const gifted = status === "active" || status === "completed";

  if (!gifted) {
    return (
      <div className="blessing-cta-bounce w-full">
        <Link
          href={href}
          className="group relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl px-5 py-4 text-white shadow-[0_16px_38px_-10px_var(--accent-glow)] ring-1 ring-white/15 transition-transform active:scale-[0.98]"
          style={{
            background:
              "linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 60%, #150d05) 100%)",
          }}
        >
          <span className="blessing-cta-shimmer" aria-hidden />
          <span className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <Gift className="size-5" />
          </span>
          <span className="relative min-w-0 flex-1">
            <span className="block text-[15px] font-semibold leading-tight">
              Gift 52 Weeks of Blessings
            </span>
            <span className="mt-0.5 block text-[12px] leading-snug text-white/80">
              A one-time gift for this celebration — buy it once.
            </span>
          </span>
          <ArrowRight className="relative size-5 shrink-0 text-white/90 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <style>{`
          .blessing-cta-bounce { animation: blessingNudge 4.2s ease-in-out infinite; }
          @keyframes blessingNudge {
            0%, 66%, 100% { transform: translateY(0); }
            74% { transform: translateY(-7px); }
            81% { transform: translateY(0); }
            87% { transform: translateY(-3px); }
            93% { transform: translateY(0); }
          }
          .blessing-cta-shimmer {
            position: absolute; inset: 0; pointer-events: none;
            background: linear-gradient(110deg, transparent 32%, rgba(255,255,255,.30) 50%, transparent 68%);
            transform: translateX(-120%);
            animation: blessingShimmer 4.2s ease-in-out infinite;
          }
          @keyframes blessingShimmer {
            0%, 52% { transform: translateX(-120%); }
            74%     { transform: translateX(120%); }
            100%    { transform: translateX(120%); }
          }
          @media (prefers-reduced-motion: reduce) {
            .blessing-cta-bounce { animation: none; }
            .blessing-cta-shimmer { display: none; }
          }
        `}</style>
      </div>
    );
  }

  const sub =
    status === "completed"
      ? "Gifted — all 52 weeks complete"
      : "Gifted — a blessing emails every week";

  const dark = surface === "dark";
  return (
    <Link
      href={href}
      className={`flex w-full items-center gap-3 rounded-2xl px-5 py-3.5 transition ${
        dark
          ? "glass-dark text-white hover:bg-white/10"
          : "border border-[var(--accent)]/25 bg-[var(--accent-soft)] text-ink hover:border-[var(--accent)]/40"
      }`}
    >
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-lg ${
          dark ? "bg-white/15" : "bg-white"
        }`}
      >
        <Gift className={`size-4 ${dark ? "text-white" : "text-[var(--accent)]"}`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-tight">52 Weeks of Blessings</span>
        <span className={`mt-0.5 block text-xs ${dark ? "text-white/65" : "text-ink/55"}`}>{sub}</span>
      </span>
      <Check className={`size-4 shrink-0 ${dark ? "text-white/80" : "text-[var(--accent)]"}`} />
    </Link>
  );
}
