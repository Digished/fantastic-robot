"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Lock, Gift, Pencil, ExternalLink, MessageCircle, Eye } from "lucide-react";
import { formatDate } from "@/lib/time";
import { Sparkles } from "@/components/sparkles";
import { ShareBar } from "./share-bar";
import { NavLoadingLink } from "@/components/nav-loading-link";
import type { BlessingEntryStatus } from "@/lib/blessings/labels";
import { BlessingCta } from "./blessing-cta";
import { supabaseBrowser } from "@/lib/supabase/client";

type WishlistItem = { title: string; url?: string };

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

// Inline confetti burst — extracted from components/interactives/gift.tsx pattern
function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;
  const palette = ["#FBBF24", "#F472B6", "#34D399", "#60A5FA", "#F87171", "#A78BFA"];
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-0 z-20">
      {Array.from({ length: 26 }).map((_, i) => {
        const left = (i * 41) % 100;
        const color = palette[i % palette.length];
        const delay = (i % 6) * 0.06;
        const dur = 1.4 + (i % 4) * 0.2;
        return (
          <span
            key={i}
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
    </div>
  );
}

// Floating toast for realtime activity
function ActivityToast({ name }: { name: string }) {
  return (
    <div
      className="fixed bottom-6 right-4 z-50 glass-dark rounded-full px-4 py-2.5 text-sm text-white shadow-card"
      style={{ animation: "riseFade 3.6s ease-in-out forwards" }}
    >
      ✨ {name} just left a surprise
    </div>
  );
}

// Blurred polaroid wall teaser
function BlurredWallTeaser({ count, slug, firstName }: { count: number; slug: string; firstName: string }) {
  const ROTS = ["polaroid--a", "polaroid--b", "polaroid--c", "polaroid--d", "polaroid--e"];
  const shown = Math.min(count, 10);

  return (
    <div className="fade-up w-full max-w-sm mt-6">
      {count > 0 ? (
        <div className="relative rounded-2xl overflow-hidden">
          <div
            className="grid grid-cols-2 gap-2.5 p-3"
            style={{ filter: "blur(5px)", opacity: 0.55, pointerEvents: "none", userSelect: "none" }}
          >
            {Array.from({ length: shown }).map((_, i) => (
              <div
                key={i}
                className={`polaroid ${ROTS[i % ROTS.length]} w-full`}
                style={{ transform: `rotate(var(--rot, 0deg))` }}
              >
                <div className="w-full aspect-[3/2] rounded-md bg-white/30" />
                <div className="mt-2 h-1.5 bg-white/20 rounded-full w-3/4" />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <p className="text-white font-medium text-sm drop-shadow-md">
              Be one of the {count} {count === 1 ? "person" : "people"} on this wall
            </p>
            <NavLoadingLink
              href={`/c/${slug}/post`}
              className="mt-3 btn-accent shadow-glow text-sm inline-flex items-center justify-center"
              loadingText="Opening…"
            >
              Leave a message →
            </NavLoadingLink>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-white/65 text-sm">No surprises yet.</p>
          <NavLoadingLink
            href={`/c/${slug}/post`}
            className="mt-2 btn-accent shadow-glow text-sm inline-flex items-center justify-center"
            loadingText="Opening…"
          >
            Start the wall for {firstName} →
          </NavLoadingLink>
        </div>
      )}
    </div>
  );
}

export function SealedCountdown({
  slug,
  title,
  recipientName,
  eventLabel,
  celebrationDate,
  celebrationId,
  avatarUrl,
  createdBy,
  isCreator,
  canMessage,
  canContribute,
  theme,
  wishlist,
  ownerStats,
  blessingStatus,
  messageFromCreator,
  initialMessageCount,
  initialGiftCount,
  contributorFirstNames,
}: {
  slug: string;
  title: string;
  recipientName: string;
  eventLabel: string;
  celebrationDate: string;
  celebrationId: string;
  avatarUrl: string | null;
  createdBy: string | null;
  isCreator: boolean;
  canMessage: boolean;
  canContribute: boolean;
  theme: string;
  wishlist: WishlistItem[];
  ownerStats: { messageCount: number; giftCount: number } | null;
  blessingStatus?: BlessingEntryStatus;
  messageFromCreator?: string | null;
  initialMessageCount: number;
  initialGiftCount: number;
  contributorFirstNames: string[];
}) {
  const target = new Date(celebrationDate).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const t = diffParts(target, now);
  const firstName = recipientName.split(" ")[0];
  const daysLeft = t.days;

  // Lock confetti state
  const [confettiActive, setConfettiActive] = useState(false);
  const [lockToast, setLockToast] = useState(false);
  const confettiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleLockTap() {
    setConfettiActive(false);
    if (confettiTimer.current) clearTimeout(confettiTimer.current);
    // Small delay to allow re-render before re-triggering
    requestAnimationFrame(() => {
      setConfettiActive(true);
      setLockToast(true);
    });
    confettiTimer.current = setTimeout(() => {
      setConfettiActive(false);
      setLockToast(false);
    }, 2000);
  }

  // Live social proof counts
  const [messageCount, setMessageCount] = useState(initialMessageCount);
  const [giftCount, setGiftCount] = useState(initialGiftCount);

  // Activity toast (realtime new message)
  const [activityToast, setActivityToast] = useState<string | null>(null);
  const activityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sb = supabaseBrowser();
    const channel = sb
      .channel(`sealed:${celebrationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `celebration_id=eq.${celebrationId}` },
        (payload) => {
          setMessageCount((c) => c + 1);
          // Show a toast with the contributor's first name (may be anonymous)
          const row = payload.new as { contributor_name?: string; is_anonymous?: boolean };
          const toastName = row.is_anonymous ? "Someone" : (row.contributor_name?.split(" ")[0] ?? "Someone");
          setActivityToast(toastName);
          if (activityTimer.current) clearTimeout(activityTimer.current);
          activityTimer.current = setTimeout(() => setActivityToast(null), 3800);
        },
      )
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [celebrationId]);

  // Milestone progress bar
  const totalSurprises = messageCount + giftCount;
  const MILESTONES = [5, 10, 15, 20, 30, 50, 75, 100];
  const milestone = MILESTONES.find((m) => m > totalSurprises) ?? MILESTONES[MILESTONES.length - 1];
  const milestoneProgress = Math.min((totalSurprises / milestone) * 100, 100);

  return (
    <main data-theme={theme} className="relative min-h-[100dvh] overflow-x-hidden theme-mesh flex flex-col">
      <Sparkles count={8} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/75" aria-hidden />

      {/* Realtime activity toast */}
      {activityToast && <ActivityToast key={activityToast + Date.now()} name={activityToast} />}

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

      {/* Center column */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="size-20 md:size-24 rounded-full object-cover ring-2 ring-white/40 shadow-card mb-5" />
        ) : (
          <div className="size-20 md:size-24 rounded-full bg-white/15 grid place-items-center mb-5">
            <Gift className="size-9 text-white" />
          </div>
        )}

        <p className="fade-up text-[11px] uppercase tracking-[0.3em] text-white/75">
          {eventLabel ? `${eventLabel} · ` : ""}{formatDate(celebrationDate)}
        </p>
        <h1 className="fade-up serif text-white mt-3 leading-[0.95] drop-shadow-sm" style={{ fontSize: "clamp(2.2rem,9vw,3.75rem)" }}>
          {title}
        </h1>

        <div className="fade-up mt-7 flex items-end justify-center gap-4 md:gap-7">
          <Unit value={t.days} label="days" />
          <Unit value={t.hours} label="hrs" />
          <Unit value={t.mins} label="min" />
          <Unit value={t.secs} label="sec" />
        </div>

        {/* Tappable lock badge with confetti */}
        <div className="relative mt-6">
          <ConfettiBurst active={confettiActive} />
          <button
            onClick={handleLockTap}
            className="fade-up text-white/80 text-sm inline-flex items-center gap-2 glass-dark rounded-full px-4 py-2 active:scale-110 transition-transform duration-150"
            aria-label="Tap the lock"
          >
            <Lock className="size-4" />
            {isCreator ? "Your surprises are sealed until the day" : `Sealed until ${firstName}'s day`}
          </button>
          {lockToast && (
            <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-white/80 text-xs pop-in">
              Nice try! Still sealed tight 🔒
            </p>
          )}
        </div>

        {/* Creator hype message */}
        {messageFromCreator && (
          <div className="fade-up mt-6 glass-dark rounded-2xl px-4 py-3 max-w-sm text-white/85 text-sm italic text-center">
            &ldquo;{messageFromCreator}&rdquo;
          </div>
        )}

        {/* Public social proof ticker (everyone sees message count) */}
        {messageCount > 0 && (
          <p className="fade-up mt-4 text-white/70 text-sm inline-flex items-center gap-2">
            <MessageCircle className="size-4" />
            {messageCount} {messageCount === 1 ? "person has" : "people have"} left {firstName} a surprise ✨
          </p>
        )}

        {/* Milestone progress bar (once there's at least 1 surprise) */}
        {totalSurprises > 0 && (
          <div className="fade-up mt-3 w-full max-w-xs">
            <div className="h-[3px] rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full rounded-full shimmer-text"
                style={{
                  width: `${milestoneProgress}%`,
                  background: "var(--accent)",
                  transition: "width 0.8s ease",
                }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-white/45 text-center">
              {totalSurprises} sealed · {Math.max(milestone - totalSurprises, 0)} more to reach {milestone}
            </p>
          </div>
        )}

        {/* Owner-only: a private peek at the counts (never the content). */}
        {isCreator && ownerStats && (
          <div className="fade-up mt-3 flex items-center gap-4 glass-dark rounded-full px-4 py-2 text-sm text-white/90">
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="size-4 text-white/70" /> {ownerStats.messageCount}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Gift className="size-4 text-white/70" /> {ownerStats.giftCount}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-white/45">
              <Eye className="size-3" /> only you
            </span>
          </div>
        )}

        {/* Contributor name marquee (3+ non-anonymous names) */}
        {contributorFirstNames.length >= 3 && (
          <div
            className="fade-up mt-4 w-full max-w-sm overflow-hidden"
            style={{ maskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)" }}
          >
            <NavLoadingLink href={`/c/${slug}/post`} loadingText="Opening…" className="block">
              <div className="flex whitespace-nowrap">
                {/* Duplicate for seamless loop */}
                <span className="marquee inline-flex gap-4 text-[11px] uppercase tracking-widest text-white/55 pr-4">
                  {[...contributorFirstNames, ...contributorFirstNames].map((name, i) => (
                    <span key={i}>{name} <span className="text-white/30">·</span></span>
                  ))}
                </span>
              </div>
            </NavLoadingLink>
          </div>
        )}

        {/* Anyone can gift a year of weekly blessings, even while sealed.
            Once bought it stays here showing its current status. */}
        <div className="fade-up mt-4 w-full max-w-sm">
          <BlessingCta slug={slug} status={blessingStatus} surface="dark" />
        </div>

        {/* Everything below shares one tidy column. */}
        <div className="w-full max-w-sm mt-7 space-y-3">
          {/* Wishlist */}
          {wishlist.length > 0 && (
            <div className="fade-up rounded-2xl glass-dark p-4 text-left">
              <p className="text-[10px] uppercase tracking-widest text-white/60 mb-2.5 inline-flex items-center gap-1.5">
                <Gift className="size-3.5" /> {firstName}&apos;s wishlist
              </p>
              <ul className="space-y-2">
                {wishlist.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-white/90 text-sm">
                    <span className="size-1.5 rounded-full bg-white/40 shrink-0" />
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        {item.title}
                        <ExternalLink className="size-3 text-white/50" />
                      </a>
                    ) : (
                      <span>{item.title}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Blurred wall teaser */}
          <BlurredWallTeaser count={messageCount} slug={slug} firstName={firstName} />

          {/* CTAs */}
          {(canMessage || canContribute) && (
            <div className="fade-up flex gap-3 pt-1">
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

          <div className="fade-up pt-1">
            <ShareBar slug={slug} title={title} recipient={recipientName} messageCount={messageCount} daysLeft={daysLeft} />
          </div>
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
