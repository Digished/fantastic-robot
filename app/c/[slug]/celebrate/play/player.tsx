"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X } from "lucide-react";
import type { Theme } from "@/lib/themes";
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

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

// Per-slide "scene" — gives every card a custom dynamic background.
const SCENES = [
  { name: "aurora",   bg: "radial-gradient(at 20% 20%, var(--mesh-b), transparent 55%), radial-gradient(at 80% 80%, var(--mesh-c), transparent 55%), var(--mesh-a)" },
  { name: "sunrise",  bg: "linear-gradient(180deg, var(--mesh-d) 0%, var(--mesh-b) 100%)" },
  { name: "rose",     bg: "radial-gradient(at 50% 0%, var(--accent-soft), transparent 60%), var(--mesh-a)" },
  { name: "horizon",  bg: "linear-gradient(160deg, var(--mesh-c) 0%, var(--mesh-d) 60%, white 100%)" },
  { name: "twilight", bg: "radial-gradient(at 80% 20%, var(--mesh-b), transparent 50%), radial-gradient(at 20% 80%, var(--mesh-c), transparent 50%), var(--mesh-d)" },
  { name: "petal",    bg: "conic-gradient(from 200deg at 50% 50%, var(--mesh-b), var(--mesh-d), var(--mesh-c), var(--mesh-b))" },
];

function sceneFor(i: number) { return SCENES[i % SCENES.length]; }

function durationFor(m: Msg): number {
  // Interactives are paused until the celebrant taps through them.
  if (m.interactive_kind && m.interactive_kind !== "none") return Number.POSITIVE_INFINITY;
  if (m.media_kind === "image") return 4500;
  if (m.media_kind === "video" && m.media_duration_ms) return m.media_duration_ms + 600;
  if (m.media_kind === "audio" && m.media_duration_ms) return m.media_duration_ms + 600;
  if (m.body) return Math.min(8000, Math.max(3800, m.body.length * 90));
  return 4000;
}

export function Player({
  slug, theme, recipientName, messages,
}: {
  slug: string;
  theme: Theme;
  recipientName: string;
  messages: Msg[];
}) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [interactiveReady, setInteractiveReady] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startTsRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  const total = messages.length;
  const current = messages[i];
  const isInteractive = !!current && current.interactive_kind !== "none";
  // Once an interactive has been revealed, give the celebrant ~4.5s to read.
  const dur = !current
    ? 0
    : isInteractive && interactiveReady
      ? 4500
      : durationFor(current);
  const scene = useMemo(() => sceneFor(i), [i]);

  // Reset the interactive lock whenever the slide changes.
  useEffect(() => { setInteractiveReady(false); }, [i]);

  // Auto-advance
  useEffect(() => {
    if (done || !current) return;
    if (paused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    // Interactive slides wait until the celebrant has unlocked them.
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

  if (total === 0) {
    return (
      <main data-theme={theme} className="min-h-[100dvh] grid place-items-center theme-mesh">
        <div className="text-center px-6">
          <p className="serif text-3xl text-ink">No messages yet.</p>
          <Link href={`/c/${slug}/celebrate`} className="btn-outline mt-6 inline-flex">Back</Link>
        </div>
      </main>
    );
  }

  return (
    <main
      data-theme={theme}
      className="fixed inset-0 select-none overflow-hidden"
      style={{ background: scene.bg }}
      onClick={(e) => {
        // Interactive slides absorb the tap so the celebrant can interact.
        if (isInteractive && !interactiveReady) return;
        const x = e.clientX;
        const w = window.innerWidth;
        if (x < w / 3) prev(); else next();
      }}
    >
      {/* Top bar: progress + close */}
      <div className="absolute inset-x-0 top-0 px-3 pt-3 z-30 flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {messages.map((_, idx) => (
            <div key={idx} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white transition-[width] duration-100"
                style={{
                  width: `${idx < i ? 100 : idx === i ? progress * 100 : 0}%`,
                }}
              />
            </div>
          ))}
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

      {/* Slide */}
      {!done ? (
        <Slide
          key={current.id}
          m={current}
          onInteractiveReady={() => setInteractiveReady(true)}
        />
      ) : (
        <EndCard recipientName={recipientName} onReplay={replay} slug={slug} />
      )}

      {/* Edge tap hints */}
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

function Slide({
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

function EndCard({
  recipientName, onReplay, slug,
}: { recipientName: string; onReplay: () => void; slug: string }) {
  return (
    <section className="absolute inset-0 grid place-items-center px-6 fade-in">
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.35em] text-ink/55">That's all of them</p>
        <h2 className="serif text-5xl text-ink mt-4 leading-tight">You are loved, {recipientName.split(" ")[0]}.</h2>
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
