"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X, Video, Gift, Lock, Loader2, LayoutGrid } from "lucide-react";
import type { Theme } from "@/lib/themes";
import type { IntroContent } from "@/lib/openai/generate-intro";
import { slideAccentBg, slideStyleKey } from "@/lib/slide-accents";
import { Interactive, type InteractiveKind } from "@/components/interactives";

type Msg = {
  id: string;
  contributor_name: string;
  is_anonymous: boolean;
  body: string | null;
  media_kind: "none" | "audio" | "video" | "image";
  media_path: string | null;
  media_duration_ms: number | null;
  interactive_kind: InteractiveKind;
  interactive_payload: Record<string, unknown> | null;
  contributor_session_id?: string | null;
  created_at: string;
};

export type GalleryImage = { path: string; caption: string; kind?: "image" | "video" };

type IntroSlide = {
  id: string;
  kind: "intro-welcome" | "intro-occasion" | "intro-together" | "intro-about" | "intro-ready" | "intro-gallery" | "intro-chapter" | "intro-final";
  duration: number;
  gallery?: GalleryImage;
  chapterIdx?: number;
};

type AnySlide =
  | { kind: "intro"; intro: IntroSlide }
  | { kind: "message"; msg: Msg; msgIdx: number };

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

const SCENES = [
  { name: "aurora",   bg: "radial-gradient(at 20% 20%, var(--mesh-b), transparent 55%), radial-gradient(at 80% 80%, var(--mesh-c), transparent 55%), var(--mesh-a)" },
  { name: "sunrise",  bg: "linear-gradient(180deg, var(--mesh-d) 0%, var(--mesh-b) 100%)" },
  { name: "rose",     bg: "radial-gradient(at 50% 0%, var(--accent-soft), transparent 60%), var(--mesh-a)" },
  { name: "horizon",  bg: "linear-gradient(160deg, var(--mesh-c) 0%, var(--mesh-d) 60%, white 100%)" },
  { name: "twilight", bg: "radial-gradient(at 80% 20%, var(--mesh-b), transparent 50%), radial-gradient(at 20% 80%, var(--mesh-c), transparent 50%), var(--mesh-d)" },
  { name: "petal",    bg: "conic-gradient(from 200deg at 50% 50%, var(--mesh-b), var(--mesh-d), var(--mesh-c), var(--mesh-b))" },
];

function sceneFor(i: number) { return SCENES[i % SCENES.length]; }

const EVENT_FALLBACK_EMOJI: Record<string, string> = {
  birthday: "🎂", graduation: "🎓", wedding: "💍",
  appreciation: "🙏", farewell: "🌟", baby_shower: "🌙",
  surprise_gift: "🎁", other: "✨",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// Strip the recipient's name out of AI copy at render time. Old intro_content
// rows pre-date the no-name rule, so the welcome subtext can still echo the
// name even though the slide already shows it prominently. Belt-and-braces.
function stripName(text: string | null | undefined, recipientName: string): string {
  if (!text) return "";
  const names = [recipientName, ...recipientName.split(/\s+/)]
    .map((n) => n.trim())
    .filter((n) => n.length >= 2);
  let out = text;
  for (const n of names) {
    const re = new RegExp(`(^|[\\s,!.?;:—–-])${n}(?:'s|s)?([\\s,!.?;:—–-]|$)`, "gi");
    out = out.replace(re, (_, a, b) => a + b);
  }
  return out
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,]+|[\s,]+$/g, "")
    .trim();
}

const MSG_ANIMS = [
  "slideFromLeft 0.6s cubic-bezier(.2,.7,.2,1) both",
  "slideFromRight 0.6s cubic-bezier(.2,.7,.2,1) both",
  "zoomIn 0.5s cubic-bezier(.2,.7,.2,1) both",
  "fadeUp 0.55s cubic-bezier(.2,.7,.2,1) both",
  "fadeDown 0.55s cubic-bezier(.2,.7,.2,1) both",
  "fadeIn 0.55s ease both",
];

// ─── Floating sparkle particles ───────────────────────────────────────────────

const DRIFT_PARTICLES = [
  { x: "12%", y: "22%", delay: "0s",   dur: "7s"  },
  { x: "78%", y: "18%", delay: "2.5s", dur: "9s"  },
  { x: "22%", y: "72%", delay: "5s",   dur: "8s"  },
  { x: "72%", y: "68%", delay: "1.5s", dur: "11s" },
  { x: "48%", y: "88%", delay: "3.5s", dur: "6.5s"},
];

