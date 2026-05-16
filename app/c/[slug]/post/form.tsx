"use client";

import { useActionState, useRef, useState } from "react";
import { postMessage, type PostState } from "./actions";
import { extFromMime, startRecording } from "@/lib/media/recorder";

type Tab = "text" | "audio" | "video";

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

  async function record(kind: "audio" | "video") {
    setRecording(true);
    try {
      const maxMs = kind === "audio" ? 20_000 : 15_000;
      const r = await startRecording(kind, maxMs);
      recRef.current = r;
      // Auto-stop fallback (in case user doesn't stop manually).
      setTimeout(async () => { if (recRef.current === r) await stopAndUpload(kind); }, maxMs + 200);
    } catch (e) {
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
    const ext = extFromMime(mime);
    const signRes = await fetch("/api/media/sign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, kind, ext }),
    });
    const sign = await signRes.json();
    if (!signRes.ok) {
      setUploading(false);
      alert(sign.error ?? "Upload signing failed.");
      return;
    }
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
    <form action={dispatch} className="mt-6 space-y-5">
      <div className="flex gap-2">
        {(["text", "audio", "video"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-full text-sm capitalize border ${
              tab === t ? "bg-plum text-cream border-plum" : "border-plum/15 text-plum"
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
            className="field min-h-[140px] resize-none"
            placeholder="Wishing you the most wonderful day…"
          />
        </div>
      )}

      {tab !== "text" && (
        <div className="card text-center">
          {!preview && !recording && (
            <button
              type="button"
              onClick={() => record(tab)}
              className="btn-primary"
              disabled={uploading}
            >
              {uploading ? "Uploading…" : tab === "audio" ? "🎙 Record (≤20s)" : "📹 Record (≤15s)"}
            </button>
          )}
          {recording && (
            <div className="space-y-2">
              <p className="text-plum animate-pulse">● Recording…</p>
              <button type="button" onClick={() => stopAndUpload(tab)} className="btn-outline">
                Stop
              </button>
            </div>
          )}
          {preview && (
            <div className="space-y-3">
              {tab === "audio"
                ? <audio controls src={preview} className="w-full" />
                : <video controls playsInline src={preview} className="w-full rounded-lg" />}
              <button
                type="button"
                onClick={() => { setPreview(null); setMediaPath(null); setMediaDurationMs(null); }}
                className="btn-ghost text-sm"
              >
                Re-record
              </button>
            </div>
          )}
        </div>
      )}

      <input type="hidden" name="mediaKind" value={tab === "text" ? "none" : tab} />
      {mediaPath && <input type="hidden" name="mediaPath" value={mediaPath} />}
      {mediaDurationMs != null && (
        <input type="hidden" name="mediaDurationMs" value={mediaDurationMs} />
      )}

      <div className="pt-3 border-t border-plum/10 space-y-3">
        <div className="space-y-1">
          <label className="label">Your name</label>
          <input name="contributorName" className="field" required maxLength={60} />
        </div>
        <div className="space-y-1">
          <label className="label">Email (optional)</label>
          <input name="contributorEmail" type="email" className="field" />
        </div>
        <label className="flex items-center gap-2 text-sm text-plum">
          <input type="checkbox" name="isAnonymous" />
          Post anonymously
        </label>
      </div>

      {state.error && <p className="text-sm text-terracotta">{state.error}</p>}

      <button
        className="btn-primary w-full py-4"
        disabled={recording || uploading || (tab !== "text" && !mediaPath)}
      >
        Add to the wall
      </button>
    </form>
  );
}
