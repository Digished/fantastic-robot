"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function ShareBar({
  slug, title, recipient, messageCount = 0, daysLeft,
}: {
  slug: string;
  title: string;
  recipient: string;
  messageCount?: number;
  daysLeft?: number;
}) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/c/${slug}`
    : `/c/${slug}`;

  const firstName = recipient.split(" ")[0];

  let shareText: string;
  if (daysLeft !== undefined) {
    if (daysLeft <= 0) {
      shareText = `🎉 It's ${firstName}'s celebration today! Leave them a surprise:\n${url}`;
    } else if (messageCount > 0) {
      shareText = `🎁 ${firstName}'s celebration is in ${daysLeft} day${daysLeft === 1 ? "" : "s"} — ${messageCount} ${messageCount === 1 ? "person has" : "people have"} already left a surprise. Add yours:\n${url}`;
    } else {
      shareText = `🎁 ${firstName}'s celebration is in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Be the first to leave them a surprise:\n${url}`;
    }
  } else {
    shareText = `🎉 ${title}\n\nLeave a message for ${recipient} and contribute if you can:\n${url}`;
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  async function copy() {
    try { await navigator.clipboard.writeText(shareText); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }

  return (
    <div className="mt-4 flex gap-2 fade-up">
      <a href={wa} target="_blank" rel="noreferrer" className="btn-outline flex-1 inline-flex">
        <svg viewBox="0 0 24 24" className="size-4 fill-current"><path d="M20.5 3.5A11 11 0 0 0 3.6 16.7L2 22l5.4-1.5A11 11 0 1 0 20.5 3.5Zm-8.4 17a8.5 8.5 0 0 1-4.4-1.2l-.3-.2-3.2.9.9-3.1-.2-.3a8.5 8.5 0 1 1 7.2 3.9Zm4.7-6.4c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.7.8-.8 1-.2.2-.3.2-.6.1-1.5-.8-2.5-1.4-3.6-3.2-.3-.5.3-.5.8-1.6.1-.2 0-.3 0-.5l-.8-2c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1 2.9 1.2 3.1c.1.2 2.1 3.3 5.2 4.6 1.9.7 2.6.8 3.5.7.6-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.5-.4Z"/></svg>
        WhatsApp
      </a>
      <button onClick={copy} className="btn-outline inline-flex">
        {copied ? <><Check className="size-4" /> Copied</> : <><Copy className="size-4" /> Copy message</>}
      </button>
    </div>
  );
}
