"use client";

import { useActionState, useRef, useState } from "react";
import { postMessage, type PostState } from "./actions";
import { extFromMime, startRecording } from "@/lib/media/recorder";

type Tab = "text" | "audio" | "video" | "image";

export function PostForm({ slug }: { slug: string }) {
  const action = postMessage.bind(null, slug);
  const [state, dispatch] = useActionState<PostState, FormData>(action, {});

  const [tab, setTab] = useState<Tab>("text");
  const [mediaPath, setMediaPath] = useState<string | null>(null);
  const [mediaDurationMs, setMediaDurationMs] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const recRef = useRef<Awaited<ReturnType<typeof startRecording>> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function switchTab(t: Tab) {
    setTab(t);
    setMediaPath(null); setMediaDurationMs(null); setPreview(null);
  }

  async function record(kind: "audio" | "video") {
    setRecording(true);
    try {
      const maxMs = kind === "audio" ? 20_000 : 15_000;
      const r = await startRecording(kind, maxMs);
      recRef.current = r;
      setTimeout(async () => { if (recRef.current === r) await stopAndUpload(kind); }, maxMs + 200);
    } catch {
      setRecording(false);
      alert("Microphone/camera access denied.");
    }
  }

  async function stopAndUpload(kind: "audio" | "video") {
    const r = recRef.current;
    if (!r) return;
    recRef.current = null;
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
    const cleanExt = ["jpg","jpeg","png","webp"].includes(ext) ? (ext as "jpg") : "jpg";
    await uploadBlob(file, "image", cleanExt, null);
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

  return (
    <form action={dispatch} className="mt-8 space-y-5">
      <div className="flex gap-1.5 p-1 glass rounded-full">
        {(["text", "audio", "video", "image"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchTab(t)}
            className={`flex-1 py-2 rounded-full text-xs capitalize transition ${
              tab === t ? "bg-plum text-cream" : "text-plum/70"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "text" && (
        <div className="space-y-1">
          <label className="label">Your message</label>
          <textarea
            name="body"
            maxLength={500}
            className="field min-h-[160px] resize-none font-serif text-xl leading-snug"
            placeholder="Wishing you the most wonderful day…"
          />
        </div>
      )}

      {(tab === "audio" || tab === "video") && (
        <div className="glass rounded-3xl2 p-6 text-center">
          {!preview && !recording && (
            <button type="button" onClick={() => record(tab)} className="btn-accent" disabled={uploading}>
              {uploading ? "Uploading…" : tab === "audio" ? "🎙 Record (≤20s)" : "📹 Record (≤15s)"}
            </button>
          )}
          {recording && (
            <div className="space-y-3">
              <p className="font-serif text-2xl text-terracotta animate-pulse">● Recording</p>
              <button type="button" onClick={() => stopAndUpload(tab)} className="btn-outline">Stop</button>
            </div>
          )}
          {preview && (
            <div className="space-y-3">
              {tab === "audio"
                ? <audio controls src={preview} className="w-full" />
                : <video controls playsInline src={preview} className="w-full rounded-xl" />}
              <button
                type="button"
                onClick={() => { setPreview(null); setMediaPath(null); setMediaDurationMs(null); }}
                className="btn-ghost text-sm"
              >Re-record</button>
            </div>
          )}
        </div>
      )}

      {tab === "image" && (
        <div className="glass rounded-3xl2 p-6 text-center">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => e.target.files?.[0] && pickImage(e.target.files[0])} />
          {!preview && !uploading && (
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-accent">
              📷 Choose a photo
            </button>
          )}
          {uploading && <p className="text-plum">Uploading…</p>}
          {preview && (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="w-full rounded-xl" />
              <button type="button" onClick={() => { setPreview(null); setMediaPath(null); fileRef.current && (fileRef.current.value = ""); }} className="btn-ghost text-sm">
                Pick another
              </button>
            </div>
          )}
        </div>
      )}

      {/* Optional caption on media tabs */}
      {tab !== "text" && (
        <div className="space-y-1">
          <label className="label">Add a few words (optional)</label>
          <textarea name="body" maxLength={500} className="field min-h-[80px] resize-none"
            placeholder="A little note alongside your media…" />
        </div>
      )}

      <input type="hidden" name="mediaKind" value={tab === "text" ? "none" : tab} />
      {mediaPath && <input type="hidden" name="mediaPath" value={mediaPath} />}
      {mediaDurationMs != null && <input type="hidden" name="mediaDurationMs" value={mediaDurationMs} />}

      <div className="pt-3 border-t border-plum/10 space-y-3">
        <div className="space-y-1">
          <label className="label">Your name</label>
          <input name="contributorName" className="field" required maxLength={60} />
        </div>
        <div className="space-y-1">
          <label className="label">Email (optional)</label>
          <input name="contributorEmail" type="email" className="field" />
        </div>
        <label className="flex items-center gap-2 text-sm text-plum/80">
          <input type="checkbox" name="isAnonymous" className="accent-terracotta" />
          Post anonymously
        </label>
      </div>

      {state.error && <p className="text-sm text-terracotta">{state.error}</p>}

      <button
        className="btn-accent w-full py-4 shadow-soft"
        disabled={recording || uploading || (tab !== "text" && !mediaPath)}
      >
        Add to the wall
      </button>
    </form>
  );
}
