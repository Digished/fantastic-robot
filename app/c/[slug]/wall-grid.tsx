"use client";

import { useEffect, useState } from "react";
import { Play, Mic, Sparkles } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { CardViewer } from "./card-viewer";
import { INTERACTIVE_OPTIONS, type InteractiveKind } from "@/components/interactives";

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
  created_at: string;
};

const TINTS = ["tint-1", "tint-2", "tint-3", "tint-4", "tint-5"];
const ROTS  = ["polaroid--a", "polaroid--b", "polaroid--c", "polaroid--d", "polaroid--e"];

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

  if (messages.length === 0) {
    return (
      <div className="card mt-4 text-center">
        <p className="serif text-2xl text-ink">A wall waiting to be filled.</p>
        <p className="text-ink/55 mt-1 text-sm">Be the first to drop a card 💌</p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-5 columns-2 gap-3 [column-fill:_balance]">
        {messages.map((m, i) => (
          <button
            key={m.id}
            onClick={() => setOpenIdx(i)}
            className={`polaroid ${ROTS[i % ROTS.length]} ${TINTS[i % TINTS.length]} mb-3 w-full text-left break-inside-avoid fade-up`}
            style={{ animationDelay: `${Math.min(i, 12) * 0.04}s` }}
          >
            <CardPreview m={m} />
          </button>
        ))}
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
    </>
  );
}

function CardPreview({ m }: { m: Message }) {
  const name = m.is_anonymous ? "Someone special" : m.contributor_name;
  const interactive = m.interactive_kind && m.interactive_kind !== "none"
    ? INTERACTIVE_OPTIONS.find((o) => o.id === m.interactive_kind)
    : null;

  return (
    <>
      {interactive && (
        <div className="w-full aspect-[3/2] rounded-md grid place-items-center text-center px-3"
             style={{ background: "linear-gradient(160deg, var(--accent-soft) 0%, white 100%)" }}>
          <div>
            <span className="text-3xl block">{interactive.glyph}</span>
            <span className="mt-1 text-[10px] uppercase tracking-widest text-[var(--accent)] inline-flex items-center gap-1">
              <Sparkles className="size-3" /> {interactive.caption}
            </span>
          </div>
        </div>
      )}
      {!interactive && m.media_kind === "image" && m.media_path && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={publicUrl(m.media_path)} alt="" className="w-full rounded-md aspect-square object-cover" />
      )}
      {!interactive && m.media_kind === "video" && m.media_path && (
        <div className="relative w-full aspect-[3/4] rounded-md overflow-hidden bg-ink/10">
          <video src={publicUrl(m.media_path)} muted playsInline className="size-full object-cover" />
          <div className="absolute inset-0 grid place-items-center">
            <span className="glass rounded-full size-10 grid place-items-center text-ink">
              <Play className="size-4 fill-current" />
            </span>
          </div>
        </div>
      )}
      {!interactive && m.media_kind === "audio" && (
        <div className="w-full aspect-[3/2] rounded-md grid place-items-center bg-white/50 text-[var(--accent)]">
          <Mic className="size-7" />
        </div>
      )}
      {!interactive && m.body && (
        <p className={`mt-3 text-ink leading-snug whitespace-pre-wrap ${m.body.length < 60 ? "serif text-xl" : "text-sm"}`}>
          {m.body}
        </p>
      )}
      <p className="mt-3 text-[10px] uppercase tracking-widest text-ink/55">— {name}</p>
    </>
  );
}

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}
