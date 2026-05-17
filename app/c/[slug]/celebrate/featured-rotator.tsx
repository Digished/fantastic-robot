"use client";

import { useEffect, useState } from "react";
import type { Message } from "../wall-grid";

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

export function FeaturedRotator({ messages }: { messages: Message[] }) {
  const [i, setI] = useState(0);
  const pool = messages.filter((m) => m.body || (m.media_kind === "image" && m.media_path));
  useEffect(() => {
    if (pool.length < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % pool.length), 5500);
    return () => clearInterval(id);
  }, [pool.length]);
  if (pool.length === 0) return null;

  const m = pool[i % pool.length];
  const name = m.is_anonymous ? "Someone special" : m.contributor_name;

  return (
    <div className="relative h-44">
      <article key={m.id}
        className="absolute inset-0 glass rounded-3xl2 p-5 shadow-card fade-in float-y">
        {m.media_kind === "image" && m.media_path ? (
          <div className="flex gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={publicUrl(m.media_path)} alt=""
                 className="size-20 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0">
              {m.body && <p className="serif text-ink text-lg leading-snug line-clamp-3">{m.body}</p>}
              <p className="mt-3 text-[10px] uppercase tracking-widest text-ink/55">— {name}</p>
            </div>
          </div>
        ) : (
          <>
            <p className="serif text-ink text-xl leading-snug line-clamp-4">{m.body}</p>
            <p className="absolute bottom-4 left-5 text-[10px] uppercase tracking-widest text-ink/55">— {name}</p>
          </>
        )}
      </article>
    </div>
  );
}
