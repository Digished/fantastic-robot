"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Message = {
  id: string;
  contributor_name: string;
  is_anonymous: boolean;
  body: string | null;
  media_kind: "none" | "audio" | "video" | "image";
  media_path: string | null;
  media_duration_ms: number | null;
  created_at: string;
};

const GRADIENTS = [
  "from-terracotta-50 to-cream",
  "from-[#F6E7D8] to-cream",
  "from-[#EFE5DB] to-cream",
  "from-[#FBE7D0] to-cream",
  "from-[#F0DCE3] to-cream",
];

export function WallGrid({
  messages: initial, celebrationId,
}: { messages: Message[]; celebrationId: string }) {
  const [messages, setMessages] = useState(initial);

  useEffect(() => {
    const sb = supabaseBrowser();
    const channel = sb
      .channel(`wall:${celebrationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `celebration_id=eq.${celebrationId}` },
        (payload) => setMessages((prev) => [payload.new as Message, ...prev]),
      )
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [celebrationId]);

  if (messages.length === 0) {
    return (
      <div className="card mt-4 text-center">
        <p className="text-plum/70">Be the first to leave a card 💌</p>
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      {messages.map((m, i) => (
        <Card key={m.id} m={m} gradient={GRADIENTS[i % GRADIENTS.length]} />
      ))}
    </div>
  );
}

function Card({ m, gradient }: { m: Message; gradient: string }) {
  const name = m.is_anonymous ? "Someone special" : m.contributor_name;
  return (
    <article
      className={`rounded-xl2 bg-gradient-to-br ${gradient} p-4 shadow-card break-inside-avoid`}
    >
      {m.media_kind === "audio" && m.media_path && (
        <audio controls className="w-full mb-2" src={publicUrl(m.media_path)} />
      )}
      {m.media_kind === "video" && m.media_path && (
        <video controls playsInline className="w-full rounded-lg mb-2" src={publicUrl(m.media_path)} />
      )}
      {m.body && <p className="text-plum text-sm leading-snug whitespace-pre-wrap">{m.body}</p>}
      <p className="mt-3 text-[11px] uppercase tracking-wide text-plum/50">— {name}</p>
    </article>
  );
}

function publicUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/celebrations/${path}`;
}
