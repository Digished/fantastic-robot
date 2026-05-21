"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { eventLabel, type PageDraft } from "@/components/page-editor/types";

function coverUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

function relativeTime(ms: number) {
  const diff = Math.max(0, Date.now() - ms);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function DraftCard({
  draft,
  updatedAt,
}: {
  draft: PageDraft;
  updatedAt: number;
}) {
  const [discarded, setDiscarded] = useState(false);
  const [pending, setPending] = useState(false);
  if (discarded) return null;

  const cover = coverUrl(draft.coverPath);
  const title = draft.title?.trim() || draft.recipientName?.trim() || "Untitled draft";

  async function discard(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Discard this draft? This can't be undone.")) return;
    setPending(true);
    try {
      await fetch("/api/draft", { method: "DELETE" });
      setDiscarded(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <Link
      href="/create"
      data-theme={draft.theme ?? "ivory"}
      className="group relative rounded-3xl2 overflow-hidden bg-white shadow-ring hover:shadow-card transition fade-up"
    >
      <div className="relative aspect-[16/10]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 theme-mesh" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        <span className="absolute top-3 right-3 bg-ink/85 text-white rounded-full px-2.5 py-1 text-[10px] uppercase tracking-widest">
          Draft
        </span>
        <button
          type="button"
          onClick={discard}
          disabled={pending}
          className="absolute top-3 left-3 grid size-7 place-items-center rounded-full bg-white/85 text-ink/60 hover:bg-white hover:text-ink transition disabled:opacity-50"
          aria-label="Discard draft"
        >
          <X className="size-3.5" />
        </button>
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="text-[10px] uppercase tracking-widest text-white/75">
            {eventLabel(draft.eventType)}
          </p>
          <p className="serif text-2xl leading-tight mt-0.5 truncate">{title}</p>
          {draft.recipientName && (
            <p className="text-sm text-white/80">For {draft.recipientName}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm text-[var(--accent)] inline-flex items-center gap-1.5 font-medium">
          <Pencil className="size-3.5" /> Continue editing
        </p>
        <p className="text-xs text-ink/45">Saved {relativeTime(updatedAt)}</p>
      </div>
    </Link>
  );
}

/** Shown only when the user has no published pages AND no saved draft. */
export function EmptyState({ hasPages, hasDraft }: { hasPages: boolean; hasDraft: boolean }) {
  if (hasPages || hasDraft) return null;
  return (
    <div className="sm:col-span-2 card text-center py-12">
      <p className="serif text-3xl text-ink">Nothing here yet.</p>
      <p className="text-ink/55 mt-3 text-sm">Build a beautiful page in two minutes.</p>
      <Link href="/create" className="btn-accent mt-6 inline-flex">
        <Plus className="size-4 mr-1" /> Create your first page
      </Link>
    </div>
  );
}
