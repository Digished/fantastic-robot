"use client";

import { useState } from "react";

export function ShareBar({
  slug, title, recipient,
}: { slug: string; title: string; recipient: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/c/${slug}`
    : `/c/${slug}`;
  const text = `🎉 ${title}\n\nLeave a message for ${recipient} and contribute if you can:\n${url}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }

  return (
    <div className="mt-4 flex gap-2">
      <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost flex-1 border border-plum/10">
        Share on WhatsApp
      </a>
      <button onClick={copy} className="btn-ghost border border-plum/10">
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
