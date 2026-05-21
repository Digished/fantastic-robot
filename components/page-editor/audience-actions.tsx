"use client";

import { useState } from "react";
import { Gift, Heart, MessageCircleHeart, Sparkles, X } from "lucide-react";
import { Portal } from "@/components/portal";

type Action = "message" | "contribute";

/**
 * The two visitor call-to-action buttons (Leave a message / Contribute) as
 * shown to the creator before the page is live. They don't navigate — tapping
 * either opens a clean explainer of what guests will be able to do, and a
 * reminder that the page must be published first.
 */
export function AudienceActions({
  firstName,
  theme,
}: {
  firstName: string;
  theme?: string;
}) {
  const [open, setOpen] = useState<Action | null>(null);

  return (
    <>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setOpen("message")}
          className="btn-accent flex-1 shadow-soft inline-flex items-center justify-center gap-2"
        >
          Leave a message
        </button>
        <button
          type="button"
          onClick={() => setOpen("contribute")}
          className="btn-outline flex-1 inline-flex items-center justify-center gap-2"
        >
          Contribute
        </button>
      </div>

      {open && (
        <Portal>
          <div
            data-theme={theme}
            className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center bg-ink/55 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(null); }}
          >
            <div className="w-full sm:max-w-md bg-[#FDFCFB] rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden">
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-ink/15" />
              </div>

              {/* Illustrative header */}
              <div className="relative px-6 pt-7 pb-6 text-center theme-mesh">
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className="absolute top-4 right-4 grid size-7 place-items-center rounded-full bg-white/70 text-ink/60 hover:bg-white transition"
                  aria-label="Close"
                >
                  <X className="size-3.5" />
                </button>
                <span className="mx-auto grid size-16 place-items-center rounded-full bg-white/80 shadow-soft text-[var(--accent)]">
                  {open === "message"
                    ? <MessageCircleHeart className="size-7" />
                    : <Gift className="size-7" />}
                </span>
              </div>

              <div className="px-6 pt-5 pb-6 space-y-3">
                {open === "message" ? (
                  <>
                    <h3 className="serif text-2xl text-ink">Guests leave messages</h3>
                    <p className="text-sm text-ink/70 leading-relaxed">
                      Friends and family write heartfelt notes — and can add photos and
                      voice notes — that appear on {firstName}&apos;s wall and play inside
                      the slideshow on the big day.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="serif text-2xl text-ink">Guests send a cash gift</h3>
                    <p className="text-sm text-ink/70 leading-relaxed">
                      Everyone chips in what they like. The whole pot pays out straight to
                      {" "}{firstName}&apos;s bank account on the celebration day — no
                      handling cash, no chasing transfers.
                    </p>
                  </>
                )}

                <p className="flex items-center gap-2 rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)] font-medium">
                  <Sparkles className="size-4 shrink-0" />
                  Publish your page to open it up for {open === "message" ? "messages" : "contributions"}.
                </p>
              </div>

              <div className="px-6 pb-6 sm:pb-7">
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className="btn-accent w-full shadow-soft inline-flex items-center justify-center gap-2"
                >
                  <Heart className="size-4" /> Got it
                </button>
              </div>
              <div className="h-safe-b sm:hidden" />
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
