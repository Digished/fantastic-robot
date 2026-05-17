"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Music, Pause, Play, VolumeX, X } from "lucide-react";
import { MUSIC_TRACKS, musicSrc, musicTrack } from "@/lib/music";

export function MusicPicker({
  name = "backgroundMusic",
  value,
  onChange,
}: {
  name?: string;
  value: string | null;
  onChange: (v: string | null) => void;
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

  function togglePreview(id: string) {
    const audio = audioRef.current;
    if (!audio) return;
    if (previewing === id) {
      audio.pause();
      setPreviewing(null);
      return;
    }
    audio.src = musicSrc(id);
    audio.currentTime = 0;
    audio.volume = 0.6;
    audio.play().catch(() => {});
    setPreviewing(id);
  }

  const selected = value ? musicTrack(value) : null;

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
          className="w-full flex items-center gap-3 rounded-2xl border border-ink/15 px-3.5 py-3 hover:border-ink/30 transition text-left"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink/8 text-ink/60">
            {selected ? <Music className="size-4" /> : <VolumeX className="size-4" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-ink">
              {selected ? selected.label : "No music"}
            </span>
            <span className="block truncate text-xs text-ink/50">
              {selected ? selected.mood : "Silent slideshow"}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-ink/40" />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          style={{ background: "rgba(15,14,13,0.55)" }}
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl flex flex-col max-h-[82vh]">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0 border-b border-ink/8">
              <div>
                <p className="font-semibold text-ink">Background music</p>
                <p className="text-xs text-ink/45 mt-0.5">Plays during the slideshow · pauses on voice notes</p>
              </div>
              <button
                type="button"
                data-no-loading="true"
                onClick={close}
                className="grid size-8 place-items-center rounded-full hover:bg-ink/8 text-ink/50 transition"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4 space-y-2">
              <button
                type="button"
                data-no-loading="true"
                onClick={() => { onChange(null); close(); }}
                className={`w-full flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-left transition ${
                  value === null
                    ? "border-ink bg-ink/5 ring-1 ring-ink"
                    : "border-ink/10 hover:border-ink/30"
                }`}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink/8 text-ink/60">
                  <VolumeX className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">No music</span>
                  <span className="block truncate text-xs text-ink/50">Silent slideshow</span>
                </span>
              </button>

              {MUSIC_TRACKS.map((t) => {
                const isSel = t.id === value;
                const isPlaying = previewing === t.id;
                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 transition ${
                      isSel
                        ? "border-ink bg-ink/5 ring-1 ring-ink"
                        : "border-ink/10 hover:border-ink/30"
                    }`}
                  >
                    <button
                      type="button"
                      data-no-loading="true"
                      onClick={() => togglePreview(t.id)}
                      aria-label={isPlaying ? `Stop ${t.label}` : `Preview ${t.label}`}
                      className="grid size-9 shrink-0 place-items-center rounded-full bg-ink/8 text-ink/70 hover:bg-ink/15 transition"
                    >
                      {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
                    </button>
                    <button
                      type="button"
                      data-no-loading="true"
                      onClick={() => { onChange(t.id); close(); }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="flex items-center gap-1.5">
                        {isSel && <Music className="size-3 shrink-0 text-ink" />}
                        <span className="block truncate text-sm font-medium text-ink">{t.label}</span>
                      </span>
                      <span className="block truncate text-xs text-ink/50">{t.mood}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
