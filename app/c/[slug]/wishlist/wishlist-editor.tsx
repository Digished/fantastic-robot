"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Check, ExternalLink } from "lucide-react";
import { saveWishlist } from "./actions";
import type { WishlistItem } from "@/lib/validation/schemas";

export function WishlistEditor({ slug, initial }: { slug: string; initial: WishlistItem[] }) {
  const [items, setItems] = useState<WishlistItem[]>(initial);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  function update(i: number, patch: Partial<WishlistItem>) {
    setItems((prev) => prev.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
    setSaved(false);
  }
  function add() {
    setItems((prev) => (prev.length >= 20 ? prev : [...prev, { title: "", url: "" }]));
  }
  function remove(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
    setSaved(false);
  }
  function save() {
    start(async () => {
      const res = await saveWishlist(slug, JSON.stringify(items));
      if (res?.error) { window.alert(res.error); return; }
      setSaved(true);
    });
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="flex-1 space-y-1.5">
            <input
              className="field"
              value={item.title}
              maxLength={120}
              placeholder="What you'd love"
              onChange={(e) => update(i, { title: e.target.value })}
            />
            <input
              className="field text-sm"
              value={item.url ?? ""}
              maxLength={500}
              inputMode="url"
              placeholder="Link (optional)"
              onChange={(e) => update(i, { url: e.target.value })}
            />
          </div>
          <button type="button" onClick={() => remove(i)} className="text-ink/40 hover:text-red-600 p-2 mt-1" aria-label="Remove item">
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      {items.length < 20 && (
        <button type="button" onClick={add} className="btn-outline text-sm py-2 inline-flex items-center gap-1.5">
          <Plus className="size-4" /> Add item
        </button>
      )}
      <div className="pt-2">
        <button type="button" onClick={save} disabled={pending} className="btn-accent shadow-soft py-3 disabled:opacity-60">
          {pending ? "Saving…" : saved ? "Saved" : "Save wishlist"}
        </button>
      </div>
    </div>
  );
}

export function WishlistReadonly({ items }: { items: WishlistItem[] }) {
  if (items.length === 0) return <p className="text-ink/50 text-sm">No wishlist yet.</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-2 text-ink">
          <span className="size-1.5 rounded-full bg-[var(--accent)] shrink-0" />
          {item.url ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 hover:text-[var(--accent)] transition">
              {item.title} <ExternalLink className="size-3.5 text-ink/40" />
            </a>
          ) : (
            <span>{item.title}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
