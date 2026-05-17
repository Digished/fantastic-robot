"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X } from "lucide-react";
import type { Theme } from "@/lib/themes";
import type { IntroContent } from "@/lib/openai/generate-intro";
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

type IntroSlide = {
  id: string;
  kind: "intro-welcome" | "intro-occasion" | "intro-together" | "intro-about" | "intro-ready";
  duration: number;
};

type AnySlide =
  | { kind: "intro"; intro: IntroSlide }
  | { kind: "message"; msg: Msg };

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

const EVENT_EMOJI: Record<string, string> = {
  birthday: "🎂", graduation: "🎓", wedding: "💍",
  appreciation: "🙏", farewell: "👋", baby_shower: "🍼",
  surprise_gift: "🎁", other: "🎉",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function buildIntroSlides(
  introContent: IntroContent | null,
  celebrantDescription: string | null,
): IntroSlide[] {
  const hasAbout = introContent
    ? !!introContent.about
    : !!(celebrantDescription && celebrantDescription.trim().length > 20);

  const slides: IntroSlide[] = [
    { id: "welcome",  kind: "intro-welcome",  duration: 4000 },
    { id: "occasion", kind: "intro-occasion", duration: 3500 },
    { id: "together", kind: "intro-together", duration: 3500 },
  ];
  if (hasAbout) slides.push({ id: "about", kind: "intro-about", duration: 5000 });
  slides.push({ id: "ready", kind: "intro-ready", duration: 2500 });
  return slides;
}

function durationFor(m: Msg): number {
  if (m.interactive_kind && m.interactive_kind !== "none") return Number.POSITIVE_INFINITY;
  if (m.media_kind === "image") return 4500;
  if (m.media_kind === "video" && m.media_duration_ms) return m.media_duration_ms + 600;
  if (m.media_kind === "audio" && m.media_duration_ms) return m.media_duration_ms + 600;
  if (m.body) return Math.min(8000, Math.max(3800, m.body.length * 90));
  return 4000;
}

export function Player({
  slug, theme, recipientName, eventType, celebrationDate, celebrationTitle,
  tagline, celebrantDescription, introContent, messages,
}: {
  slug: string;
  theme: Theme;
  recipientName: string;
  eventType: string;
  celebrationDate: string;
  celebrationTitle: string;
  tagline: string | null;
  celebrantDescription: string | null;
  introContent: IntroContent | null;
  messages: Msg[];
}) {
  const introSlides = useMemo(
    () => buildIntroSlides(introContent, celebrantDescription),
    [introContent, celebrantDescription],
  );

  const allSlides: AnySlide[] = useMemo(() => [
    ...introSlides.map((intro): AnySlide => ({ kind: "intro", intro })),
    ...messages.map((msg): AnySlide => ({ kind: "message", msg })),
  ], [introSlides, messages]);

  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [interactiveReady, setInteractiveReady] = useState(false);
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
      : isInteractive && interactiveReady
        ? 4500
        : durationFor(current.msg);

  const scene = useMemo(() => sceneFor(i), [i]);

  useEffect(() => { setInteractiveReady(false); }, [i]);

  useEffect(() => {
    if (done || !current) return;
    if (paused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    if (isInteractive && !interactiveReady) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setProgress(0);
      return;
    }
    startTsRef.current = performance.now() - elapsedRef.current;
    function tick(ts: number) {
      const el = ts - startTsRef.current;
      elapsedRef.current = el;
      const p = Math.min(1, el / dur);
      setProgress(p);
      if (p >= 1) {
        elapsedRef.current = 0;
        setProgress(0);
        if (i + 1 >= total) setDone(true);
        else setI(i + 1);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [i, paused, dur, total, current, done, isInteractive, interactiveReady]);

  function next() {
    elapsedRef.current = 0; setProgress(0);
    if (i + 1 >= total) setDone(true);
    else setI(i + 1);
  }
  function prev() {
    elapsedRef.current = 0; setProgress(0);
    setDone(false);
    setI((x) => Math.max(0, x - 1));
  }
  function replay() {
    elapsedRef.current = 0; setProgress(0);
    setDone(false); setI(0); setPaused(false);
  }

  const firstName = recipientName.split(" ")[0];

  return (
    <main
      data-theme={theme}
      className="fixed inset-0 select-none overflow-hidden"
      style={{ background: scene.bg }}
      onClick={(e) => {
        if (isInteractive && !interactiveReady) return;
        const x = e.clientX;
        const w = window.innerWidth;
        if (x < w / 3) prev(); else next();
      }}
    >
      {/* Progress bar */}
      <div className="absolute inset-x-0 top-0 px-3 pt-3 z-30 flex items-center gap-2">
        <div className="flex-1 flex gap-0.5">
          {allSlides.map((_, idx) => {
            const isIntroSlide = allSlides[idx]?.kind === "intro";
            return (
              <div
                key={idx}
                className={`flex-1 h-0.5 rounded-full overflow-hidden ${isIntroSlide ? "bg-white/20" : "bg-white/30"}`}
              >
                <div
                  className={`h-full transition-[width] duration-100 ${isIntroSlide ? "bg-white/60" : "bg-white"}`}
                  style={{ width: `${idx < i ? 100 : idx === i ? progress * 100 : 0}%` }}
                />
              </div>
            );
          })}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setPaused((p) => !p); }}
          className="size-9 grid place-items-center rounded-full glass-dark text-white"
          aria-label={paused ? "Play" : "Pause"}
        >
          {paused ? <Play className="size-4 fill-current" /> : <Pause className="size-4 fill-current" />}
        </button>
        <Link
          href={`/c/${slug}/celebrate`}
          onClick={(e) => e.stopPropagation()}
          className="size-9 grid place-items-center rounded-full glass-dark text-white"
          aria-label="Close"
        >
          <X className="size-4" />
        </Link>
      </div>

      {/* Slide content */}
      {!done ? (
        current?.kind === "intro" ? (
          <IntroSlideView
            key={current.intro.id}
            slide={current.intro}
            firstName={firstName}
            eventType={eventType}
            celebrationDate={celebrationDate}
            celebrationTitle={celebrationTitle}
            tagline={tagline}
            celebrantDescription={celebrantDescription}
            introContent={introContent}
            messageCount={messages.length}
          />
        ) : currentMsg ? (
          <MessageSlide
            key={currentMsg.id}
            m={currentMsg}
            onInteractiveReady={() => setInteractiveReady(true)}
          />
        ) : null
      ) : (
        <EndCard firstName={firstName} onReplay={replay} slug={slug} />
      )}

      {/* Desktop edge nav */}
      <button
        onClick={(e) => { e.stopPropagation(); prev(); }}
        aria-label="Previous"
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 size-10 rounded-full glass-dark text-white grid place-items-center md:flex hidden"
      ><ChevronLeft className="size-5" /></button>
      <button
        onClick={(e) => { e.stopPropagation(); next(); }}
        aria-label="Next"
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 size-10 rounded-full glass-dark text-white grid place-items-center md:flex hidden"
      ><ChevronRight className="size-5" /></button>
    </main>
  );
}

// ─── Intro slide renderer ─────────────────────────────────────────────────────

function IntroSlideView({
  slide, firstName, eventType, celebrationDate, celebrationTitle,
  tagline, celebrantDescription, introContent, messageCount,
}: {
  slide: IntroSlide;
  firstName: string;
  eventType: string;
  celebrationDate: string;
  celebrationTitle: string;
  tagline: string | null;
  celebrantDescription: string | null;
  introContent: IntroContent | null;
  messageCount: number;
}) {
  // Pull AI content or fall back to template strings
  const ai = introContent;

  if (slide.kind === "intro-welcome") {
    const emoji = ai?.welcome.emoji ?? "🎉";
    const subtext = ai?.welcome.subtext ?? tagline ?? null;
    return (
      <section className="absolute inset-0 flex flex-col items-center justify-center px-8 fade-in text-center">
        <span className="text-6xl mb-6 animate-bounce">{emoji}</span>
        <h1 className="serif text-6xl text-ink leading-[0.9] drop-shadow-sm">
          Hi {firstName},
        </h1>
        {subtext && (
          <p className="mt-5 text-ink/80 text-xl leading-snug max-w-sm">{subtext}</p>
        )}
        <div className="mt-8 flex gap-2 justify-center">
          <span className="text-2xl">💛</span>
          <span className="text-2xl">🌟</span>
          <span className="text-2xl">💛</span>
        </div>
      </section>
    );
  }

  if (slide.kind === "intro-occasion") {
    const emoji = ai?.occasion.emoji ?? EVENT_EMOJI[eventType] ?? "🎉";
    const title = ai?.occasion.title ?? celebrationTitle;
    const subtext = ai?.occasion.subtext ?? formatDate(celebrationDate);
    return (
      <section className="absolute inset-0 flex flex-col items-center justify-center px-8 fade-in text-center">
        <span className="text-7xl mb-7">{emoji}</span>
        <h2 className="serif text-4xl text-ink leading-tight max-w-xs">{title}</h2>
        <p className="mt-4 text-ink/70 text-lg leading-snug max-w-xs">{subtext}</p>
        {!ai && (
          <div className="mt-5 inline-flex items-center gap-2 bg-white/40 backdrop-blur rounded-full px-5 py-2">
            <span className="text-base">📅</span>
            <span className="text-ink/75 text-sm font-medium">{formatDate(celebrationDate)}</span>
          </div>
        )}
      </section>
    );
  }

  if (slide.kind === "intro-together") {
    return (
      <section className="absolute inset-0 flex flex-col items-center justify-center px-8 fade-in text-center">
        <div className="flex justify-center gap-1 mb-8 text-3xl">
          {["❤️", "🧡", "💛", "💚", "💙"].map((e, idx) => (
            <span key={idx} style={{ animationDelay: `${idx * 120}ms` }} className="animate-bounce">{e}</span>
          ))}
        </div>
        {ai ? (
          <>
            <h2 className="serif text-3xl text-ink leading-snug max-w-sm">{ai.together.headline}</h2>
            {ai.together.subtext && (
              <p className="mt-4 text-ink/70 text-lg max-w-xs leading-snug">{ai.together.subtext}</p>
            )}
          </>
        ) : messageCount > 0 ? (
          <>
            <h2 className="serif text-6xl text-ink leading-tight">{messageCount}</h2>
            <p className="mt-3 serif text-2xl text-ink/75">
              {messageCount === 1 ? "person wrote to you" : "people wrote to you"}
            </p>
          </>
        ) : null}
      </section>
    );
  }

  if (slide.kind === "intro-about") {
    const aiAbout = ai?.about;
    return (
      <section className="absolute inset-0 flex flex-col items-center justify-center px-8 fade-in text-center">
        <span className="text-4xl mb-6">🌸</span>
        {aiAbout ? (
          <>
            <h2 className="serif text-3xl text-ink leading-snug max-w-sm mb-5">
              {aiAbout.headline}
            </h2>
            <ul className="space-y-3">
              {aiAbout.lines.map((line, idx) => (
                <li key={idx} className="text-ink/80 text-lg leading-snug">{line}</li>
              ))}
            </ul>
          </>
        ) : (
          <blockquote className="serif text-ink text-xl leading-relaxed max-w-sm line-clamp-6 italic">
            &ldquo;{celebrantDescription}&rdquo;
          </blockquote>
        )}
      </section>
    );
  }

  // intro-ready
  return (
    <section className="absolute inset-0 flex flex-col items-center justify-center px-8 fade-in text-center">
      <span className="text-5xl mb-6">💌</span>
      {ai ? (
        <>
          <h2 className="serif text-4xl text-ink leading-tight">{ai.ready.headline}</h2>
          {ai.ready.subtext && (
            <p className="mt-4 text-ink/65 text-lg leading-snug max-w-xs">{ai.ready.subtext}</p>
          )}
        </>
      ) : null}
    </section>
  );
}

// ─── Message slide ────────────────────────────────────────────────────────────

function MessageSlide({
  m, onInteractiveReady,
}: { m: Msg; onInteractiveReady: () => void }) {
  const name = m.is_anonymous ? "Someone special" : m.contributor_name;

  if (m.interactive_kind && m.interactive_kind !== "none") {
    return (
      <section className="absolute inset-0 grid place-items-center px-4 fade-in">
        <div className="w-full max-w-phone">
          <Interactive
            kind={m.interactive_kind}
            body={m.body}
            mediaKind={m.media_kind}
            mediaPath={m.media_path}
            payload={m.interactive_payload}
            authorName={name}
            surface="light"
            onRevealed={onInteractiveReady}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="absolute inset-0 grid place-items-center px-6 fade-in">
      <article className="w-full max-w-phone text-center">
        {m.media_kind === "image" && m.media_path && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={publicUrl(m.media_path)} alt="" className="w-full rounded-2xl shadow-card ken-burns" />
        )}
        {m.media_kind === "video" && m.media_path && (
          <video src={publicUrl(m.media_path)} className="w-full rounded-2xl shadow-card"
                 autoPlay playsInline controls={false} />
        )}
        {m.media_kind === "audio" && m.media_path && (
          <div className="bg-white/80 backdrop-blur rounded-3xl2 p-8 shadow-card">
            <p className="serif text-2xl text-ink mb-4">A voice note for you</p>
            <audio src={publicUrl(m.media_path)} className="w-full" autoPlay controls />
          </div>
        )}
        {m.body && (
          <p className={`mt-6 text-ink whitespace-pre-wrap serif ${
            m.body.length < 80 ? "text-4xl leading-tight" : "text-2xl leading-snug"
          }`}>
            {m.body}
          </p>
        )}
        <p className="mt-7 text-[11px] uppercase tracking-[0.3em] text-ink/60">— {name}</p>
      </article>
    </section>
  );
}

// ─── End card ────────────────────────────────────────────────────────────────

function EndCard({
  firstName, onReplay, slug,
}: { firstName: string; onReplay: () => void; slug: string }) {
  return (
    <section className="absolute inset-0 grid place-items-center px-6 fade-in">
      <div className="text-center">
        <span className="text-5xl block mb-4">🫶</span>
        <p className="text-[11px] uppercase tracking-[0.35em] text-ink/55">That&apos;s all of them</p>
        <h2 className="serif text-5xl text-ink mt-4 leading-tight">You are loved, {firstName}.</h2>
        <div className="mt-8 flex flex-col gap-3">
          <button onClick={onReplay} className="btn-accent shadow-soft inline-flex">
            <RotateCcw className="size-4" /> Replay
          </button>
          <Link href={`/c/${slug}/celebrate`} className="btn-outline inline-flex">
            Back to your page
          </Link>
        </div>
      </div>
    </section>
  );
}
