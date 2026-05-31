"use client";

import { useEffect, useRef, useState } from "react";
import { Music, VolumeX } from "lucide-react";

/**
 * Loops a celebration's background song on the page. Browsers block audio
 * autoplay until the visitor interacts, so we try to start muted->unmuted on
 * first user gesture, and always show a small toggle so anyone can start/stop
 * the music. Honours an optional [startSec, endSec] clip window.
 */
export function BackgroundMusic({
  src,
  startSec = null,
  endSec = null,
}: {
  src: string;
  startSec?: number | null;
  endSec?: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // Keep playback inside the clip window if one is set.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (startSec != null) {
      const onLoaded = () => { try { a.currentTime = startSec; } catch { /* noop */ } };
      a.addEventListener("loadedmetadata", onLoaded);
      const onTime = () => {
        if (endSec != null && a.currentTime >= endSec) a.currentTime = startSec;
      };
      a.addEventListener("timeupdate", onTime);
      return () => {
        a.removeEventListener("loadedmetadata", onLoaded);
        a.removeEventListener("timeupdate", onTime);
      };
    }
  }, [startSec, endSec]);

  // Attempt to start on the visitor's first interaction (autoplay policy).
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    let started = false;
    const tryStart = () => {
      if (started) return;
      a.play().then(() => {
        started = true;
        setPlaying(true);
        cleanup();
      }).catch(() => { /* needs the toggle */ });
    };
    const cleanup = () => {
      window.removeEventListener("pointerdown", tryStart);
      window.removeEventListener("keydown", tryStart);
    };
    // Try immediately (works if not blocked), then on first gesture.
    tryStart();
    window.addEventListener("pointerdown", tryStart);
    window.addEventListener("keydown", tryStart);
    return cleanup;
  }, []);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => undefined);
    else { a.pause(); setPlaying(false); }
  }

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={src} loop preload="auto" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Mute music" : "Play music"}
        className="fixed bottom-4 left-4 z-50 grid size-11 place-items-center rounded-full bg-white/85 backdrop-blur shadow-ring text-ink/70 hover:text-ink transition"
      >
        {playing ? <Music className="size-5 text-[var(--accent)]" /> : <VolumeX className="size-5" />}
      </button>
    </>
  );
}
