"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, Mic, Sparkles, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { CardViewer } from "./card-viewer";
import { INTERACTIVE_OPTIONS, type InteractiveKind } from "@/components/interactives";
import { readContributorId } from "@/lib/contributor-id";
import { deleteOwnMessage, editOwnMessage } from "./post/actions";

export type Message = {
  id: string;
  contributor_name: string;
  is_anonymous: boolean;
  body: string | null;
  media_kind: "none" | "audio" | "video" | "image";
  media_path: string | null;
  media_duration_ms: number | null;
  interactive_kind: InteractiveKind;
  interactive_payload: Record<string, unknown> | null;
  contributor_session_id: string | null;
  created_at: string;
};

const TINTS = ["tint-1", "tint-2", "tint-3", "tint-4", "tint-5"];
const ROTS  = ["polaroid--a", "polaroid--b", "polaroid--c", "polaroid--d", "polaroid--e"];

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

export function WallGrid({
  messages: initial, celebrationId, slug, isCreator,
}: {
  messages: Message[];
  celebrationId: string;
  slug: string;
  isCreator: boolean;
}) {
  const [messages, setMessages] = useState(initial);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [cid, setCid] = useState("");

  useEffect(() => { setCid(readContributorId()); }, []);

  useEffect(() => {
    const sb = supabaseBrowser();
    const channel = sb
      .channel(`wall:${celebrationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `celebration_id=eq.${celebrationId}` },
        (payload) => setMessages((prev) => [payload.new as Message, ...prev]),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `celebration_id=eq.${celebrationId}` },
        (payload) => {
          const updated = payload.new as Message & { deleted_at?: string };
          setMessages((prev) =>
            updated.deleted_at
              ? prev.filter((m) => m.id !== updated.id)
              : prev.map((m) => (m.id === updated.id ? updated : m)),
          );
        },
      )
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [celebrationId]);

  // Split into two columns for predictable mobile 2-up layout.
  const left  = useMemo(() => messages.filter((_, i) => i % 2 === 0), [messages]);
  const right = useMemo(() => messages.filter((_, i) => i % 2 === 1), [messages]);

  if (messages.length === 0) {
    return (
      <div className="card mt-4 text-center">
        <p className="serif text-2xl text-ink">A wall waiting to be filled.</p>
        <p className="text-ink/55 mt-1 text-sm">Be the first to drop a card.</p>
      </div>
    );
  }

  function rotForIndex(i: number) { return ROTS[i % ROTS.length]; }
  function tintForIndex(i: number) { return TINTS[i % TINTS.length]; }

  async function onDelete(m: Message) {
    if (!confirm("Remove your card?")) return;
    const res = await deleteOwnMessage(m.id, cid);
    if (res.error) { alert(res.error); return; }
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
  }

  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Column>
          {left.map((m, i) => (
            <CardButton key={m.id} m={m} index={i * 2}
              own={!!cid && m.contributor_session_id === cid}
              isCreator={isCreator}
              onOpen={() => setOpenIdx(messages.indexOf(m))}
              onEdit={() => setEditing(m)}
              onDelete={() => onDelete(m)}
              rot={rotForIndex(i * 2)}
              tint={tintForIndex(i * 2)}
            />
          ))}
        </Column>
        <Column>
          {right.map((m, i) => (
            <CardButton key={m.id} m={m} index={i * 2 + 1}
              own={!!cid && m.contributor_session_id === cid}
              isCreator={isCreator}
              onOpen={() => setOpenIdx(messages.indexOf(m))}
              onEdit={() => setEditing(m)}
              onDelete={() => onDelete(m)}
              rot={rotForIndex(i * 2 + 1)}
              tint={tintForIndex(i * 2 + 1)}
            />
          ))}
        </Column>
      </div>

      {openIdx !== null && (
        <CardViewer
          messages={messages}
          startIndex={openIdx}
          slug={slug}
          isCreator={isCreator}
          onClose={() => setOpenIdx(null)}
        />
      )}

      {editing && (
        <EditOwnModal
          slug={slug}
          message={editing}
          sessionId={cid}
          onClose={() => setEditing(null)}
          onSaved={(newBody) => {
            setMessages((prev) => prev.map((m) => m.id === editing.id ? { ...m, body: newBody } : m));
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function Column({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

function CardButton({
  m, index, rot, tint, own, isCreator, onOpen, onEdit, onDelete,
}: {
  m: Message; index: number; rot: string; tint: string;
  own: boolean; isCreator: boolean;
  onOpen: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className="relative">
      <button
        onClick={onOpen}
        className={`polaroid ${rot} ${tint} w-full text-left fade-up`}
        style={{ animationDelay: `${Math.min(index, 12) * 0.04}s` }}
      >
        <CardPreview m={m} />
      </button>

      {own && !isCreator && (
        <div className="absolute top-2 right-2 flex gap-1">
          {!(m.interactive_kind && m.interactive_kind !== "none") && (
            <button onClick={onEdit}
              className="size-7 rounded-full glass grid place-items-center text-ink shadow-soft"
              aria-label="Edit your message">
              <Pencil className="size-3.5" />
            </button>
          )}
          <button onClick={onDelete}
            className="size-7 rounded-full glass grid place-items-center text-[var(--accent)] shadow-soft"
            aria-label="Delete your message">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function CardPreview({ m }: { m: Message }) {
  const name = m.is_anonymous ? "Someone special" : m.contributor_name;
  const interactive = m.interactive_kind && m.interactive_kind !== "none"
    ? INTERACTIVE_OPTIONS.find((o) => o.id === m.interactive_kind)
    : null;

  return (
    <>
      {interactive ? (
        <div className="w-full aspect-[3/2] rounded-md grid place-items-center text-center px-3"
             style={{ background: "linear-gradient(160deg, var(--accent-soft) 0%, white 100%)" }}>
          <div>
            <span className="text-3xl block">{interactive.glyph}</span>
            <span className="mt-1 text-[10px] uppercase tracking-widest text-[var(--accent)] inline-flex items-center gap-1">
              <Sparkles className="size-3" /> {interactive.caption}
            </span>
          </div>
        </div>
      ) : (
        <>
          {m.media_kind === "image" && m.media_path && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={publicUrl(m.media_path)} alt="" className="w-full rounded-md aspect-square object-cover" />
          )}
          {m.media_kind === "video" && m.media_path && (
            <div className="relative w-full aspect-[3/4] rounded-md overflow-hidden bg-ink/10">
              <video src={publicUrl(m.media_path)} muted playsInline className="size-full object-cover" />
              <div className="absolute inset-0 grid place-items-center">
                <span className="glass rounded-full size-10 grid place-items-center text-ink">
                  <Play className="size-4 fill-current" />
                </span>
              </div>
            </div>
          )}
          {m.media_kind === "audio" && (
            <div className="w-full aspect-[3/2] rounded-md grid place-items-center bg-white/50 text-[var(--accent)]">
              <Mic className="size-7" />
            </div>
          )}
        </>
      )}
      {m.body && (
        <p className={`mt-3 text-ink leading-snug whitespace-pre-wrap ${m.body.length < 60 ? "serif text-xl" : "text-sm"}`}>
          {m.body}
        </p>
      )}
      <p className="mt-3 text-[10px] uppercase tracking-widest text-ink/55">— {name}</p>
    </>
  );
}

function EditOwnModal({
  slug, message, sessionId, onClose, onSaved,
}: {
  slug: string;
  message: Message;
  sessionId: string;
  onClose: () => void;
  onSaved: (body: string) => void;
}) {
  const [body, setBody] = useState(message.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true); setError(null);
    const fd = new FormData();
    fd.set("body", body);
    fd.set("contributorSessionId", sessionId);
    const res = await editOwnMessage(slug, message.id, {}, fd);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    onSaved(body);
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 grid place-items-end sm:place-items-center px-4" onClick={onClose}>
      <div className="w-full max-w-phone bg-white rounded-3xl2 p-5 shadow-card fade-up"
           onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between">
          <p className="serif text-xl text-ink">Edit your card</p>
          <button onClick={onClose} className="size-8 grid place-items-center rounded-full hover:bg-ink/5">
            <X className="size-4" />
          </button>
        </header>
        <textarea
          className="field mt-4 min-h-[140px] resize-none serif text-lg"
          maxLength={500}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="btn-outline flex-1" disabled={busy}>Cancel</button>
          <button onClick={save} className="btn-accent flex-1 inline-flex" disabled={busy}>
            {busy ? <><Loader2 className="size-4 animate-spin" /> Saving</> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