// Deterministic pseudo-random so slides feel varied but stable across re-renders.
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Subtle, theme-aware ambient: a handful of slow-drifting accent motes.
// Deterministic per slide id so positions stay stable across re-renders,
// but uniform in style across the whole experience so it never feels busy.
function SprinkleOverlay({ slideId }: { slideId: string }) {
  const motes = useMemo(() => {
    const rand = mulberry32(hashSeed(slideId));
    return Array.from({ length: 6 }, (_, i) => ({
      key: i,
      left: `${(rand() * 92 + 4).toFixed(1)}%`,
      top:  `${(rand() * 92 + 4).toFixed(1)}%`,
      size: 3 + Math.floor(rand() * 4),
      dur:  `${(9 + rand() * 6).toFixed(2)}s`,
      delay: `${(rand() * 5).toFixed(2)}s`,
      tone: rand() < 0.55 ? "var(--accent)" : "var(--mesh-b)",
    }));
  }, [slideId]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {motes.map((m) => (
        <span
          key={m.key}
          className="absolute rounded-full"
          style={{
            left: m.left, top: m.top,
            width: m.size, height: m.size,
            background: m.tone,
            opacity: 0.18,
            filter: "blur(0.5px)",
            animation: `floatDrift ${m.dur} ease-in-out ${m.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

function WordsIn({ text, className, style, baseDelay = 0 }: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  baseDelay?: number;
}) {
  const words = text.split(/(\s+)/);
  return (
    <span className={`word-in ${className ?? ""}`} style={style}>
      {words.map((w, i) =>
        /^\s+$/.test(w) ? w : (
          <span key={i} style={{ animationDelay: `${baseDelay + i * 60}ms` }}>{w}</span>
        ),
      )}
    </span>
  );
}

function SparkleField() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {DRIFT_PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute text-ink/[0.12] text-[10px] select-none"
          style={{
            left: p.x, top: p.y,
            animation: `floatDrift ${p.dur} ease-in-out infinite`,
            animationDelay: p.delay,
          }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}

// A one-shot, then gently looping confetti shower for the closing slide —
// the "we made it" celebratory beat at the very end of the experience.
const CONFETTI_TONES = ["var(--accent)", "var(--mesh-b)", "var(--mesh-c)", "#fff"];
function ConfettiBurst() {
  const pieces = useMemo(() => {
    const rand = mulberry32(hashSeed("final-confetti"));
    return Array.from({ length: 26 }, (_, i) => ({
      key: i,
      left: `${(rand() * 100).toFixed(1)}%`,
      delay: `${(rand() * 2.4).toFixed(2)}s`,
      dur: `${(3.2 + rand() * 2.4).toFixed(2)}s`,
      size: 6 + Math.floor(rand() * 7),
      tone: CONFETTI_TONES[Math.floor(rand() * CONFETTI_TONES.length)],
      round: rand() < 0.35,
      drift: `${(rand() * 60 - 30).toFixed(0)}px`,
    }));
  }, []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.key}
          className="absolute -top-6"
          style={{
            left: p.left,
            width: p.size,
            height: p.round ? p.size : p.size * 0.5,
            background: p.tone,
            borderRadius: p.round ? "9999px" : "1px",
            opacity: 0.9,
            ["--drift" as string]: p.drift,
            animation: `confettiFall ${p.dur} linear ${p.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Slide builder ────────────────────────────────────────────────────────────

function buildBaseSlides(
  introContent: IntroContent | null,
  celebrantDescription: string | null,
): IntroSlide[] {
  const hasAbout = introContent
    ? !!introContent.about
    : !!(celebrantDescription && celebrantDescription.trim().length > 20);

  const slides: IntroSlide[] = [
    { id: "welcome",  kind: "intro-welcome",  duration: 7000 },
    { id: "occasion", kind: "intro-occasion", duration: 6500 },
    { id: "together", kind: "intro-together", duration: 6000 },
  ];
  if (hasAbout) slides.push({ id: "about", kind: "intro-about", duration: 8500 });

  const chapters = introContent?.chapters ?? [];
  // Cap so total intro slides stay at or under 10 (5 fixed + final + chapters)
  const room = Math.max(0, 10 - (slides.length + 2));
  chapters.slice(0, room).forEach((_, idx) => {
    slides.push({ id: `chapter-${idx}`, kind: "intro-chapter", duration: 7500, chapterIdx: idx });
  });

  slides.push({ id: "ready", kind: "intro-ready", duration: 5000 });
  // A closing slide always ends the experience. Even without AI copy the
  // render falls back to a warm default, so the show never just stops.
  slides.push({ id: "final", kind: "intro-final", duration: 7500 });
  return slides;
}

function buildIntroSequence(
  introContent: IntroContent | null,
  celebrantDescription: string | null,
  galleryImages: GalleryImage[],
): IntroSlide[] {
  const base = buildBaseSlides(introContent, celebrantDescription);

  // Hold the closing slide aside so gallery memories can never push past it —
  // it must land at the very end of everything.
  const finalSlide = base[base.length - 1]?.kind === "intro-final" ? base[base.length - 1] : null;
  const core = finalSlide ? base.slice(0, -1) : base;

  if (galleryImages.length === 0) return base;

  const result: IntroSlide[] = [];
  let g = 0;
  // Alternate intro slides with memories, then dump any remaining memories…
  for (let i = 0; i < core.length; i++) {
    result.push(core[i]);
    if (g < galleryImages.length) {
      result.push({ id: `gallery-${g}`, kind: "intro-gallery", duration: 7000, gallery: galleryImages[g++] });
    }
  }
  while (g < galleryImages.length) {
    result.push({ id: `gallery-extra-${g}`, kind: "intro-gallery", duration: 7000, gallery: galleryImages[g++] });
  }
  // …and only then the closing slide, so it is always the last thing seen.
  if (finalSlide) result.push(finalSlide);
  return result;
}

function durationFor(m: Msg): number {
  if (m.interactive_kind && m.interactive_kind !== "none") return Number.POSITIVE_INFINITY;
  if (m.media_kind === "image") return 5000;
  if (m.media_kind === "video" && m.media_duration_ms) return m.media_duration_ms + 800;
  if (m.media_kind === "audio" && m.media_duration_ms) return m.media_duration_ms + 800;
  if (m.body) return Math.min(9000, Math.max(5000, m.body.length * 100));
  return 5000;
}

// ─── Player ───────────────────────────────────────────────────────────────────

export function Player({
  slug, theme, musicUrl, musicClip, recipientName, eventType, celebrationDate, celebrationTitle,
  tagline, celebrantDescription, introContent, messages, galleryImages,
  totalRaisedKobo, claimableAt, payoutStatus, createdBy, onExit,
}: {
  slug: string;
  theme: Theme;
  musicUrl: string | null;
  musicClip?: { startSec: number; endSec: number } | null;
  recipientName: string;
  eventType: string;
  celebrationDate: string;
  celebrationTitle: string;
  tagline: string | null;
  celebrantDescription: string | null;
  introContent: IntroContent | null;
  messages: Msg[];
  galleryImages: GalleryImage[];
  totalRaisedKobo: number;
  claimableAt: string;
  payoutStatus: string;
  createdBy: string | null;
  onExit?: () => void;
}) {
  const introSlides = useMemo(
    () => buildIntroSequence(introContent, celebrantDescription, galleryImages),
    [introContent, celebrantDescription, galleryImages],
  );

  const allSlides: AnySlide[] = useMemo(() => [
    ...introSlides.map((intro): AnySlide => ({ kind: "intro", intro })),
    ...messages.map((msg, msgIdx): AnySlide => ({ kind: "message", msg, msgIdx })),
  ], [introSlides, messages]);

  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [interactiveReady, setInteractiveReady] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startTsRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  const total = allSlides.length;
  const current = allSlides[i];
  const isMsg = current?.kind === "message";
  const currentMsg = isMsg ? current.msg : null;
  const isInteractive = !!currentMsg && currentMsg.interactive_kind !== "none";

  const dur = !current
    ? 0
    : current.kind === "intro"
      ? current.intro.duration
      : isInteractive && interactiveReady ? 4500
      : durationFor(current.msg);

  const scene = useMemo(() => sceneFor(i), [i]);

  // Per-slide accent override (set in the editor), else the default scene.
  const slideBg = useMemo(() => {
    if (!current || current.kind !== "intro") return scene.bg;
    const key = slideStyleKey(current.intro.kind, current.intro.chapterIdx);
    const accent = key ? introContent?.slideStyles?.[key]?.accent : undefined;
    return slideAccentBg(accent) ?? scene.bg;
  }, [current, scene, introContent]);

  // Background music ducks (pauses) whenever a slide is itself playing sound:
  // voice-note / video cards, or a gallery video.
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const galleryVideoPlaying =
    current?.kind === "intro" &&
    current.intro.kind === "intro-gallery" &&
    current.intro.gallery?.kind === "video";
  const messageMediaPlaying =
    !!currentMsg && (currentMsg.media_kind === "audio" || currentMsg.media_kind === "video");
  const duckMusic = done || paused || messageMediaPlaying || galleryVideoPlaying;

  function clampToClip(audio: HTMLAudioElement) {
    if (!musicClip) return;
    if (audio.currentTime < musicClip.startSec || audio.currentTime >= musicClip.endSec) {
      audio.currentTime = musicClip.startSec;
    }
  }

  function onMusicTime() {
    const audio = musicRef.current;
    if (!audio || !musicClip) return;
    // Loop within the chosen window.
    if (audio.currentTime >= musicClip.endSec) {
      audio.currentTime = musicClip.startSec;
      audio.play().catch(() => {});
    }
  }

  function resumeMusic() {
    const audio = musicRef.current;
    if (!audio || duckMusic) return;
    clampToClip(audio);
    audio.volume = 0.32;
    audio.play().catch(() => { /* autoplay blocked — retried on next tap */ });
  }

  useEffect(() => {
    const audio = musicRef.current;
    if (!audio) return;
    if (duckMusic) {
      audio.pause();
    } else {
      clampToClip(audio);
      audio.volume = 0.32;
      audio.play().catch(() => { /* autoplay blocked — retried on next tap */ });
    }
  }, [duckMusic]);

  useEffect(() => { setInteractiveReady(false); }, [i]);

  useEffect(() => {
    if (done || !current) return;
    if (paused) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }
    if (isInteractive && !interactiveReady) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setProgress(0); return;
    }
    startTsRef.current = performance.now() - elapsedRef.current;
    function tick(ts: number) {
      const el = ts - startTsRef.current;
      elapsedRef.current = el;
      const p = Math.min(1, el / dur);
      setProgress(p);
      if (p >= 1) {
        elapsedRef.current = 0; setProgress(0);
        if (i + 1 >= total) setDone(true);
        else setI(i + 1);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [i, paused, dur, total, current, done, isInteractive, interactiveReady]);

  function next() { elapsedRef.current = 0; setProgress(0); if (i + 1 >= total) setDone(true); else setI(i + 1); }
  function prev() { elapsedRef.current = 0; setProgress(0); setDone(false); setI((x) => Math.max(0, x - 1)); }
  function replay() { elapsedRef.current = 0; setProgress(0); setShowGrid(false); setDone(false); setI(0); setPaused(false); }
  function selectSlide(idx: number) { elapsedRef.current = 0; setProgress(0); setShowGrid(false); setDone(false); setI(idx); setPaused(false); }

  const firstName = recipientName.split(" ")[0];

  return (
    <main
      data-theme={theme}
      className="fixed inset-0 select-none overflow-hidden"
      style={{ background: showGrid ? "white" : slideBg }}
      onClick={(e) => {
        resumeMusic();
        if (done) return;
        if (isInteractive && !interactiveReady) return;
        const x = e.clientX; const w = window.innerWidth;
        if (x < w / 3) prev(); else next();
      }}
    >
      {musicUrl && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio
          ref={musicRef}
          src={musicUrl}
          loop={!musicClip}
          onTimeUpdate={musicClip ? onMusicTime : undefined}
          onLoadedMetadata={() => { const a = musicRef.current; if (a) clampToClip(a); }}
          preload="auto"
        />
      )}
      {/* Progress bar — hidden in gallery view */}
      {!done && (
        <div className="absolute inset-x-0 top-0 px-3 pt-3 z-30 flex items-center gap-2">
          <div className="flex-1 flex gap-0.5">
            {allSlides.map((_, idx) => {
              const isIntroSlide = allSlides[idx]?.kind === "intro";
              return (
                <div key={idx} className={`flex-1 h-0.5 rounded-full overflow-hidden ${isIntroSlide ? "bg-white/20" : "bg-white/30"}`}>
                  <div
                    className={`h-full transition-[width] duration-100 ${isIntroSlide ? "bg-white/55" : "bg-white"}`}
                    style={{ width: `${idx < i ? 100 : idx === i ? progress * 100 : 0}%` }}
                  />
                </div>
              );
            })}
          </div>
          <button data-no-loading="true" onClick={(e) => { e.stopPropagation(); setPaused((p) => !p); }}
            className="size-9 grid place-items-center rounded-full glass-dark text-white" aria-label={paused ? "Play" : "Pause"}>
            {paused ? <Play className="size-4 fill-current" /> : <Pause className="size-4 fill-current" />}
          </button>
          {onExit ? (
            <button data-no-loading="true" onClick={(e) => { e.stopPropagation(); onExit(); }}
              className="size-9 grid place-items-center rounded-full glass-dark text-white" aria-label="Close preview">
              <X className="size-4" />
            </button>
          ) : (
            <Link href={`/c/${slug}/celebrate`} onClick={(e) => e.stopPropagation()}
              className="size-9 grid place-items-center rounded-full glass-dark text-white" aria-label="Close">
              <X className="size-4" />
            </Link>
          )}
        </div>
      )}

      {/* Slide content */}
      {showGrid ? (
        <PostPlayGallery
          allSlides={allSlides}
          firstName={firstName}
          slug={slug}
          introContent={introContent}
          celebrationTitle={celebrationTitle}
          createdBy={createdBy}
          onSelectSlide={selectSlide}
          onReplay={replay}
          onBack={() => setShowGrid(false)}
          onExit={onExit}
        />
      ) : (
        <>
          {current?.kind === "intro" ? (
            <>
              <SprinkleOverlay slideId={current.intro.id} />
              <IntroSlideView
                key={current.intro.id}
                slide={current.intro}
                firstName={firstName}
                recipientName={recipientName}
                eventType={eventType}
                celebrationDate={celebrationDate}
                celebrationTitle={celebrationTitle}
                tagline={tagline}
                celebrantDescription={celebrantDescription}
                introContent={introContent}
              />
            </>
          ) : currentMsg && current?.kind === "message" ? (
            <>
              <SprinkleOverlay slideId={`msg-${currentMsg.id}`} />
              <MessageSlide
                key={currentMsg.id}
                m={currentMsg}
                msgIdx={current.msgIdx}
                onInteractiveReady={() => setInteractiveReady(true)}
              />
            </>
          ) : null}

          {/* End state — the last slide stays on screen with the actions over it. */}
          {done && (
            <EndActions
              slug={slug}
              totalRaisedKobo={totalRaisedKobo}
              claimableAt={claimableAt}
              payoutStatus={payoutStatus}
              onReplay={replay}
              onViewAll={() => setShowGrid(true)}
              onExit={onExit}
            />
          )}
        </>
      )}

      {/* Desktop edge nav */}
      {!done && (
        <>
          <button data-no-loading="true" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Previous"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 size-10 rounded-full glass-dark text-white grid place-items-center md:flex hidden">
            <ChevronLeft className="size-5" />
          </button>
          <button data-no-loading="true" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Next"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 size-10 rounded-full glass-dark text-white grid place-items-center md:flex hidden">
            <ChevronRight className="size-5" />
          </button>
        </>
      )}
    </main>
  );
}

// ─── Intro slide renderer ─────────────────────────────────────────────────────

function IntroSlideView({
  slide, firstName, recipientName, eventType, celebrationDate, celebrationTitle,
  tagline, celebrantDescription, introContent,
}: {
  slide: IntroSlide;
  firstName: string;
  recipientName: string;
  eventType: string;
  celebrationDate: string;
  celebrationTitle: string;
  tagline: string | null;
  celebrantDescription: string | null;
  introContent: IntroContent | null;
}) {
  const ai = introContent;

  // ── Welcome ──────────────────────────────────────────────────────────────────
  if (slide.kind === "intro-welcome") {
    const emoji = ai?.welcome.emoji ?? "✨";
    const rawSubtext = ai?.welcome.subtext ?? tagline ?? null;
    // The slide already shows the name in the badge AND the headline.
    // Strip any echo of it from the subtext so we never get
    // "welcome to this joyous celebration, Tony" alongside "Tony".
    const subtext = stripName(rawSubtext, recipientName) || null;
    return (
      <section className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center overflow-hidden">
        <div className="absolute -top-24 -right-24 size-80 rounded-full bg-white/[0.08] blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute -bottom-24 -left-24 size-64 rounded-full bg-white/[0.06] blur-3xl pointer-events-none" aria-hidden />
        <SparkleField />

        <div className="absolute top-16 left-0 right-0 flex justify-center fade-up" style={{ animationDelay: "0ms" }}>
          <span className="inline-block rounded-full bg-white/15 backdrop-blur-sm px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] slide-ink-soft">
            For {firstName}
          </span>
        </div>

        <div className="relative z-10">
          <span
            className="block mb-10 leading-none"
            style={{
              fontSize: "clamp(4rem,18vw,7rem)",
              animation: "floatY 5s ease-in-out infinite, glowBreath 4s ease-in-out infinite",
            }}
          >
            {emoji}
          </span>
          <h1
            className="serif slide-accent leading-[0.85]"
            style={{ fontSize: "clamp(2.8rem,11vw,5.5rem)" }}
          >
            <WordsIn text={ai?.welcome.title?.trim() ? ai.welcome.title : firstName} baseDelay={120} />
          </h1>
          {subtext && (
            <p className="mt-6 slide-ink-soft text-xl leading-snug max-w-sm">
              <WordsIn text={subtext} baseDelay={400} />
            </p>
          )}
        </div>

        <div
          className="absolute bottom-14 left-0 right-0 flex items-center justify-center gap-5 fade-up"
          style={{ animationDelay: "450ms" }}
        >
          <span className="h-px w-14 bg-[color:var(--hero-ink)] opacity-20" />
          <span className="text-[9px] uppercase tracking-[0.4em] slide-ink-faint">
            {formatDate(celebrationDate)}
          </span>
          <span className="h-px w-14 bg-[color:var(--hero-ink)] opacity-20" />
        </div>
      </section>
    );
  }

  // ── Occasion ─────────────────────────────────────────────────────────────────
  if (slide.kind === "intro-occasion") {
    const emoji = ai?.occasion.emoji ?? (EVENT_FALLBACK_EMOJI[eventType] ?? "✨");
    const title = ai?.occasion.title ?? celebrationTitle;
    const subtext = ai?.occasion.subtext ?? null;
    return (
      <section className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
          <span
            className="leading-none select-none opacity-[0.07]"
            style={{
              fontSize: "clamp(14rem,60vw,30rem)",
              animation: "slowSpin 35s linear infinite, floatY 10s ease-in-out infinite",
            }}
          >
            {emoji}
          </span>
        </div>

        <div className="absolute -top-16 -right-16 size-72 rounded-full bg-white/[0.07] blur-3xl pointer-events-none" aria-hidden />

        <div className="absolute inset-x-0 bottom-0 pb-16 px-10 text-center">
          <p className="text-[11px] uppercase tracking-[0.28em] slide-ink-faint mb-5 fade-up">
            {formatDate(celebrationDate)}
          </p>
          <h2
            className="serif slide-accent leading-[0.9] fade-up"
            style={{ fontSize: "clamp(2.4rem,9vw,4.5rem)", animationDelay: "130ms" }}
          >
            {title}
          </h2>
          {subtext && (
            <p
              className="mt-5 slide-ink-soft text-[1.1rem] leading-snug max-w-xs mx-auto fade-up"
              style={{ animationDelay: "260ms" }}
            >
              {subtext}
            </p>
          )}
          <span
            className="block mt-7 leading-none fade-up"
            style={{
              fontSize: "clamp(2.2rem,8vw,3.5rem)",
              animationDelay: "390ms",
              animation: "floatY 4.5s ease-in-out infinite, glowBreath 5s ease-in-out infinite",
            }}
          >
            {emoji}
          </span>
        </div>
      </section>
    );
  }

  // ── Together ─────────────────────────────────────────────────────────────────
  if (slide.kind === "intro-together") {
    return (
      <section className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
          <div
            className="absolute rounded-full border border-white/[0.12]"
            style={{
              width: "min(480px, 85vw)", height: "min(480px, 85vw)",
              animation: "ringPulse 5s ease-in-out infinite",
            }}
          />
          <div
            className="absolute rounded-full border border-white/[0.09]"
            style={{
              width: "min(320px, 72vw)", height: "min(320px, 72vw)",
              animation: "ringPulse 5s ease-in-out infinite 1.7s",
            }}
          />
          <div
            className="absolute rounded-full border border-white/[0.06]"
            style={{
              width: "min(180px, 48vw)", height: "min(180px, 48vw)",
              animation: "ringPulse 5s ease-in-out infinite 3.4s",
            }}
          />
        </div>

        <div className="relative z-10 max-w-sm mx-auto text-center">
          {ai ? (
            <>
              <h2
                className="serif slide-ink leading-[1.05] fade-up"
                style={{ fontSize: "clamp(2rem,8vw,3.4rem)" }}
              >
                {ai.together.headline}
              </h2>
              {ai.together.subtext && (
                <p
                  className="mt-6 slide-ink-soft text-xl leading-snug fade-up"
                  style={{ animationDelay: "200ms" }}
                >
                  {ai.together.subtext}
                </p>
              )}
            </>
          ) : (
            <p
              className="serif slide-ink-soft leading-tight fade-up"
              style={{ fontSize: "clamp(1.8rem,7vw,2.8rem)" }}
            >
              {firstName}, today is yours.
            </p>
          )}
        </div>
      </section>
    );
  }

  // ── About ─────────────────────────────────────────────────────────────────────
  if (slide.kind === "intro-about") {
    const aiAbout = ai?.about;
    return (
      <section className="absolute inset-0 flex flex-col justify-center overflow-hidden">
        <div
          className="absolute top-1/3 -right-28 size-80 rounded-full bg-white/[0.07] blur-3xl pointer-events-none"
          aria-hidden
        />

        <div className="relative z-10 px-10">
          {aiAbout ? (
            <>
              <p className="text-[11px] uppercase tracking-[0.28em] slide-ink-faint mb-6 fade-up">
                About you
              </p>
              <h2
                className="serif slide-accent leading-[1.05] mb-9 fade-up"
                style={{ fontSize: "clamp(1.9rem,7.5vw,3rem)", animationDelay: "100ms" }}
              >
                {aiAbout.headline}
              </h2>

              <div className="relative pl-5">
                <div
                  className="absolute left-0 top-0 w-0.5 rounded-full"
                  style={{
                    height: "100%",
                    background: "color-mix(in srgb, var(--accent) 55%, transparent)",
                    animation: "lineGrow 1.6s ease-out forwards",
                    animationDelay: "300ms",
                    transform: "scaleY(0)",
                    transformOrigin: "top",
                  }}
                />
                <div className="space-y-5">
                  {aiAbout.lines.map((line, idx) => (
                    <p
                      key={idx}
                      className="slide-ink text-[1.1rem] leading-snug fade-up"
                      style={{ animationDelay: `${220 + idx * 160}ms` }}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </>
          ) : celebrantDescription ? (
            <blockquote className="serif slide-ink text-2xl leading-relaxed line-clamp-6 italic fade-up">
              &ldquo;{celebrantDescription}&rdquo;
            </blockquote>
          ) : null}
        </div>
      </section>
    );
  }

  // ── Gallery photo / video ─────────────────────────────────────────────────────
  if (slide.kind === "intro-gallery" && slide.gallery) {
    const { path, caption, kind } = slide.gallery;
    const isVideo = kind === "video";
    return (
      <section className="absolute inset-0 overflow-hidden fade-in bg-black">
        {isVideo ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={publicUrl(path)}
            className="absolute inset-0 size-full object-contain"
            autoPlay
            playsInline
            loop
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicUrl(path)}
            alt={caption || ""}
            className="absolute inset-0 size-full object-contain"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/10 to-black/65" />
        {caption && (
          <div className="absolute inset-x-0 bottom-0 pb-14 px-10 text-center">
            <p
              className="serif text-white/95 text-xl leading-snug max-w-sm mx-auto italic fade-up"
              style={{ animationDelay: "600ms" }}
            >
              &ldquo;{caption}&rdquo;
            </p>
          </div>
        )}
      </section>
    );
  }

  // ── Chapter (AI extras) ───────────────────────────────────────────────────────
  if (slide.kind === "intro-chapter" && typeof slide.chapterIdx === "number" && ai?.chapters?.[slide.chapterIdx]) {
    const ch = ai.chapters[slide.chapterIdx];
    return (
      <section className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center overflow-hidden">
        <div className="absolute -top-20 -left-24 size-72 rounded-full bg-white/[0.06] blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute -bottom-24 -right-16 size-80 rounded-full bg-white/[0.05] blur-3xl pointer-events-none" aria-hidden />
        <div className="relative z-10 max-w-sm">
          {ch.emoji && (
            <span
              className="block mb-7 leading-none"
              style={{
                fontSize: "clamp(3rem,11vw,4.2rem)",
                animation: "floatY 4.5s ease-in-out infinite, glowBreath 4s ease-in-out infinite",
              }}
            >
              {ch.emoji}
            </span>
          )}
          <h2 className="serif slide-accent leading-[0.95]" style={{ fontSize: "clamp(2rem,8vw,3.2rem)" }}>
            <WordsIn text={ch.headline} baseDelay={120} />
          </h2>
          <p className="mt-5 slide-ink-soft text-lg leading-snug">
            <WordsIn text={ch.body} baseDelay={380} />
          </p>
        </div>
      </section>
    );
  }

  // ── Final statement ───────────────────────────────────────────────────────────
  if (slide.kind === "intro-final") {
    const fin = ai?.final ?? {
      headline: "With love",
      subtext: "Today, and every day after.",
      emoji: EVENT_FALLBACK_EMOJI[eventType] ?? "✨",
    };
    return (
      <section className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center overflow-hidden">
        <ConfettiBurst />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
          <div
            className="rounded-full border border-white/[0.10]"
            style={{
              width: "min(360px, 80vw)", height: "min(360px, 80vw)",
              animation: "ringPulse 5s ease-in-out infinite",
            }}
          />
        </div>
        <span
          className="block mb-9 leading-none relative z-10"
          style={{
            fontSize: "clamp(3.4rem,14vw,5.5rem)",
            animation: "floatY 4.5s ease-in-out infinite, glowBreath 4s ease-in-out infinite",
          }}
        >
          {fin.emoji ?? "✨"}
        </span>
        <h2
          className="serif slide-accent leading-[0.95] relative z-10"
          style={{ fontSize: "clamp(2.2rem,9vw,3.8rem)" }}
        >
          <WordsIn text={fin.headline} baseDelay={150} />
        </h2>
        {fin.subtext && (
          <p className="mt-6 slide-ink-soft text-lg leading-snug max-w-sm relative z-10">
            <WordsIn text={fin.subtext} baseDelay={440} />
          </p>
        )}
      </section>
    );
  }

  // ── Ready ─────────────────────────────────────────────────────────────────────
  const readyEmoji = ai?.welcome?.emoji ?? "✨";
  return (
    <section className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center overflow-hidden">
      <div
        className="absolute inset-x-8 top-16 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute inset-x-8 bottom-16 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
        aria-hidden
      />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
        <div
          className="rounded-full border border-white/[0.10]"
          style={{
            width: "min(320px, 75vw)", height: "min(320px, 75vw)",
            animation: "ringPulse 4s ease-in-out infinite",
          }}
        />
      </div>

      <span
        className="block mb-10 leading-none relative z-10"
        style={{
          fontSize: "clamp(3.5rem,15vw,6rem)",
          animation: "floatY 4s ease-in-out infinite, glowBreath 3.5s ease-in-out infinite",
        }}
      >
        {readyEmoji}
      </span>

      {ai ? (
        <>
          <h2
            className="serif slide-ink leading-[0.9] fade-up relative z-10"
            style={{ fontSize: "clamp(2.4rem,9vw,4.2rem)" }}
          >
            {ai.ready.headline}
          </h2>
          {ai.ready.subtext && (
            <p
              className="mt-5 slide-ink-soft text-lg leading-snug max-w-xs fade-up relative z-10"
              style={{ animationDelay: "180ms" }}
            >
              {ai.ready.subtext}
            </p>
          )}
        </>
      ) : tagline ? (
        <p className="serif text-2xl slide-ink-soft fade-up relative z-10">{tagline}</p>
      ) : null}
    </section>
  );
}

// ─── Message slide ────────────────────────────────────────────────────────────

function MessageSlide({ m, msgIdx, onInteractiveReady }: { m: Msg; msgIdx: number; onInteractiveReady: () => void }) {
  const name = m.is_anonymous ? "Someone special" : m.contributor_name;
  const anim = MSG_ANIMS[msgIdx % MSG_ANIMS.length];

  if (m.interactive_kind && m.interactive_kind !== "none") {
    return (
      <section className="absolute inset-0 grid place-items-center px-4" style={{ animation: "fadeIn 0.45s ease both" }}>
        <div className="w-full max-w-phone">
          <Interactive
            kind={m.interactive_kind} body={m.body} mediaKind={m.media_kind}
            mediaPath={m.media_path} payload={m.interactive_payload}
            authorName={name} surface="light" onRevealed={onInteractiveReady}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="absolute inset-0 grid place-items-center px-6" style={{ animation: anim }}>
      <article className="w-full max-w-phone text-center">
        {m.media_kind === "image" && m.media_path && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={publicUrl(m.media_path)} alt="" className="w-full rounded-2xl shadow-card ken-burns" />
        )}
        {m.media_kind === "video" && m.media_path && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={publicUrl(m.media_path)} className="w-full rounded-2xl shadow-card" autoPlay playsInline controls={false} />
        )}
        {m.media_kind === "audio" && m.media_path && (
          <div className="bg-white/80 backdrop-blur rounded-3xl2 p-8 shadow-card">
            <p className="serif text-2xl text-ink mb-4">A voice note for you</p>
            <audio src={publicUrl(m.media_path)} className="w-full" autoPlay controls />
          </div>
        )}
        {m.body && (
          <p className={`mt-6 slide-ink whitespace-pre-wrap serif ${m.body.length < 80 ? "text-4xl leading-tight" : "text-2xl leading-snug"}`}>
            <WordsIn text={m.body} baseDelay={120} />
          </p>
        )}
        <p className="mt-7 text-[11px] uppercase tracking-[0.3em] slide-accent-soft fade-up" style={{ animationDelay: "350ms" }}>— {name}</p>
      </article>
    </section>
  );
}

// ─── Post-play gallery ────────────────────────────────────────────────────────

const INTRO_LABELS: Partial<Record<IntroSlide["kind"], string>> = {
  "intro-welcome": "Welcome",
  "intro-occasion": "Occasion",
  "intro-together": "Together",
  "intro-about": "About you",
  "intro-chapter": "Chapter",
  "intro-ready": "Ready",
  "intro-final": "Final word",
  "intro-gallery": "Memory",
};

function SlideThumbnail({
  slide, idx, introContent, onClick,
}: {
  slide: AnySlide;
  idx: number;
  introContent: IntroContent | null;
  onClick: () => void;
}) {
  const scene = sceneFor(idx);

  if (slide.kind === "intro") {
    const s = slide.intro;

    if (s.kind === "intro-gallery" && s.gallery) {
      const isVideo = s.gallery.kind === "video";
      return (
        <button onClick={onClick} className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-ink/10 w-full text-left">
          {isVideo ? (
            <div className="absolute inset-0 bg-ink/80 grid place-items-center">
              <Video className="size-6 text-white" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={publicUrl(s.gallery.path)} alt="" className="absolute inset-0 size-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
          {s.gallery.caption && (
            <p className="absolute bottom-2 left-2 right-2 text-white text-[10px] line-clamp-2 italic leading-tight">
              {s.gallery.caption}
            </p>
          )}
        </button>
      );
    }

    const label = INTRO_LABELS[s.kind] ?? s.kind;
    const emoji =
      s.kind === "intro-welcome" || s.kind === "intro-ready"
        ? (introContent?.welcome?.emoji ?? "✨")
        : s.kind === "intro-occasion"
          ? (introContent?.occasion?.emoji ?? "🎂")
          : null;

    return (
      <button
        onClick={onClick}
        className="relative aspect-[4/3] rounded-2xl overflow-hidden w-full"
        style={{ background: scene.bg }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-3">
          {emoji && <span className="text-2xl leading-none">{emoji}</span>}
          <p className="text-[10px] uppercase tracking-widest text-ink/60 font-medium">{label}</p>
        </div>
      </button>
    );
  }

  // Message slide
  const m = slide.msg;
  const name = m.is_anonymous ? "Someone special" : m.contributor_name;
  const hasMedia = m.media_kind !== "none" && m.media_path;

  return (
    <button
      onClick={onClick}
      className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-white border border-ink/8 w-full text-left flex flex-col p-3"
    >
      {m.media_kind === "image" && m.media_path && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={publicUrl(m.media_path)} alt="" className="absolute inset-0 size-full object-cover" />
      )}
      {(m.media_kind === "video" || m.media_kind === "audio") && (
        <div className="absolute inset-0 bg-ink/5 grid place-items-center">
          <Play className="size-5 text-ink/30 fill-current" />
        </div>
      )}
      <div className={`relative z-10 flex flex-col h-full ${hasMedia ? "justify-end" : "justify-between"}`}>
        {m.body && (
          <p className={`text-[11px] text-ink/80 serif leading-snug line-clamp-3 ${hasMedia ? "bg-white/90 rounded px-1.5 py-0.5" : ""}`}>
            {m.body}
          </p>
        )}
        <p className="text-[9px] text-ink/45 mt-1 uppercase tracking-widest">— {name}</p>
      </div>
    </button>
  );
}

function GiftReveal({
  slug, claimableAt, payoutStatus,
}: {
  slug: string;
  claimableAt: string;
  payoutStatus: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(payoutStatus === "paid");

  const unlocked = now >= new Date(claimableAt).getTime();

  useEffect(() => {
    if (unlocked) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [unlocked]);

  async function reveal() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/paystack/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Could not send your gift");
      }
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-3xl2 bg-[var(--accent-soft)] border border-[var(--accent)]/20 p-5 text-center">
        <Gift className="size-6 mx-auto text-[var(--accent)]" />
        <p className="serif text-xl text-ink mt-2">Your gift is on its way</p>
        <p className="text-ink/60 text-sm mt-1">
          The cash gift has been sent to your bank account.
        </p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="text-center">
        <button disabled className="w-full btn-accent py-5 text-base inline-flex opacity-50 cursor-not-allowed">
          <Lock className="size-5" /> Gift locked
        </button>
        <p className="text-ink/55 text-sm mt-2">
          Your gift unlocks on {formatDate(claimableAt)}.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <button
        onClick={reveal}
        disabled={loading}
        className="w-full btn-accent py-5 text-base shadow-glow inline-flex"
      >
        {loading
          ? <><Loader2 className="size-5 animate-spin" /> Sending your gift…</>
          : <><Gift className="size-5" /> Reveal &amp; receive your gift</>}
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      <p className="text-ink/45 text-xs mt-2">Sends straight to your saved bank account.</p>
    </div>
  );
}

// The closing state of the show: the last slide stays behind this, and the
// celebrant chooses what to do next — claim the gift, replay, browse every
// slide, or leave.
function EndActions({
  slug, totalRaisedKobo, claimableAt, payoutStatus, onReplay, onViewAll, onExit,
}: {
  slug: string;
  totalRaisedKobo: number;
  claimableAt: string;
  payoutStatus: string;
  onReplay: () => void;
  onViewAll: () => void;
  onExit?: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-40 flex flex-col justify-end"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-gradient-to-t from-black/45 via-black/15 to-transparent pt-24 px-4 pb-6">
        <div className="mx-auto w-full max-w-md rounded-3xl2 bg-white/92 backdrop-blur-md shadow-card p-5 space-y-4 fade-up">
          {totalRaisedKobo > 0 && (
            <GiftReveal slug={slug} claimableAt={claimableAt} payoutStatus={payoutStatus} />
          )}
          <div className="grid grid-cols-3 gap-2">
            <button
              data-no-loading="true"
              onClick={onReplay}
              className="btn-outline text-xs py-2.5 px-2 inline-flex flex-col items-center gap-1"
            >
              <RotateCcw className="size-4" /> Replay
            </button>
            <button
              data-no-loading="true"
              onClick={onViewAll}
              className="btn-outline text-xs py-2.5 px-2 inline-flex flex-col items-center gap-1"
            >
              <LayoutGrid className="size-4" /> All slides
            </button>
            {onExit ? (
              <button
                data-no-loading="true"
                onClick={onExit}
                className="btn-outline text-xs py-2.5 px-2 inline-flex flex-col items-center gap-1"
              >
                <X className="size-4" /> Close
              </button>
            ) : (
              <Link
                href={`/c/${slug}/celebrate`}
                className="btn-outline text-xs py-2.5 px-2 inline-flex flex-col items-center gap-1"
              >
                <X className="size-4" /> Close
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PostPlayGallery({
  allSlides, firstName, slug, introContent, celebrationTitle,
  createdBy, onSelectSlide, onReplay, onBack, onExit,
}: {
  allSlides: AnySlide[];
  firstName: string;
  slug: string;
  introContent: IntroContent | null;
  celebrationTitle: string;
  createdBy: string | null;
  onSelectSlide: (idx: number) => void;
  onReplay: () => void;
  onBack?: () => void;
  onExit?: () => void;
}) {
  return (
    <div
      className="absolute inset-0 bg-white overflow-y-auto fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-ink/8">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {onBack && (
              <button
                data-no-loading="true"
                onClick={onBack}
                className="size-9 grid place-items-center rounded-full bg-ink/8 text-ink shrink-0"
                aria-label="Back"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-ink/40">All memories</p>
              <h2 className="serif text-xl text-ink leading-tight mt-0.5 truncate">{celebrationTitle}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              data-no-loading="true"
              onClick={onReplay}
              className="btn-accent shadow-soft text-xs py-2 px-3 inline-flex gap-1.5"
            >
              <RotateCcw className="size-3.5" /> Replay all
            </button>
            {onExit ? (
              <button
                onClick={onExit}
                className="size-9 grid place-items-center rounded-full bg-ink/8 text-ink"
                aria-label="Close preview"
              >
                <X className="size-4" />
              </button>
            ) : (
              <Link
                href={`/c/${slug}/celebrate`}
                className="size-9 grid place-items-center rounded-full bg-ink/8 text-ink"
              >
                <X className="size-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8">
        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-4 py-6">
          {allSlides.map((slide, idx) => (
            <SlideThumbnail
              key={idx}
              slide={slide}
              idx={idx}
              introContent={introContent}
              onClick={() => onSelectSlide(idx)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="pb-12 pt-2 text-center">
          <p className="serif text-2xl text-ink/80 mb-4">You are loved, {firstName}.</p>
          {onExit ? (
            <button onClick={onExit} className="btn-outline inline-flex">
              Close preview
            </button>
          ) : (
            <Link href={`/c/${slug}/celebrate`} className="btn-outline inline-flex">
              Back to your page
            </Link>
          )}
          {createdBy && (
            <p className="text-[11px] text-ink/40 mt-6">
              This page was put together by <span className="text-ink/60">{createdBy}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
