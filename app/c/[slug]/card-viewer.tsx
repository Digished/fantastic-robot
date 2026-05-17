"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Mic, Trash2, X } from "lucide-react";
import type { Message } from "./wall-grid";
import { deleteMessageAction } from "./actions";
import { Interactive } from "@/components/interactives";

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

export function CardViewer({
  messages, startIndex, slug, isCreator, onClose,
}: {
  messages: Message[];
  startIndex: number;
  slug: string;
  isCreator: boolean;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx((i) => Math.min(i + 1, messages.length - 1));
      if (e.key === "ArrowLeft")  setIdx((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [messages.length, onClose]);

  const m = messages[idx];
  if (!m) return null;
  const name = m.is_anonymous ? "Someone special" : m.contributor_name;

  async function onDelete() {
    if (!confirm("Remove this card from the wall?")) return;
    setDeleting(true);
    const res = await deleteMessageAction(slug, m.id);
    setDeleting(false);
    if ((res as { error?: string }).error) {
      alert((res as { error?: string }).error);
      return;
    }
    if (messages.length === 1) onClose();
    else setIdx((i) => Math.min(i, messages.length - 2));
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/95 backdrop-blur-2xl fade-in" onClick={onClose}>
      <div className="absolute inset-0 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="relative z-10 px-5 pt-5 flex items-center justify-between text-white">
          <span className="text-[11px] uppercase tracking-[0.3em] text-white/70">
            {idx + 1} / {messages.length}
          </span>
          <div className="flex items-center gap-2">
            {isCreator && (
              <button
                onClick={onDelete}
                disabled={deleting}
                className="glass-dark rounded-full px-3 py-1.5 text-xs text-white inline-flex items-center gap-1.5"
              >
                {deleting ? <><Loader2 className="size-3.5 animate-spin" /> Removing</> : <><Trash2 className="size-3.5" /> Remove</>}
              </button>
            )}
            <button
              onClick={onClose}
              className="glass-dark rounded-full size-9 grid place-items-center text-white"
              aria-label="Close"
            ><X className="size-4" /></button>
          </div>
        </header>

        <div className="relative flex-1 grid place-items-center px-6 py-6 overflow-hidden">
          <article className="w-full max-w-phone fade-up">
            {m.interactive_kind && m.interactive_kind !== "none" ? (
              <Interactive
                kind={m.interactive_kind}
                body={m.body}
                payload={m.interactive_payload}
                authorName={name}
                surface="dark"
              />
            ) : (
              <>
            {m.media_kind === "image" && m.media_path && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={publicUrl(m.media_path)} alt="" className="w-full rounded-2xl shadow-card" />
            )}
            {m.media_kind === "video" && m.media_path && (
              <video src={publicUrl(m.media_path)} controls playsInline autoPlay className="w-full rounded-2xl shadow-card" />
            )}
            {m.media_kind === "audio" && m.media_path && (
              <div className="glass-dark rounded-3xl2 p-8 text-center text-white">
                <Mic className="size-12 mx-auto mb-4 text-[var(--accent)]" />
                <audio src={publicUrl(m.media_path)} controls autoPlay className="w-full" />
              </div>
            )}

            {m.body && (
              <p
                className={`mt-6 text-white serif whitespace-pre-wrap text-center ${
                  m.body.length < 80 ? "text-4xl leading-tight" : "text-2xl leading-snug"
                }`}
              >
                {m.body}
              </p>
            )}

            <p className="mt-8 text-center text-[11px] uppercase tracking-[0.3em] text-white/70">
              — {name}
            </p>
              </>
            )}
          </article>
        </div>

        <div className="relative z-10 px-5 pb-7 flex items-center justify-between">
          <button
            onClick={() => setIdx((i) => Math.max(i - 1, 0))}
            disabled={idx === 0}
            className="glass-dark rounded-full size-12 grid place-items-center text-white disabled:opacity-30"
            aria-label="Previous"
          ><ChevronLeft className="size-5" /></button>
          <button
            onClick={() => setIdx((i) => Math.min(i + 1, messages.length - 1))}
            disabled={idx >= messages.length - 1}
            className="glass-dark rounded-full size-12 grid place-items-center text-white disabled:opacity-30"
            aria-label="Next"
          ><ChevronRight className="size-5" /></button>
        </div>
      </div>
    </div>
  );
}
