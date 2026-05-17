"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  Type, Mic, Video, Image as ImageIcon, Upload, Square, RotateCcw,
  Loader2, Sparkles, ArrowLeft,
} from "lucide-react";
import { postMessage, type PostState } from "./actions";
import { extFromMime, startRecording } from "@/lib/media/recorder";
import { INTERACTIVE_OPTIONS, Interactive, type InteractiveKind } from "@/components/interactives";
import { getOrCreateContributorId } from "@/lib/contributor-id";

type Mode = "plain" | "surprise";
type MediaTab = "text" | "audio" | "video" | "image";

const MEDIA_TABS: { id: MediaTab; label: string; Icon: typeof Type }[] = [
  { id: "text",  label: "Text",  Icon: Type },
  { id: "audio", label: "Voice", Icon: Mic },
  { id: "video", label: "Video", Icon: Video },
  { id: "image", label: "Photo", Icon: ImageIcon },
];

export function PostForm({ slug, recipientName }: { slug: string; recipientName?: string }) {
  const action = postMessage.bind(null, slug);
  const [state, dispatch] = useActionState<PostState, FormData>(action, {});

  const [mode, setMode] = useState<Mode>("plain");
  const [sessionId, setSessionId] = useState("");

  // Hidden message body (plain or surprise body)
  const [body, setBody] = useState("");

  // Media (shared between plain message OR surprise contents)
  const [mediaTab, setMediaTab] = useState<MediaTab>("text");
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

  const [expanding, setExpanding] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  // Surprise selection
  const [interactiveKind, setInteractiveKind] = useState<InteractiveKind>("gift");
  const [candles, setCandles] = useState<number>(5);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => { setSessionId(getOrCreateContributorId()); }, []);

  async function expandBody() {
    if (!body.trim() || expanding) return;
    setExpanding(true);
    try {
      const res = await fetch("/api/ai/expand-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: body, recipientName }),
      });
      const json = await res.json();
      if (res.ok && json.expanded) setBody(json.expanded.slice(0, 500));
    } finally {
      setExpanding(false);
    }
  }

  function switchMediaTab(t: MediaTab) {
    setMediaTab(t);
    setMediaPath(null); setMediaDurationMs(null); setPreview(null);
  }

  useEffect(() => {
    if (stream && videoElRef.current && mediaTab === "video") {
      videoElRef.current.srcObject = stream;
    }
  }, [stream, mediaTab]);

  useEffect(() => {
    if (!stream || mediaTab !== "audio") return;
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
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
  }, [stream, mediaTab]);

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
    setStream(null); setRecording(false); setUploading(true);
    const { blob, durationMs, mime } = await r.stop();
    if (blob.size > 10 * 1024 * 1024) {
      setUploading(false); alert("That recording is too large. Try a shorter clip."); return;
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
    const url = URL.createObjectURL(file);
    const dur = await new Promise<number>((resolve) => {
      const el = document.createElement(kind);
      el.preload = "metadata"; el.src = url;
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
    const ext = allowed.includes(guessedExt) ? guessedExt : (kind === "audio" ? "m4a" : "mp4");
    setUploading(true);
    await uploadBlob(file, kind, ext, dur);
    URL.revokeObjectURL(url);
  }
  async function uploadBlob(blob: Blob, kind: "audio" | "video" | "image", ext: string, durationMs: number | null) {
    const signRes = await fetch("/api/media/sign-upload", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, kind, ext }),
    });
    const sign = await signRes.json();
    if (!signRes.ok) { setUploading(false); alert(sign.error ?? "Upload signing failed."); return; }
    const put = await fetch(sign.signedUrl, {
      method: "PUT", headers: { "Content-Type": blob.type || "application/octet-stream" }, body: blob,
    });
    setUploading(false);
    if (!put.ok) { alert("Upload failed."); return; }
    setMediaPath(sign.path); setMediaDurationMs(durationMs);
    setPreview(URL.createObjectURL(blob));
  }
  function resetMedia() {
    setPreview(null); setMediaPath(null); setMediaDurationMs(null);
    if (uploadRef.current) uploadRef.current.value = "";
    if (fileRef.current)   fileRef.current.value   = "";
  }

  // Computed
  const effectiveMediaKind = mediaTab === "text" ? "none" : mediaTab;
  const hasContent =
    body.trim().length > 0 ||
    (effectiveMediaKind !== "none" && !!mediaPath);

  const canSubmit =
    !recording && !uploading && hasContent &&
    (mode === "plain" || interactiveKind !== "none");

  return (
    <form action={dispatch} className="mt-8 space-y-5">
      {/* Mode toggle */}
      <div className="flex gap-1 p-1 rounded-2xl bg-ink/5">
        {([
          { id: "plain",    label: "Plain message", Icon: Type },
          { id: "surprise", label: "Surprise",      Icon: Sparkles },
        ] as { id: Mode; label: string; Icon: typeof Type }[]).map(({ id, label, Icon }) => (
          <button key={id} type="button" onClick={() => setMode(id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition ${
              mode === id ? "bg-white text-ink shadow-soft" : "text-ink/60"
            }`}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {/* Surprise picker (mode = surprise) */}
      {mode === "surprise" && (
        <div className="space-y-3">
          <p className="label">Pick a surprise</p>
          <div className="grid grid-cols-2 gap-2">
            {INTERACTIVE_OPTIONS.map((opt) => (
              <button key={opt.id} type="button"
                onClick={() => setInteractiveKind(opt.id)}
                className={`rounded-2xl p-3 text-left transition border ${
                  interactiveKind === opt.id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-ink/10 bg-white"
                }`}
              >
                <span className="text-xl block">{opt.glyph}</span>
                <span className="text-sm font-medium text-ink mt-1.5 block">{opt.label}</span>
                <span className="text-[11px] text-ink/55 mt-0.5 block">{opt.caption}</span>
              </button>
            ))}
          </div>

          {interactiveKind === "cake" && (
            <div className="space-y-1.5 pt-2">
              <label className="label">How many candles?</label>
              <input type="number" className="field" min={1} max={12}
                value={candles}
                onChange={(e) => setCandles(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
            </div>
          )}
        </div>
      )}

      {/* What's inside */}
      <div className="space-y-3">
        <p className="label">
          {mode === "surprise" ? "What's inside?" : "Your message"}
        </p>

        {/* Inner media tabs */}
        <div className="flex gap-1 p-1 rounded-2xl bg-ink/5">
          {MEDIA_TABS.map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => switchMediaTab(id)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                mediaTab === id ? "bg-white text-ink shadow-soft" : "text-ink/60"
              }`}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Text body (always available) */}
        <textarea
          maxLength={500}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={`field resize-none ${mediaTab === "text" ? "serif text-xl min-h-[160px]" : "min-h-[80px]"}`}
          placeholder={
            mode === "surprise"
              ? "The hidden message…"
              : "Write something from the heart…"
          }
        />
        {body.trim().length >= 5 && mediaTab === "text" && (
          <div className="flex items-center justify-between -mt-1">
            <span className="text-[11px] text-ink/35">{body.length}/500</span>
            <button
              type="button"
              onClick={expandBody}
              disabled={expanding}
              className="text-xs text-ink/50 hover:text-ink/75 transition flex items-center gap-1 disabled:opacity-40"
            >
              {expanding ? (
                <><span className="size-3 rounded-full border border-ink/50 border-t-transparent animate-spin" /> Polishing…</>
              ) : (
                <>✦ Make it shine</>
              )}
            </button>
          </div>
        )}

        {/* Audio / video */}
        {(mediaTab === "audio" || mediaTab === "video") && (
          <div className="rounded-3xl2 border border-ink/10 bg-white p-5 text-center">
            {recording && mediaTab === "video" && (
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
            {recording && mediaTab === "audio" && (
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

            {!recording && !preview && (
              <div className="space-y-3">
                <button type="button" onClick={() => record(mediaTab)} className="btn-accent w-full inline-flex" disabled={uploading}>
                  {uploading ? <><Loader2 className="size-4 animate-spin" /> Uploading…</> :
                    mediaTab === "audio"
                      ? <><Mic className="size-4" /> Record (≤20s)</>
                      : <><Video className="size-4" /> Record (≤15s)</>}
                </button>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-ink/40">
                  <div className="flex-1 h-px bg-ink/10" /> or <div className="flex-1 h-px bg-ink/10" />
                </div>
                <input ref={uploadRef} type="file"
                  accept={mediaTab === "audio" ? "audio/*" : "video/*"} className="hidden"
                  onChange={(e) => e.target.files?.[0] && pickAudioOrVideo(e.target.files[0], mediaTab)} />
                <button type="button" onClick={() => uploadRef.current?.click()} className="btn-outline w-full inline-flex" disabled={uploading}>
                  <Upload className="size-4" /> Upload from device
                </button>
              </div>
            )}

            {preview && !recording && (
              <div className="space-y-3">
                {mediaTab === "audio"
                  ? <audio controls src={preview} className="w-full" />
                  : <video controls playsInline src={preview} className="w-full rounded-xl" />}
                <button type="button" onClick={resetMedia} className="btn-ghost text-sm inline-flex">
                  <RotateCcw className="size-4" /> Try again
                </button>
              </div>
            )}
          </div>
        )}

        {mediaTab === "image" && (
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
                <button type="button" onClick={resetMedia} className="btn-ghost text-sm inline-flex">
                  <RotateCcw className="size-4" /> Pick another
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Surprise preview */}
      {mode === "surprise" && hasContent && (
        <>
          <button type="button" onClick={() => setShowPreview((p) => !p)} className="btn-outline w-full inline-flex">
            {showPreview ? <><ArrowLeft className="size-4" /> Hide preview</> : <><Sparkles className="size-4" /> Preview surprise</>}
          </button>
          {showPreview && (
            <div className="relative rounded-3xl2 bg-ink p-6 min-h-[440px] grid place-items-center overflow-hidden">
              <Interactive
                kind={interactiveKind}
                body={body}
                mediaKind={effectiveMediaKind as "none" | "audio" | "video" | "image"}
                mediaPath={mediaPath}
                payload={interactiveKind === "cake" ? { candles } : null}
                authorName="You"
                surface="dark"
              />
            </div>
          )}
        </>
      )}

      {/* Hidden form fields */}
      <input type="hidden" name="body" value={body} />
      <input type="hidden" name="mediaKind" value={effectiveMediaKind} />
      {mediaPath && <input type="hidden" name="mediaPath" value={mediaPath} />}
      {mediaDurationMs != null && <input type="hidden" name="mediaDurationMs" value={mediaDurationMs} />}
      <input type="hidden" name="interactiveKind"
        value={mode === "surprise" ? interactiveKind : "none"} />
      {mode === "surprise" && interactiveKind === "cake" && (
        <input type="hidden" name="interactivePayload" value={JSON.stringify({ candles })} />
      )}
      <input type="hidden" name="contributorSessionId" value={sessionId} />

      {/* Contributor info */}
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

      <button className="btn-accent w-full py-4 shadow-soft" disabled={!canSubmit}>
        Add to the wall
      </button>
    </form>
  );
}
