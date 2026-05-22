"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Gift, Pencil } from "lucide-react";
import { formatDate } from "@/lib/time";
import { Sparkles } from "@/components/sparkles";
import { ShareBar } from "./share-bar";
import { NavLoadingLink } from "@/components/nav-loading-link";

function diffParts(target: number, now: number) {
  const ms = Math.max(0, target - now);
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins: Math.floor((s % 3600) / 60),
    secs: s % 60,
  };
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="serif text-4xl md:text-5xl text-white tabular-nums leading-none">
        {String(value).padStart(2, "0")}
      </p>
      <p className="text-[10px] uppercase tracking-[0.25em] text-white/60 mt-1.5">{label}</p>
    </div>
  );
}

export function SealedCountdown({
  slug,
  title,
  recipientName,
  eventLabel,
  celebrationDate,
  avatarUrl,
  createdBy,
  isCreator,
  canMessage,
  canContribute,
  theme,
}: {
  slug: string;
  title: string;
  recipientName: string;
  eventLabel: string;
  celebrationDate: string;
  avatarUrl: string | null;
  createdBy: string | null;
  isCreator: boolean;
  canMessage: boolean;
  canContribute: boolean;
  theme: string;
}) {
  const target = new Date(celebrationDate).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const t = diffParts(target, now);
  const firstName = recipientName.split(" ")[0];

  return (
    <main data-theme={theme} className="relative min-h-[100dvh] overflow-hidden theme-mesh flex flex-col">
      <Sparkles count={8} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/25 to-black/70" aria-hidden />

      {/* Header */}
      <header className="relative z-10 px-5 pt-5 flex items-center justify-between">
        <Link href={isCreator ? "/dashboard" : "/"} className="serif text-lg text-white drop-shadow">
          Spendbox
        </Link>
        {isCreator && (
          <Link href={`/c/${slug}/edit`} className="glass-dark rounded-full px-3 py-1.5 text-xs text-white inline-flex items-center gap-1.5">
            <Pencil className="size-3.5" /> Edit
          </Link>
        )}
      </header>

      {/* Center */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="size-24 rounded-full object-cover ring-2 ring-white/40 shadow-card mb-6" />
        ) : (
          <div className="size-24 rounded-full bg-white/15 grid place-items-center mb-6">
            <Gift className="size-9 text-white" />
          </div>
        )}

        <p className="fade-up text-[11px] uppercase tracking-[0.3em] text-white/75">
          {eventLabel ? `${eventLabel} · ` : ""}{formatDate(celebrationDate)}
        </p>
        <h1 className="fade-up serif text-white mt-3 leading-[0.95] drop-shadow-sm" style={{ fontSize: "clamp(2.4rem,10vw,4rem)" }}>
          {title}
        </h1>

        <div className="fade-up mt-8 flex items-end justify-center gap-4 md:gap-7">
          <Unit value={t.days} label="days" />
          <Unit value={t.hours} label="hrs" />
          <Unit value={t.mins} label="min" />
          <Unit value={t.secs} label="sec" />
        </div>

        <p className="fade-up mt-8 text-white/80 text-sm inline-flex items-center gap-2 glass-dark rounded-full px-4 py-2">
          <Lock className="size-4" />
          {isCreator
            ? "Your surprises are sealed until the day"
            : `Sealed until ${firstName}'s day`}
        </p>

        {/* CTAs */}
        {(canMessage || canContribute) && (
          <div className="fade-up mt-7 flex gap-3 w-full max-w-sm">
            {canMessage && (
              <NavLoadingLink
                href={`/c/${slug}/post`}
                className={`btn-accent ${canContribute ? "flex-1" : "w-full"} shadow-glow inline-flex items-center justify-center`}
                loadingText="Opening…"
              >
                Leave a message
              </NavLoadingLink>
            )}
            {canContribute && (
              <NavLoadingLink
                href={`/c/${slug}/contribute`}
                className={`${canMessage ? "flex-1" : "w-full"} inline-flex items-center justify-center rounded-full bg-white/90 text-ink py-3 px-5 font-medium`}
                loadingText="Opening…"
              >
                Send a gift
              </NavLoadingLink>
            )}
          </div>
        )}

        <div className="fade-up mt-5 w-full max-w-sm">
          <ShareBar slug={slug} title={title} recipient={recipientName} />
        </div>
      </div>

      {createdBy && (
        <p className="relative z-10 pb-6 text-center text-[11px] text-white/55">
          Put together by <span className="text-white/80">{createdBy}</span>
        </p>
      )}
    </main>
  );
}
