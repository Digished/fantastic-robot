"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Music, Pause, Play, VolumeX, X } from "lucide-react";
import type { MusicTrack } from "@/lib/music";

export function MusicPicker({
  name = "backgroundMusic",
  value,
  onChange,
  tracks,
}: {
  name?: string;
  value: string | null;
  onChange: (v: string | null) => void;
  tracks: ReadonlyArray<MusicTrack>;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    audioRef.current?.pause();
    setPreviewing(null);
    setOpen(false);
  }

  function togglePreview(track: MusicTrack) {
    const audio = audioRef.current;
    if (!audio) return;
    if (previewing === track.id) {
      audio.pause();
      setPreviewing(null);
      return;
    }
    audio.src = track.src;
    audio.currentTime = 0;
    audio.volume = 0.6;
    audio.play().catch(() => {});
    setPreviewing(track.id);
  }

  const selected = value ? tracks.find((t) => t.id === value) ?? null : null;

  return (
    <>
      <input type="hidden" name={name} value={value ?? ""} />
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} onEnded={() => setPreviewing(null)} className="hidden" />

      <div className="space-y-1.5">
        <p className="label">Background music</p>
        <button
          type="button"
          data-no-loading="true"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 rounded-2xl border border-ink/15 bg-white px-3.5 py-3 hover:border-ink/30 transition text-left"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink/6 text-ink/50">
            {selected ? <Music className="size-3.5" /> : <VolumeX className="size-3.5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-ink leading-tight">
              {selected ? selected.label : "No music"}
            </span>
            <span className="block truncate text-xs text-ink/45 mt-0.5">
              {selected ? selected.mood : "Silent slideshow"}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-ink/30" />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/50 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="w-full sm:max-w-md bg-[#FDFCFB] rounded-t-[28px] sm:rounded-[28px] shadow-2xl flex flex-col max-h-[80vh] sm:max-h-[70vh]">
            <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
              <div className="w-10 h-1 rounded-full bg-ink/15" />
            </div>

            <div className="flex items-center justify-between px-5 pt-4 pb-3.5 shrink-0">
              <div>
                <p className="font-semibold text-ink text-[15px]">Background music</p>
                <p className="text-xs text-ink/40 mt-0.5">Tap a track to select · play button to preview</p>
              </div>
              <button
                type="button"
                data-no-loading="true"
                onClick={close}
                className="grid size-7 place-items-center rounded-full bg-ink/8 text-ink/50 hover:bg-ink/14 transition"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="h-px bg-ink/8 mx-5 shrink-0" />

            <div className="overflow-y-auto px-5 py-4 space-y-1.5">
              <button
                type="button"
                data-no-loading="true"
                onClick={() => { onChange(null); close(); }}
                className={`w-full flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition ${
                  value === null
                    ? "border-ink/30 bg-ink/5"
                    : "border-ink/10 hover:border-ink/20 hover:bg-ink/3"
                }`}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink/8 text-ink/50">
                  <VolumeX className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink leading-tight">No music</span>
                  <span className="block truncate text-xs text-ink/45 mt-0.5">Silent slideshow</span>
                </span>
                {value === null && <div className="size-2 rounded-full bg-ink/50 shrink-0" />}
              </button>

              {tracks.map((t) => {
                const isSel = t.id === value;
                const isPlaying = previewing === t.id;
                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition ${
                      isSel
                        ? "border-ink/30 bg-ink/5"
                        : "border-ink/10 hover:border-ink/20 hover:bg-ink/3"
                    }`}
                  >
                    <button
                      type="button"
                      data-no-loading="true"
                      onClick={() => togglePreview(t)}
                      aria-label={isPlaying ? `Stop ${t.label}` : `Preview ${t.label}`}
                      className="grid size-8 shrink-0 place-items-center rounded-full bg-ink/8 text-ink/60 hover:bg-ink/14 transition"
                    >
                      {isPlaying
                        ? <Pause className="size-3.5" />
                        : <Play className="size-3.5 translate-x-px" />}
                    </button>
                    <button
                      type="button"
                      data-no-loading="true"
                      onClick={() => { onChange(t.id); close(); }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-sm font-medium text-ink leading-tight">{t.label}</span>
                      <span className="block truncate text-xs text-ink/45 mt-0.5">{t.mood}</span>
                    </button>
                    {isSel && <div className="size-2 rounded-full bg-ink/50 shrink-0" />}
                  </div>
                );
              })}
            </div>

            <div className="h-safe-b sm:hidden shrink-0" />
          </div>
        </div>
      )}
    </>
  );
}
