"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Lock, Gift, Pencil, ExternalLink, MessageCircle, Eye, MapPin,
  Home, Users,
} from "lucide-react";
import { formatDate } from "@/lib/time";
import { Sparkles } from "@/components/sparkles";
import { ShareBar } from "./share-bar";
import { AddFriendButton } from "./add-friend-button";
import { NavLoadingLink } from "@/components/nav-loading-link";
import type { BlessingEntryStatus } from "@/lib/blessings/labels";
import { BlessingCta } from "./blessing-cta";
import { supabaseBrowser } from "@/lib/supabase/client";

type WishlistItem = { title: string; url?: string };
type ShippingAddress = {
  label?: string;
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  phone?: string;
};
type TabId = "home" | "wishlist" | "wall";

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

function ActivityToast({ name }: { name: string }) {
  return (
    <div
      className="fixed bottom-28 right-4 z-50 glass-dark rounded-full px-4 py-2.5 text-sm text-white shadow-card"
      style={{ animation: "riseFade 3.6s ease-in-out forwards" }}
    >
      ✨ {name} just left a surprise
    </div>
  );
}

// Tab preview card shown in the sticky top nav
function TabCard({
  tabId, label, isActive, days, wishlistCount, messageCount, onClick,
}: {
  tabId: TabId;
  label: string;
  isActive: boolean;
  days: number;
  wishlistCount: number;
  messageCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex-shrink-0 w-[100px] h-[68px] rounded-2xl overflow-hidden transition-all duration-200 ${
        isActive
          ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-black/20 opacity-100"
          : "opacity-50 hover:opacity-70"
      }`}
    >
      <div className="absolute inset-0 glass-dark" />
      {isActive && <div className="absolute inset-0 bg-[var(--accent)] opacity-25" />}
      <div className="relative z-10 flex flex-col justify-between h-full p-2.5">
        <div className="flex items-center gap-1">
          {tabId === "home" && <Home className="size-3 text-white/70" />}
          {tabId === "wishlist" && <Gift className="size-3 text-white/70" />}
          {tabId === "wall" && <MessageCircle className="size-3 text-white/70" />}
          <span className="text-[10px] uppercase tracking-wider text-white/70 font-medium">{label}</span>
        </div>
        {tabId === "home" && (
          <div>
            <p className="text-white text-sm font-semibold tabular-nums leading-none">{days}d</p>
            <p className="text-white/50 text-[9px] mt-0.5">remaining</p>
          </div>
        )}
        {tabId === "wishlist" && (
          <div>
            <p className="text-white text-sm font-semibold leading-none">{wishlistCount}</p>
            <p className="text-white/50 text-[9px] mt-0.5">{wishlistCount === 1 ? "item" : "items"}</p>
          </div>
        )}
        {tabId === "wall" && (
          <div className="flex items-center gap-1">
            <Lock className="size-3 text-white/40" />
            <p className="text-white/50 text-[9px]">
              {messageCount > 0 ? `${messageCount} sealed` : "Sealed"}
            </p>
          </div>
        )}
      </div>
    </button>
  );
}

// Blurred wall teaser — no embedded CTA (sticky bottom handles it)
function BlurredWallTeaser({ count }: { count: number }) {
  const ROTS = ["polaroid--a", "polaroid--b", "polaroid--c", "polaroid--d", "polaroid--e"];
  const shown = Math.min(count, 6);

  if (count === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageCircle className="size-10 text-white/20 mb-3" />
        <p className="text-white/50 text-sm">No surprises yet.</p>
        <p className="text-white/35 text-xs mt-1">Use the button below to be the first!</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden w-full">
      <div
        className="grid grid-cols-2 gap-2.5 p-3"
        style={{ filter: "blur(5px)", opacity: 0.5, pointerEvents: "none", userSelect: "none" }}
      >
        {Array.from({ length: shown }).map((_, i) => (
          <div
            key={i}
            className={`polaroid ${ROTS[i % ROTS.length]} w-full`}
            style={{ transform: "rotate(var(--rot, 0deg))" }}
          >
            <div className="w-full aspect-[3/2] rounded-md bg-white/30" />
            <div className="mt-2 h-1.5 bg-white/20 rounded-full w-3/4" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <Lock className="size-5 text-white/70" />
        <p className="text-white font-medium text-sm drop-shadow-md">
          {count} {count === 1 ? "surprise" : "surprises"} sealed
        </p>
        <p className="text-white/55 text-xs">Unlocks on the day ✨</p>
      </div>
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
  shippingAddress,
  sealedTheme,
  addFriendTargetId,
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
  shippingAddress: ShippingAddress | null;
  sealedTheme?: string | null;
  addFriendTargetId?: string | null;
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
    requestAnimationFrame(() => {
      setConfettiActive(true);
      setLockToast(true);
    });
    confettiTimer.current = setTimeout(() => {
      setConfettiActive(false);
      setLockToast(false);
    }, 2000);
  }

  // Live counts
  const [messageCount, setMessageCount] = useState(initialMessageCount);
  const [giftCount, setGiftCount] = useState(initialGiftCount);

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

  // Tab system
  const hasWishlistContent = wishlist.length > 0;
  const tabIds: TabId[] = ["home", ...(hasWishlistContent ? ["wishlist" as TabId] : []), "wall"];
  const wallTabIndex = tabIds.length - 1;
  const [activeTab, setActiveTab] = useState(0);

  // Swipe gesture
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStart.current.y);
    touchStart.current = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > dy * 1.5) {
      if (dx < 0 && activeTab < tabIds.length - 1) setActiveTab((i) => i + 1);
      if (dx > 0 && activeTab > 0) setActiveTab((i) => i - 1);
    }
  }

  const hasCtas = canMessage || canContribute;

  return (
    <main
      data-theme={theme}
      data-sealed-theme={sealedTheme ?? ""}
      className="relative h-[100dvh] overflow-hidden flex flex-col theme-mesh"
    >
      <Sparkles count={8} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/75 pointer-events-none" aria-hidden />

      {activityToast && <ActivityToast key={activityToast + Date.now()} name={activityToast} />}

      {/* ── Sticky top: header + tab preview nav ── */}
      <div className="relative z-30 flex-shrink-0">
        <header
          className="px-5 pb-2 flex items-center justify-between"
          style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
        >
          <Link href={isCreator ? "/dashboard" : "/"} className="serif text-lg text-white drop-shadow">
            Spendbox
          </Link>
          {isCreator ? (
            <Link
              href={`/c/${slug}/edit`}
              className="glass-dark rounded-full px-3 py-1.5 text-xs text-white inline-flex items-center gap-1.5"
            >
              <Pencil className="size-3.5" /> Edit
            </Link>
          ) : addFriendTargetId ? (
            <AddFriendButton targetUserId={addFriendTargetId} />
          ) : null}
        </header>

        <div className="flex gap-3 px-5 pb-4 pt-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {tabIds.map((tabId, i) => (
            <TabCard
              key={tabId}
              tabId={tabId}
              label={tabId === "home" ? "Home" : tabId === "wishlist" ? "Wishlist" : "Wall"}
              isActive={activeTab === i}
              days={daysLeft}
              wishlistCount={wishlist.length}
              messageCount={messageCount}
              onClick={() => setActiveTab(i)}
            />
          ))}
        </div>
      </div>

      {/* ── Sliding tab panels ── */}
      <div
        className="relative flex-1 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* HOME tab */}
        <div
          aria-hidden={activeTab !== 0}
          className="absolute inset-0 overflow-y-auto overscroll-contain transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${(0 - activeTab) * 100}%)` }}
        >
          <div className="flex flex-col items-center text-center px-6 py-6 pb-40 min-h-full">
            {avatarUrl ? (
              <div className="size-20 md:size-24 rounded-full overflow-hidden ring-2 ring-white/40 shadow-card mb-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarUrl} alt="" width={96} height={96} className="size-full object-cover" />
              </div>
            ) : (
              <div className="size-20 md:size-24 rounded-full bg-white/15 grid place-items-center mb-5">
                <Gift className="size-9 text-white" />
              </div>
            )}

            <p className="fade-up text-[11px] uppercase tracking-[0.3em] text-white/75">
              {eventLabel ? `${eventLabel} · ` : ""}{formatDate(celebrationDate)}
            </p>
            <h1
              className="fade-up serif text-white mt-3 leading-[0.95] drop-shadow-sm"
              style={{ fontSize: "clamp(2.2rem,9vw,3.75rem)" }}
            >
              {title}
            </h1>

            <div className="fade-up mt-7 flex items-end justify-center gap-4 md:gap-7">
              <Unit value={t.days} label="days" />
              <Unit value={t.hours} label="hrs" />
              <Unit value={t.mins} label="min" />
              <Unit value={t.secs} label="sec" />
            </div>

            {/* Tappable lock badge */}
            <div className="relative mt-6">
              <ConfettiBurst active={confettiActive} />
              <button
                onClick={handleLockTap}
                className="fade-up text-white/80 text-sm inline-flex items-center gap-2 glass-dark rounded-full px-4 py-2 active:scale-110 transition-transform duration-150"
                aria-label="Tap the lock"
              >
                <Lock className="size-4" />
                {isCreator
                  ? "Your surprises are sealed until the day"
                  : `Sealed until ${firstName}'s day`}
              </button>
              {lockToast && (
                <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-white/80 text-xs pop-in">
                  Nice try! Still sealed tight 🔒
                </p>
              )}
            </div>

            {messageFromCreator && (
              <div className="fade-up mt-6 glass-dark rounded-2xl px-4 py-3 max-w-sm text-white/85 text-sm italic text-center">
                &ldquo;{messageFromCreator}&rdquo;
              </div>
            )}

            {messageCount > 0 && (
              <p className="fade-up mt-4 text-white/70 text-sm inline-flex items-center gap-2">
                <MessageCircle className="size-4" />
                {messageCount} {messageCount === 1 ? "person has" : "people have"} left {firstName} a surprise ✨
              </p>
            )}

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

            {contributorFirstNames.length >= 3 && (
              <div
                className="fade-up mt-4 w-full max-w-sm overflow-hidden"
                style={{ maskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)" }}
              >
                <NavLoadingLink href={`/c/${slug}/post`} loadingText="Opening…" className="block">
                  <div className="flex whitespace-nowrap">
                    <span className="marquee inline-flex gap-4 text-[11px] uppercase tracking-widest text-white/55 pr-4">
                      {[...contributorFirstNames, ...contributorFirstNames].map((name, i) => (
                        <span key={i}>{name} <span className="text-white/30">·</span></span>
                      ))}
                    </span>
                  </div>
                </NavLoadingLink>
              </div>
            )}

            <div className="fade-up mt-4 w-full max-w-sm">
              <BlessingCta slug={slug} status={blessingStatus} surface="dark" />
            </div>

            <div className="fade-up mt-5 w-full max-w-sm">
              <ShareBar slug={slug} title={title} recipient={recipientName} messageCount={messageCount} daysLeft={daysLeft} />
            </div>

            {createdBy && (
              <p className="mt-6 text-[11px] text-white/55">
                Put together by <span className="text-white/80">{createdBy}</span>
              </p>
            )}
          </div>
        </div>

        {/* WISHLIST tab (only rendered if there's content) */}
        {hasWishlistContent && (
          <div
            aria-hidden={activeTab !== 1}
            className="absolute inset-0 overflow-y-auto overscroll-contain transition-transform duration-300 ease-out"
            style={{ transform: `translateX(${(1 - activeTab) * 100}%)` }}
          >
            <div className="px-5 pt-8 pb-40 space-y-4">
              <h2 className="serif text-2xl text-white text-center drop-shadow-sm">
                {firstName}&apos;s Wishlist
              </h2>

              {wishlist.length > 0 && (
                <div className="glass-dark rounded-2xl p-4 space-y-2.5">
                  <p className="text-[10px] uppercase tracking-widest text-white/60 mb-1 inline-flex items-center gap-1.5">
                    <Gift className="size-3.5" /> Items
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

              {wishlist.length === 0 && (
                <p className="text-center text-white/50 text-sm py-8">Nothing here yet.</p>
              )}
            </div>
          </div>
        )}

        {/* WALL tab */}
        <div
          aria-hidden={activeTab !== wallTabIndex}
          className="absolute inset-0 overflow-y-auto overscroll-contain transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${(wallTabIndex - activeTab) * 100}%)` }}
        >
          <div className="flex flex-col items-center px-5 pt-8 pb-40">
            <div className="flex items-center gap-2 mb-1">
              <Users className="size-4 text-white/60" />
              <p className="text-white/70 text-sm">
                {messageCount > 0
                  ? `${messageCount} ${messageCount === 1 ? "person has" : "people have"} left a surprise`
                  : "No surprises yet — be the first!"}
              </p>
            </div>
            {messageCount > 0 && (
              <p className="text-white/40 text-xs mb-5">Revealed on {formatDate(celebrationDate)}</p>
            )}
            <div className="w-full max-w-sm mt-2">
              <BlurredWallTeaser count={messageCount} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky bottom CTAs ── */}
      {hasCtas && (
        <div
          className="relative z-20 flex-shrink-0 px-5 pt-3 pb-6 glass-dark"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1.5rem)" }}
        >
          <div className="flex gap-3">
            {canMessage && (
              <NavLoadingLink
                href={`/c/${slug}/post`}
                className={`btn-accent shadow-glow inline-flex items-center justify-center ${
                  canContribute ? "flex-1" : "w-full"
                }`}
                loadingText="Opening…"
              >
                Leave a message
              </NavLoadingLink>
            )}
            {canContribute && (
              <NavLoadingLink
                href={`/c/${slug}/contribute`}
                className={`inline-flex items-center justify-center rounded-full bg-white/90 text-ink py-3 px-5 font-medium ${
                  canMessage ? "flex-1" : "w-full"
                }`}
                loadingText="Opening…"
              >
                Send a gift
              </NavLoadingLink>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
