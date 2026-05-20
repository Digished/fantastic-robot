"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Pause, Play, Sparkles, VolumeX } from "lucide-react";
import { Sparkles as SparkleField } from "@/components/sparkles";
import { findTrack, type MusicTrack } from "@/lib/music";
import { CoverEditor } from "./cover-editor";
import { IntroSlidesEditor } from "./intro-slides-editor";
import type { PageDraft } from "./types";

/**
 * Compact slideshow preview — gives the user a feel for what the recipient
 * will see on celebration day without rebuilding the full Player. Theme,
 * cover and music respond live; the gallery thumbnails sit below to show
 * what slides will play.
 */
export function SlideshowPreview({
  draft,
  update,
  tracks,
  onGenerateIntro,
  generatingIntro,
  introError,
}: {
  draft: PageDraft;
  update: (patch: Partial<PageDraft>) => void;
  tracks: MusicTrack[];
  onGenerateIntro: () => Promise<void>;
  generatingIntro: boolean;
  introError: string | null;
}) {
  const firstName = draft.recipientName.split(" ")[0] || "Them";
  const track: MusicTrack | null = findTrack(draft.backgroundMusic, tracks);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(false);
    audioRef.current?.pause();
  }, [track?.id]);

  function togglePlay() {
    const a = audioRef.current;
    if (!a || !track) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.src = track.src;
      a.currentTime = 0;
      a.volume = 0.6;
      a.play().catch(() => {});
      setPlaying(true);
    }
  }

  return (
    <div className="min-h-full" data-theme={draft.theme}>
      <div className="mx-auto w-full max-w-3xl px-4 md:px-10 pt-2 pb-10">
        <p className="text-center text-[11px] uppercase tracking-[0.3em] text-ink/45">
          What {firstName} sees on the day
        </p>

        {/* Hero stage — mimics the slideshow opening */}
        <div className="relative mt-4 rounded-3xl2 overflow-hidden shadow-card aspect-[3/4] sm:aspect-[4/5]">
          <CoverEditor
            src={draft.coverPreview}
            onUploaded={({ path, previewUrl }) =>
              update({ coverPath: path, coverPreview: previewUrl })
            }
            aspectClass="absolute inset-0 w-full h-full"
            className="rounded-none"
            emptyLabel={`Add a photo of ${firstName}`}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/85 pointer-events-none" />
          <SparkleField count={6} />

          {/* Bottom captions — mock preview, faded */}
          <div className="absolute inset-x-0 bottom-0 p-6 text-white pointer-events-none select-none opacity-60">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">
              <Sparkles className="size-3 inline -mt-0.5" /> Tap to play
            </p>
            <h2 className="serif text-4xl mt-2 leading-tight">
              For you, {firstName}.
            </h2>
            <p className="text-white/65 text-sm mt-2">
              {draft.gallery.length > 0
                ? `${draft.gallery.length} slide${draft.gallery.length > 1 ? "s" : ""} of memories`
                : "Cover · slideshow opens here"}
            </p>
          </div>
        </div>

        {/* Music row */}
        <div className="mt-4 rounded-2xl bg-white shadow-ring p-4 flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink/6 text-ink/55">
            {track ? <Music className="size-4" /> : <VolumeX className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink truncate">
              {track ? track.label : "Silent slideshow"}
            </p>
            <p className="text-xs text-ink/50 truncate">
              {track ? track.mood : "Pick a track in the toolbar above"}
            </p>
          </div>
          {track && (
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Stop preview" : "Play preview"}
              className="grid size-10 place-items-center rounded-full bg-ink text-white hover:opacity-90 transition"
            >
              {playing ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4 translate-x-px" />
              )}
            </button>
          )}
        </div>

        {/* Editable AI intro slides */}
        <div className="mt-6">
          <IntroSlidesEditor
            draft={draft}
            update={update}
            onGenerate={onGenerateIntro}
            generating={generatingIntro}
            error={introError}
          />
        </div>

        {/* Gallery thumbnails — purely visual reminder of what plays */}
        {draft.gallery.length > 0 && (
          <div className="mt-6">
            <p className="text-[10px] uppercase tracking-widest text-ink/40 mb-2">
              Gallery slides
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {draft.gallery.map((g, idx) => (
                <div
                  key={`${g.path}-${idx}`}
                  className="aspect-square rounded-xl overflow-hidden bg-ink/5"
                >
                  {g.kind === "video" ? (
                    <div className="size-full bg-ink/80" />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={g.preview} alt="" className="size-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio ref={audioRef} onEnded={() => setPlaying(false)} className="hidden" />
      </div>
    </div>
  );
}
