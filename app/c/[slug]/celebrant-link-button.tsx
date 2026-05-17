"use client";

import { useState } from "react";
import { Send, Copy, Check, Gift } from "lucide-react";

export function CelebrantLinkButton({
  slug, recipient,
}: { slug: string; recipient: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/c/${slug}/celebrate`
    : `/c/${slug}/celebrate`;
  const text = `${recipient}, your friends made you something 🎁\n${url}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }

  return (
    <div className="mt-3 card bg-[var(--accent-soft)] border border-[var(--accent)]/20 shadow-none">
      <p className="text-[11px] uppercase tracking-widest text-[var(--accent)] flex items-center gap-1.5">
        <Gift className="size-3" /> For the celebrant
      </p>
      <p className="text-ink text-sm mt-1">
        Share this link with {recipient} on their day — they&apos;ll see all their messages, the gallery, and can play their surprise.
      </p>
      <div className="mt-3 flex gap-2">
        <a href={wa} target="_blank" rel="noreferrer" className="btn-accent flex-1 inline-flex">
          <Send className="size-4" /> Send on WhatsApp
        </a>
        <button onClick={copy} className="btn-outline inline-flex">
          {copied ? <><Check className="size-4" /> Copied</> : <><Copy className="size-4" /> Copy</>}
        </button>
      </div>
    </div>
  );
}
