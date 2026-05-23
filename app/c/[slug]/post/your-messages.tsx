"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, X, Loader2, Mic, Video, Image as ImageIcon, Sparkles } from "lucide-react";
import { editOwnMessage, deleteOwnMessage } from "./actions";
import { readContributorId } from "@/lib/contributor-id";

export type OwnMessage = {
  id: string;
  body: string | null;
  media_kind: "none" | "audio" | "video" | "image";
  interactive_kind: string;
  created_at: string;
};

const MEDIA_LABEL: Record<string, { icon: React.ComponentType<{ className?: string }>; text: string }> = {
  audio: { icon: Mic, text: "Voice note" },
  video: { icon: Video, text: "Video" },
  image: { icon: ImageIcon, text: "Photo" },
};

function MessageCard({
  slug,
  message,
  sessionId,
  onDeleted,
  onSaved,
}: {
  slug: string;
  message: OwnMessage;
  sessionId: string;
  onDeleted: (id: string) => void;
  onSaved: (id: string, body: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(message.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const media = message.media_kind !== "none" ? MEDIA_LABEL[message.media_kind] : null;
  const hasSurprise = message.interactive_kind && message.interactive_kind !== "none";

  async function save() {
    setBusy(true); setError(null);
    const fd = new FormData();
    fd.set("body", body);
    fd.set("contributorSessionId", sessionId);
    const res = await editOwnMessage(slug, message.id, {}, fd);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    onSaved(message.id, body);
    setEditing(false);
  }

  async function remove() {
    if (!confirm("Delete this message? This can't be undone.")) return;
    setBusy(true); setError(null);
    const res = await deleteOwnMessage(message.id, sessionId);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    onDeleted(message.id);
  }

  return (
    <div className="rounded-3xl2 bg-white shadow-ring p-4">
      {(media || hasSurprise) && (
        <div className="flex flex-wrap gap-2 mb-2.5">
          {media && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-[var(--accent)] bg-[var(--accent-soft)] rounded-full px-2.5 py-1">
              <media.icon className="size-3" /> {media.text}
            </span>
          )}
          {hasSurprise && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-[var(--accent)] bg-[var(--accent-soft)] rounded-full px-2.5 py-1">
              <Sparkles className="size-3" /> Surprise
            </span>
          )}
        </div>
      )}

      {editing ? (
        <>
          <textarea
            className="field min-h-[110px] resize-none serif text-lg"
            maxLength={500}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={media ? "Add a caption (optional)" : "Your message"}
          />
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={() => { setEditing(false); setBody(message.body ?? ""); }} className="btn-outline flex-1 py-2" disabled={busy}>
              Cancel
            </button>
            <button onClick={save} className="btn-accent flex-1 py-2 inline-flex items-center justify-center gap-1.5" disabled={busy}>
              {busy ? <><Loader2 className="size-4 animate-spin" /> Saving</> : "Save"}
            </button>
          </div>
        </>
      ) : (
        <>
          {message.body ? (
            <p className="serif text-lg text-ink whitespace-pre-wrap">{message.body}</p>
          ) : (
            <p className="text-ink/40 text-sm italic">No caption</p>
          )}
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          <div className="mt-3 flex items-center gap-3">
            <button onClick={() => setEditing(true)} className="text-sm text-ink/55 hover:text-ink inline-flex items-center gap-1.5" disabled={busy}>
              <Pencil className="size-3.5" /> Edit
            </button>
            <button onClick={remove} className="text-sm text-ink/45 hover:text-red-600 inline-flex items-center gap-1.5" disabled={busy}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function YourMessages({ slug, initial }: { slug: string; initial: OwnMessage[] }) {
  const [messages, setMessages] = useState<OwnMessage[]>(initial);
  const [sessionId, setSessionId] = useState("");

  // The session id lives in a cookie; only the device that posted can edit.
  useEffect(() => { setSessionId(readContributorId()); }, []);

  if (messages.length === 0) return null;

  return (
    <section className="mt-8 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="serif text-2xl text-ink">Your message{messages.length > 1 ? "s" : ""}</h2>
        <span className="text-xs text-ink/45">Only you can see this here</span>
      </div>
      {!sessionId && (
        <p className="text-xs text-ink/45">Open this on the same device you posted from to edit.</p>
      )}
      {messages.map((m) => (
        <MessageCard
          key={m.id}
          slug={slug}
          message={m}
          sessionId={sessionId}
          onDeleted={(id) => setMessages((prev) => prev.filter((x) => x.id !== id))}
          onSaved={(id, body) => setMessages((prev) => prev.map((x) => (x.id === id ? { ...x, body } : x)))}
        />
      ))}
    </section>
  );
}
