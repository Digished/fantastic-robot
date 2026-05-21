"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export function PreviewButton({ src, label }: { src: string; label: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    audio.src = src;
    audio.currentTime = 0;
    audio.volume = 0.6;
    audio.play().catch(() => {});
    setPlaying(true);
  }

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} onEnded={() => setPlaying(false)} className="hidden" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Stop ${label}` : `Preview ${label}`}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-ink/8 text-ink/60 hover:bg-ink/14 transition"
      >
        {playing ? (
          <Pause className="size-3.5" />
        ) : (
          <Play className="size-3.5 translate-x-px" />
        )}
      </button>
    </>
  );
}
