"use client";

import { useState, useTransition } from "react";
import { Image as ImageIcon, Mic, Play, Quote, Trash2 } from "lucide-react";
import { deleteMessageFromEdit } from "./actions";

type Row = {
  id: string;
  contributor_name: string;
  is_anonymous: boolean;
  body: string | null;
  media_kind: "none" | "audio" | "video" | "image";
  media_path: string | null;
  created_at: string;
};

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

export function MessagesManager({
  slug, messages: initial,
}: { slug: string; messages: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, startTransition] = useTransition();

  function remove(id: string) {
    if (!confirm("Remove this card from the wall?")) return;
    startTransition(async () => {
      const res = await deleteMessageFromEdit(slug, id);
      if ("error" in res && res.error) { alert(res.error); return; }
      setRows((prev) => prev.filter((r) => r.id !== id));
    });
  }

  if (!rows.length) {
    return <p className="mt-4 text-ink/60 text-sm">No wall posts yet.</p>;
  }

  return (
    <ul className="mt-4 space-y-3">
      {rows.map((r) => (
        <li key={r.id} className="glass rounded-2xl p-4 flex gap-3 items-start">
          <div className="size-14 shrink-0 rounded-xl bg-ink/5 grid place-items-center overflow-hidden text-ink/55">
            {r.media_kind === "image" && r.media_path && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={publicUrl(r.media_path)} alt="" className="size-full object-cover" />
            )}
            {r.media_kind === "video" && <Play className="size-5 fill-current" />}
            {r.media_kind === "audio" && <Mic className="size-5" />}
            {r.media_kind === "none" && !r.media_path && <Quote className="size-5" />}
            {r.media_kind === "image" && !r.media_path && <ImageIcon className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink/55 uppercase tracking-wide">
              {r.is_anonymous ? "Someone special" : r.contributor_name}
            </p>
            {r.body && <p className="text-ink text-sm mt-1 line-clamp-2">{r.body}</p>}
          </div>
          <button
            onClick={() => remove(r.id)}
            disabled={busy}
            className="text-xs text-[var(--accent)] hover:underline shrink-0 inline-flex items-center gap-1"
          >
            <Trash2 className="size-3.5" /> Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
