"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Pause, Play, VolumeX } from "lucide-react";
import { MUSIC_TRACKS, musicSrc } from "@/lib/music";

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

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

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
    audio.play().catch(() => { /* file may be missing in dev */ });
    setPreviewing(id);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="label">Background music</p>
        <p className="text-xs text-ink/45">Plays during the slideshow</p>
      </div>
      <p className="text-xs text-ink/45">
        Pauses automatically while a voice note or video card is playing.
      </p>

      <input type="hidden" name={name} value={value ?? ""} />
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} onEnded={() => setPreviewing(null)} className="hidden" />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          data-no-loading="true"
          onClick={() => onChange(null)}
          aria-pressed={value === null}
          className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-left transition ${
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
                aria-label={isPlaying ? `Stop preview of ${t.label}` : `Preview ${t.label}`}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-ink/8 text-ink/70 hover:bg-ink/15 transition"
              >
                {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
              </button>
              <button
                type="button"
                data-no-loading="true"
                onClick={() => onChange(t.id)}
                aria-pressed={isSel}
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
  );
}
