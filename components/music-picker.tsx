"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Music, Pause, Play, Scissors, Upload, VolumeX, X } from "lucide-react";
import {
  buildMusicValue,
  makeUploadedTrack,
  parseMusicValue,
  uploadedTrackId,
  type MusicTrack,
  type TrackClip,
} from "@/lib/music";
import { uploadWithProgress } from "@/lib/upload";
import { AudioTrimModal } from "./page-editor/audio-trim-modal";

function fmtClip(clip: TrackClip): string {
  const f = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  return `${f(clip.startSec)}–${f(clip.endSec)}`;
}

const AUDIO_EXTS = ["mp3", "m4a", "aac", "ogg", "wav"];

export function MusicPicker({
  name = "backgroundMusic",
  value,
  onChange,
  tracks,
  allowUpload = false,
  onAddTrack,
  compact = false,
}: {
  name?: string;
  value: string | null;
  onChange: (v: string | null) => void;
  tracks: ReadonlyArray<MusicTrack>;
  /** When true, shows an "Upload your own song" control inside the picker. */
  allowUpload?: boolean;
  /** Called with the uploaded track so the parent can add it to its list. */
  onAddTrack?: (track: MusicTrack) => void;
  /** Renders just the trigger pill (no "Background music" label above). */
  compact?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [trimming, setTrimming] = useState<MusicTrack | null>(null);

  const { id: selectedId, clip: selectedClip } = parseMusicValue(value);

  function selectTrack(id: string, clip: TrackClip | null) {
    onChange(buildMusicValue(id, clip));
  }

  async function onUploadFile(file: File) {
    setUploadError(null);
    if (!file.type.startsWith("audio/")) {
      setUploadError("Please choose an audio file.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError("Song must be under 15 MB.");
      return;
    }
    const rawExt = (file.name.split(".").pop() ?? "mp3").toLowerCase();
    const ext = AUDIO_EXTS.includes(rawExt) ? rawExt : "mp3";
    setUploading(true);
    setUploadPct(0);
    try {
      const signRes = await fetch("/api/media/sign-music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ext }),
      });
      const sign = await signRes.json();
      if (!signRes.ok) throw new Error(sign.error ?? "Upload failed");
      await uploadWithProgress({
        url: sign.signedUrl,
        file,
        contentType: file.type,
        onProgress: setUploadPct,
      });
      const label = file.name.replace(/\.[^.]+$/, "").slice(0, 60);
      const track = makeUploadedTrack(uploadedTrackId(sign.path), label);
      onAddTrack?.(track);
      onChange(track.id);
      setUploadPct(100);
      // Let them immediately pick the section of their song that plays.
      setTrimming(track);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

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

  const selected = selectedId ? tracks.find((t) => t.id === selectedId) ?? null : null;

  return (
    <>
      <input type="hidden" name={name} value={value ?? ""} />
      {trimming && (
        <AudioTrimModal
          track={trimming}
          initialClip={trimming.id === selectedId ? selectedClip : null}
          onSave={(clip) => { selectTrack(trimming.id, clip); setTrimming(null); }}
          onClose={() => setTrimming(null)}
        />
      )}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} onEnded={() => setPreviewing(null)} className="hidden" />

      {compact ? (
        <button
          type="button"
          data-no-loading="true"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2.5 rounded-2xl border border-ink/15 bg-white px-3 py-2.5 hover:border-ink/30 transition text-left"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink/6 text-ink/50">
            {selected ? <Music className="size-3.5" /> : <VolumeX className="size-3.5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-ink/45 leading-none">
              Music
            </span>
            <span className="block truncate text-sm font-medium text-ink leading-tight mt-0.5">
              {selected ? selected.label : "No music"}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-ink/30" />
        </button>
      ) : (
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
      )}

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

            {allowUpload && (
              <div className="px-5 pt-4 shrink-0">
                <input
                  ref={uploadRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onUploadFile(e.target.files[0])}
                />
                <button
                  type="button"
                  data-no-loading="true"
                  onClick={() => uploadRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--accent)]/35 bg-[var(--accent-soft)]/40 px-3.5 py-3 text-left hover:bg-[var(--accent-soft)]/70 transition disabled:opacity-60"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                    {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink leading-tight">
                      {uploading ? `Uploading… ${uploadPct}%` : "Upload your own song"}
                    </span>
                    <span className="block truncate text-xs text-ink/45 mt-0.5">
                      MP3, M4A, OGG or WAV · up to 15 MB
                    </span>
                  </span>
                </button>
                {uploadError && <p className="text-xs text-red-600 mt-2">{uploadError}</p>}
              </div>
            )}

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
                const isSel = t.id === selectedId;
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
                      onClick={() => { selectTrack(t.id, isSel ? selectedClip : null); }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-sm font-medium text-ink leading-tight">{t.label}</span>
                      <span className="block truncate text-xs text-ink/45 mt-0.5">
                        {isSel && selectedClip ? `Clip ${fmtClip(selectedClip)}` : t.mood}
                      </span>
                    </button>
                    <button
                      type="button"
                      data-no-loading="true"
                      onClick={() => setTrimming(t)}
                      aria-label={`Choose section of ${t.label}`}
                      title="Choose section"
                      className={`grid size-8 shrink-0 place-items-center rounded-full transition ${
                        isSel && selectedClip
                          ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                          : "bg-ink/8 text-ink/55 hover:bg-ink/14"
                      }`}
                    >
                      <Scissors className="size-3.5" />
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
