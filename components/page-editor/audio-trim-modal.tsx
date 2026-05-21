"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Scissors, X } from "lucide-react";
import type { MusicTrack, TrackClip } from "@/lib/music";
import { Portal } from "@/components/portal";

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const MIN_WINDOW = 3; // seconds
const WAVE_BARS = 64;

/**
 * A clean popup for choosing which section of a track plays. Drag the two
 * handles to set a start and end; the slideshow loops within that window.
 */
export function AudioTrimModal({
  track,
  initialClip,
  onSave,
  onClose,
}: {
  track: MusicTrack;
  initialClip: TrackClip | null;
  onSave: (clip: TrackClip | null) => void;
  onClose: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(initialClip?.startSec ?? 0);
  const [end, setEnd] = useState(initialClip?.endSec ?? 0);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [drag, setDrag] = useState<null | "start" | "end">(null);
  const [peaks, setPeaks] = useState<number[] | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Decode the audio once to draw a real waveform. Falls back silently to a
  // flat bar (peaks stays null) if decoding/CORS fails.
  useEffect(() => {
    let cancelled = false;
    setPeaks(null);
    (async () => {
      try {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        const res = await fetch(track.src);
        const raw = await res.arrayBuffer();
        const ctx = new AC();
        const decoded = await ctx.decodeAudioData(raw);
        ctx.close();
        if (cancelled) return;
        const channel = decoded.getChannelData(0);
        const buckets = WAVE_BARS;
        const block = Math.floor(channel.length / buckets) || 1;
        const out: number[] = [];
        for (let i = 0; i < buckets; i++) {
          let max = 0;
          for (let j = 0; j < block; j++) {
            const v = Math.abs(channel[i * block + j] ?? 0);
            if (v > max) max = v;
          }
          out.push(max);
        }
        const top = Math.max(...out, 0.01);
        setPeaks(out.map((p) => Math.max(0.06, p / top)));
      } catch {
        if (!cancelled) setPeaks(null);
      }
    })();
    return () => { cancelled = true; };
  }, [track.src]);

  function onMeta() {
    const d = audioRef.current?.duration ?? 0;
    setDuration(d);
    setStart((prev) => Math.max(0, Math.min(prev, d - MIN_WINDOW)));
    setEnd((prev) => (prev > 0 ? Math.min(prev, d) : Math.min(d, 30)));
  }

  function onTime() {
    const a = audioRef.current;
    if (!a) return;
    setCursor(a.currentTime);
    if (a.currentTime >= end) {
      a.currentTime = start;
    }
  }

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.currentTime = start;
      a.volume = 0.7;
      a.play().catch(() => {});
      setPlaying(true);
    }
  }

  useEffect(() => {
    if (!drag) return;
    function move(e: PointerEvent) {
      const bar = barRef.current;
      if (!bar || !duration) return;
      const rect = bar.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const t = pct * duration;
      if (drag === "start") setStart(Math.max(0, Math.min(t, end - MIN_WINDOW)));
      else setEnd(Math.min(duration, Math.max(t, start + MIN_WINDOW)));
    }
    function up() { setDrag(null); }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drag, duration, start, end]);

  const startPct = duration ? (start / duration) * 100 : 0;
  const endPct = duration ? (end / duration) * 100 : 100;
  const cursorPct = duration ? (cursor / duration) * 100 : 0;
  const windowLen = Math.max(0, end - start);
  const isFull = !duration || (start <= 0.1 && end >= duration - 0.1);

  return (
    <Portal>
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/60 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={track.src}
        onLoadedMetadata={onMeta}
        onTimeUpdate={onTime}
        onEnded={() => setPlaying(false)}
        preload="auto"
        className="hidden"
      />
      <div className="w-full sm:max-w-lg bg-[#FDFCFB] rounded-t-[28px] sm:rounded-[28px] shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-ink/15" />
        </div>

        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--accent)]/12 text-[var(--accent)]">
              <Scissors className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-ink text-[15px] truncate">{track.label}</p>
              <p className="text-xs text-ink/45">Choose the section that plays</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-7 place-items-center rounded-full bg-ink/8 text-ink/50 hover:bg-ink/14 transition shrink-0"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="px-6 pb-2">
          {/* Timeline */}
          <div className="relative h-20 select-none touch-none">
            <div
              ref={barRef}
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-16 rounded-2xl bg-ink/[0.06] overflow-hidden"
            >
              {/* Waveform */}
              <div className="absolute inset-0 flex items-center gap-px px-1">
                {(peaks ?? Array.from({ length: WAVE_BARS }, () => 0.45)).map((p, idx) => {
                  const barPct = ((idx + 0.5) / WAVE_BARS) * 100;
                  const inWindow = barPct >= startPct && barPct <= endPct;
                  return (
                    <span
                      key={idx}
                      className={`flex-1 rounded-full transition-colors ${
                        inWindow ? "bg-[var(--accent)]" : "bg-ink/20"
                      }`}
                      style={{ height: `${Math.round(p * 100)}%` }}
                    />
                  );
                })}
              </div>
              {/* Dim the unselected ends */}
              <div className="absolute inset-y-0 left-0 bg-white/55 pointer-events-none" style={{ width: `${startPct}%` }} />
              <div className="absolute inset-y-0 right-0 bg-white/55 pointer-events-none" style={{ width: `${100 - endPct}%` }} />
              {/* Selected window outline */}
              <div
                className="absolute inset-y-0 border-x-2 border-[var(--accent)] pointer-events-none"
                style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
              />
              {/* Playhead */}
              {playing && cursor >= start && cursor <= end && (
                <div
                  className="absolute inset-y-0 w-0.5 bg-ink pointer-events-none"
                  style={{ left: `${cursorPct}%` }}
                />
              )}
            </div>

            {/* Start handle */}
            <button
              type="button"
              aria-label="Start"
              onPointerDown={(e) => { e.preventDefault(); setDrag("start"); }}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 grid place-items-center size-7 rounded-full bg-white shadow-card ring-2 ring-[var(--accent)] cursor-grab active:cursor-grabbing"
              style={{ left: `${startPct}%` }}
            >
              <span className="h-3.5 w-0.5 bg-[var(--accent)] rounded" />
            </button>
            {/* End handle */}
            <button
              type="button"
              aria-label="End"
              onPointerDown={(e) => { e.preventDefault(); setDrag("end"); }}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 grid place-items-center size-7 rounded-full bg-white shadow-card ring-2 ring-[var(--accent)] cursor-grab active:cursor-grabbing"
              style={{ left: `${endPct}%` }}
            >
              <span className="h-3.5 w-0.5 bg-[var(--accent)] rounded" />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-ink/55 mt-1">
            <span>{fmt(start)}</span>
            <span className="text-ink/70 font-medium">{fmt(windowLen)} clip</span>
            <span>{fmt(end)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-5">
          <button
            type="button"
            onClick={togglePlay}
            className="grid size-12 shrink-0 place-items-center rounded-full bg-ink text-white hover:opacity-90 transition"
            aria-label={playing ? "Pause preview" : "Play preview"}
          >
            {playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-0.5" />}
          </button>
          <div className="flex-1 flex gap-2">
            {!isFull && (
              <button
                type="button"
                onClick={() => { setStart(0); setEnd(duration); }}
                className="btn-outline flex-1 text-sm"
              >
                Use full track
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                audioRef.current?.pause();
                onSave(isFull ? null : { startSec: start, endSec: end });
              }}
              className="btn-accent flex-1 shadow-soft text-sm"
            >
              Use this section
            </button>
          </div>
        </div>
      </div>
    </div>
    </Portal>
  );
}
