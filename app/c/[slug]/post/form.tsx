"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Type, Mic, Video, Image as ImageIcon, Upload, Square, RotateCcw, Loader2 } from "lucide-react";
import { postMessage, type PostState } from "./actions";
import { extFromMime, startRecording } from "@/lib/media/recorder";

type Tab = "text" | "audio" | "video" | "image";

const TABS: { id: Tab; label: string; Icon: typeof Type }[] = [
  { id: "text",  label: "Text",  Icon: Type },
  { id: "audio", label: "Voice", Icon: Mic },
  { id: "video", label: "Video", Icon: Video },
  { id: "image", label: "Photo", Icon: ImageIcon },
];

export function PostForm({ slug }: { slug: string }) {
  const action = postMessage.bind(null, slug);
  const [state, dispatch] = useActionState<PostState, FormData>(action, {});

  const [tab, setTab] = useState<Tab>("text");
  const [mediaPath, setMediaPath] = useState<string | null>(null);
  const [mediaDurationMs, setMediaDurationMs] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Live recording state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [volume, setVolume] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const recRef = useRef<Awaited<ReturnType<typeof startRecording>> | null>(null);
  const videoElRef = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  const fileRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  function switchTab(t: Tab) {
    setTab(t);
    setMediaPath(null); setMediaDurationMs(null); setPreview(null);
  }

  // Attach stream to <video> for live camera preview.
  useEffect(() => {
    if (stream && videoElRef.current && tab === "video") {
      videoElRef.current.srcObject = stream;
    }
  }, [stream, tab]);

  // Audio level meter
  useEffect(() => {
    if (!stream || tab !== "audio") return;
    const ctx = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    audioCtxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    function tick() {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      setVolume(Math.min(1, Math.sqrt(sum / data.length) * 3));
      rafRef.current = requestAnimationFrame(tick);
    }
    tick();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ctx.close().catch(() => {});
      audioCtxRef.current = null;
    };
  }, [stream, tab]);

  // Elapsed timer
  useEffect(() => {
    if (!recording) { setElapsed(0); return; }
    startedAtRef.current = performance.now();
    const id = setInterval(() => {
      setElapsed(Math.round((performance.now() - startedAtRef.current) / 100) / 10);
    }, 100);
    return () => clearInterval(id);
  }, [recording]);

  async function record(kind: "audio" | "video") {
    setRecording(true);
    try {
      const maxMs = kind === "audio" ? 20_000 : 15_000;
      const r = await startRecording(kind, maxMs);
      recRef.current = r;
      setStream(r.stream);
      setTimeout(() => { if (recRef.current === r) stopAndUpload(kind); }, maxMs + 200);
    } catch {
      setRecording(false);
      alert("Microphone/camera access denied.");
    }
  }

  async function stopAndUpload(kind: "audio" | "video") {
    const r = recRef.current;
    if (!r) return;
    recRef.current = null;
    setStream(null);
    setRecording(false);
    setUploading(true);
    const { blob, durationMs, mime } = await r.stop();
    if (blob.size > 10 * 1024 * 1024) {
      setUploading(false);
      alert("That recording is too large. Try a shorter clip.");
      return;
    }
    await uploadBlob(blob, kind, extFromMime(mime), durationMs);
  }

  async function pickImage(file: File) {
    if (!file.type.startsWith("image/")) { alert("Please choose an image."); return; }
    if (file.size > 8 * 1024 * 1024) { alert("Image must be under 8 MB."); return; }
    setUploading(true);
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const cleanExt = (["jpg","jpeg","png","webp"].includes(ext) ? ext : "jpg") as "jpg";
    await uploadBlob(file, "image", cleanExt, null);
  }

  async function pickAudioOrVideo(file: File, kind: "audio" | "video") {
    if (kind === "audio" && !file.type.startsWith("audio/")) { alert("Please choose an audio file."); return; }
    if (kind === "video" && !file.type.startsWith("video/")) { alert("Please choose a video file."); return; }
    if (file.size > 10 * 1024 * 1024) { alert("File must be under 10 MB."); return; }

    // Check duration before uploading.
    const url = URL.createObjectURL(file);
    const dur = await new Promise<number>((resolve) => {
      const el = document.createElement(kind);
      el.preload = "metadata";
      el.src = url;
      el.onloadedmetadata = () => resolve(Math.round((el.duration || 0) * 1000));
      el.onerror = () => resolve(0);
    });
    const limit = kind === "audio" ? 20_000 : 15_000;
    if (dur > limit + 500) {
      URL.revokeObjectURL(url);
      alert(`${kind === "audio" ? "Audio" : "Video"} must be ${limit / 1000}s or less.`);
      return;
    }

    const guessedExt = (file.name.split(".").pop() ?? (kind === "audio" ? "m4a" : "mp4")).toLowerCase();
    const allowed = kind === "audio" ? ["m4a","mp3","ogg","webm"] : ["mp4","webm","mov"];
    const ext = (allowed.includes(guessedExt) ? guessedExt : (kind === "audio" ? "m4a" : "mp4"));

    setUploading(true);
    await uploadBlob(file, kind, ext, dur);
    URL.revokeObjectURL(url);
  }

  async function uploadBlob(
    blob: Blob, kind: "audio" | "video" | "image",
    ext: string, durationMs: number | null,
  ) {
    const signRes = await fetch("/api/media/sign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, kind, ext }),
    });
    const sign = await signRes.json();
    if (!signRes.ok) { setUploading(false); alert(sign.error ?? "Upload signing failed."); return; }
    const put = await fetch(sign.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": blob.type || "application/octet-stream" },
      body: blob,
    });
    setUploading(false);
    if (!put.ok) { alert("Upload failed."); return; }
    setMediaPath(sign.path);
    setMediaDurationMs(durationMs);
    setPreview(URL.createObjectURL(blob));
  }

  function reset() {
    setPreview(null); setMediaPath(null); setMediaDurationMs(null);
    if (uploadRef.current) uploadRef.current.value = "";
    if (fileRef.current)   fileRef.current.value   = "";
  }

  return (
    <form action={dispatch} className="mt-8 space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-ink/5">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchTab(id)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              tab === id ? "bg-white text-ink shadow-soft" : "text-ink/60"
            }`}
          >
            <Icon className="size-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === "text" && (
        <div className="space-y-1.5">
          <label className="label">Your message</label>
          <textarea
            name="body" maxLength={500}
            className="field min-h-[160px] resize-none serif text-xl leading-snug"
            placeholder="Wishing you the most wonderful day…"
          />
        </div>
      )}

      {(tab === "audio" || tab === "video") && (
        <div className="rounded-3xl2 border border-ink/10 bg-white p-5 text-center">
          {/* Live preview during recording */}
          {recording && tab === "video" && (
            <div className="space-y-3">
              <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-ink">
                <video ref={videoElRef} autoPlay muted playsInline className="size-full object-cover" />
                <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[11px] text-white">
                  <span className="size-2 rounded-full bg-red-500 animate-pulse" /> REC {elapsed.toFixed(1)}s
                </div>
              </div>
              <button type="button" onClick={() => stopAndUpload("video")} className="btn-outline inline-flex">
                <Square className="size-4 fill-current" /> Stop
              </button>
            </div>
          )}
          {recording && tab === "audio" && (
            <div className="space-y-4 py-4">
              <div className="flex items-end justify-center gap-1 h-16">
                {Array.from({ length: 24 }).map((_, i) => {
                  const phase = (i + 1) / 24;
                  const h = Math.max(4, Math.min(60, volume * 60 * (0.4 + Math.abs(0.5 - phase))));
                  return <span key={i} className="w-1.5 rounded-full bg-[var(--accent)] transition-all" style={{ height: h }} />;
                })}
              </div>
              <p className="text-sm text-ink/70">Recording · {elapsed.toFixed(1)}s</p>
              <button type="button" onClick={() => stopAndUpload("audio")} className="btn-outline inline-flex">
                <Square className="size-4 fill-current" /> Stop
              </button>
            </div>
          )}

          {/* Idle: record or upload */}
          {!recording && !preview && (
            <div className="space-y-3">
              <button type="button" onClick={() => record(tab)} className="btn-accent w-full inline-flex" disabled={uploading}>
                {uploading
                  ? <><Loader2 className="size-4 animate-spin" /> Uploading…</>
                  : tab === "audio"
                    ? <><Mic className="size-4" /> Record (≤20s)</>
                    : <><Video className="size-4" /> Record (≤15s)</>}
              </button>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-ink/40">
                <div className="flex-1 h-px bg-ink/10" /> or <div className="flex-1 h-px bg-ink/10" />
              </div>
              <input
                ref={uploadRef}
                type="file"
                accept={tab === "audio" ? "audio/*" : "video/*"}
                className="hidden"
                onChange={(e) => e.target.files?.[0] && pickAudioOrVideo(e.target.files[0], tab)}
              />
              <button type="button" onClick={() => uploadRef.current?.click()}
                className="btn-outline w-full inline-flex" disabled={uploading}>
                <Upload className="size-4" /> Upload from device
              </button>
            </div>
          )}

          {/* Preview after capture */}
          {preview && !recording && (
            <div className="space-y-3">
              {tab === "audio"
                ? <audio controls src={preview} className="w-full" />
                : <video controls playsInline src={preview} className="w-full rounded-xl" />}
              <button type="button" onClick={reset} className="btn-ghost text-sm inline-flex">
                <RotateCcw className="size-4" /> Try again
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "image" && (
        <div className="rounded-3xl2 border border-ink/10 bg-white p-5 text-center">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => e.target.files?.[0] && pickImage(e.target.files[0])} />
          {!preview && !uploading && (
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-accent w-full inline-flex">
              <ImageIcon className="size-4" /> Choose a photo
            </button>
          )}
          {uploading && (
            <p className="text-ink inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Uploading…</p>
          )}
          {preview && !uploading && (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="w-full rounded-xl" />
              <button type="button" onClick={reset} className="btn-ghost text-sm inline-flex">
                <RotateCcw className="size-4" /> Pick another
              </button>
            </div>
          )}
        </div>
      )}

      {tab !== "text" && (
        <div className="space-y-1.5">
          <label className="label">Add a few words (optional)</label>
          <textarea name="body" maxLength={500} className="field min-h-[80px] resize-none"
            placeholder="A little note alongside your media…" />
        </div>
      )}

      <input type="hidden" name="mediaKind" value={tab === "text" ? "none" : tab} />
      {mediaPath && <input type="hidden" name="mediaPath" value={mediaPath} />}
      {mediaDurationMs != null && <input type="hidden" name="mediaDurationMs" value={mediaDurationMs} />}

      <div className="pt-3 border-t border-ink/10 space-y-3">
        <div className="space-y-1.5">
          <label className="label">Your name</label>
          <input name="contributorName" className="field" required maxLength={60} />
        </div>
        <div className="space-y-1.5">
          <label className="label">Email (optional)</label>
          <input name="contributorEmail" type="email" className="field" />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink/80">
          <input type="checkbox" name="isAnonymous" className="accent-[var(--accent)]" />
          Post anonymously
        </label>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        className="btn-accent w-full py-4 shadow-soft"
        disabled={recording || uploading || (tab !== "text" && !mediaPath)}
      >
        Add to the wall
      </button>
    </form>
  );
}
