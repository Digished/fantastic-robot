"use client";

import { useState } from "react";
import { Lock, MessageCircle, Mic, Video, Image as ImageIcon, Gift, Sparkles, X } from "lucide-react";

export type SealedKind = "message" | "audio" | "video" | "photo" | "surprise" | "gift";
export type SealedItem = { id: string; kind: SealedKind };

const META: Record<SealedKind, { icon: typeof Gift; label: string }> = {
  message: { icon: MessageCircle, label: "Message" },
  audio: { icon: Mic, label: "Voice note" },
  video: { icon: Video, label: "Video" },
  photo: { icon: ImageIcon, label: "Photo" },
  surprise: { icon: Sparkles, label: "Surprise" },
  gift: { icon: Gift, label: "Gift" },
};

/**
 * Sealed items shown as icon cards by type, with the sender's name blurred. The
 * content can't be opened/played until the birthday — tapping any card brings up
 * a popup explaining the wait.
 */
export function SealedItemGrid({
  items,
  revealLabel,
  noun = "surprises",
}: {
  items: SealedItem[];
  revealLabel: string;
  noun?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item) => {
          const { icon: Icon, label } = META[item.kind];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setOpen(true)}
              className="group relative rounded-3xl2 bg-white shadow-ring p-4 flex flex-col items-center gap-3 hover:shadow-card transition text-center"
            >
              <span
                className="size-12 rounded-2xl grid place-items-center"
                style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
              >
                <Icon className="size-6" />
              </span>
              <span className="text-xs font-medium text-ink">{label}</span>
              {/* Blurred sender name — present but unreadable */}
              <span className="h-2.5 w-16 rounded-full bg-ink/15 blur-[3px]" aria-hidden />
              <span className="absolute top-2.5 right-2.5 text-ink/30">
                <Lock className="size-3.5" />
              </span>
            </button>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-5" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl2 shadow-card p-6 text-center pop-in">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-ink/40 hover:text-ink">
              <X className="size-5" />
            </button>
            <span
              className="mx-auto size-16 rounded-full grid place-items-center shadow-glow"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              <Lock className="size-7" />
            </span>
            <h3 className="serif text-2xl text-ink mt-4">Sealed until your day</h3>
            <p className="text-ink/60 text-sm mt-2 leading-relaxed">
              Your friends are filling your page with {noun} — but it all stays a surprise,
              even from you. You&apos;ll be able to open and play every one on{" "}
              <span className="text-ink font-medium">{revealLabel}</span>.
            </p>
            <button onClick={() => setOpen(false)} className="btn-accent shadow-soft w-full mt-6 py-3">
              Can&apos;t wait!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
