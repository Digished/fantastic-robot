"use client";

import { useState } from "react";
import {
  Camera,
  Coins,
  Gift,
  Heart,
  MessageCircleHeart,
  Mic,
  Send,
  Sparkles,
  Sparkle,
  X,
} from "lucide-react";
import { Portal } from "@/components/portal";

type Action = "message" | "contribute";

/**
 * The two visitor call-to-action buttons (Leave a message / Contribute) as
 * shown to the creator before the page is live. They don't navigate — tapping
 * either opens a clean explainer of what guests will be able to do, with a
 * little motion to bring the idea to life, and a reminder that the page must
 * be published first.
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
            className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-ink/55 backdrop-blur-sm backdrop-in"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(null); }}
          >
            <div
              className="w-full sm:max-w-md bg-[#FDFCFB] rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden sheet-up"
              role="dialog"
              aria-modal="true"
              aria-labelledby="audience-action-title"
            >
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-ink/15" />
              </div>

              <ExplainerHeader action={open} onClose={() => setOpen(null)} />

              <div className="px-6 pt-5 pb-6 space-y-3">
                {open === "message" ? (
                  <>
                    <h3 id="audience-action-title" className="serif text-2xl text-ink">
                      Guests leave a message
                    </h3>
                    <p className="text-sm text-ink/70 leading-relaxed">
                      Friends and family write heartfelt notes — and can add photos
                      and voice notes — that appear on {firstName}&apos;s wall and play
                      inside the slideshow on the big day.
                    </p>
                    <ul className="space-y-2 pt-1">
                      <Step icon={<MessageCircleHeart className="size-3.5" />}>
                        Tap and type — no sign-up needed
                      </Step>
                      <Step icon={<Camera className="size-3.5" />}>
                        Drop a photo or short clip
                      </Step>
                      <Step icon={<Send className="size-3.5" />}>
                        Lands on {firstName}&apos;s wall instantly
                      </Step>
                    </ul>
                  </>
                ) : (
                  <>
                    <h3 id="audience-action-title" className="serif text-2xl text-ink">
                      Guests send a cash gift
                    </h3>
                    <p className="text-sm text-ink/70 leading-relaxed">
                      Everyone chips in what they like. The whole pot pays out
                      straight to {firstName}&apos;s bank account on the celebration
                      day — no handling cash, no chasing transfers.
                    </p>
                    <ul className="space-y-2 pt-1">
                      <Step icon={<Coins className="size-3.5" />}>
                        Pay with card, transfer, or USSD
                      </Step>
                      <Step icon={<Sparkles className="size-3.5" />}>
                        Add a private note with the gift
                      </Step>
                      <Step icon={<Gift className="size-3.5" />}>
                        Pot lands with {firstName} on the day
                      </Step>
                    </ul>
                  </>
                )}

                <p className="flex items-center gap-2 rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)] font-medium mt-4">
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

function Step({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-sm text-ink/75">
      <span className="grid size-6 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)] shrink-0">
        {icon}
      </span>
      {children}
    </li>
  );
}

/**
 * The illustrated header at the top of the explainer. A central icon pops in,
 * then a little ecosystem of small icons drifts around it — chat bubbles &
 * hearts for messages, coins & sparkles for contributions — so the user
 * instantly sees what kind of action this is.
 */
function ExplainerHeader({ action, onClose }: { action: Action; onClose: () => void }) {
  const isMessage = action === "message";
  return (
    <div className="relative px-6 pt-8 pb-9 text-center theme-mesh overflow-hidden">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 grid size-7 place-items-center rounded-full bg-white/80 text-ink/60 hover:bg-white transition"
        aria-label="Close"
      >
        <X className="size-3.5" />
      </button>

      {/* Floating decorative icons — purely motion, hidden from screen readers. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {isMessage ? (
          <>
            <Floater className="left-[18%] top-[28%] orbit-a text-[var(--accent)]/75">
              <Heart className="size-4 fill-current" />
            </Floater>
            <Floater className="right-[20%] top-[22%] orbit-b text-ink/35">
              <MessageCircleHeart className="size-5" />
            </Floater>
            <Floater className="left-[26%] bottom-[18%] float-y text-ink/30">
              <Camera className="size-4" />
            </Floater>
            <Floater className="right-[24%] bottom-[22%] float-drift text-[var(--accent)]/60">
              <Mic className="size-4" />
            </Floater>
            <Sparkle className="absolute left-[10%] top-[55%] size-3 text-[var(--accent)]/70 sparkle" style={{ animationDelay: "0s" }} />
            <Sparkle className="absolute right-[14%] top-[58%] size-3 text-[var(--accent)]/60 sparkle" style={{ animationDelay: "1.4s" }} />
            <Sparkle className="absolute left-[44%] top-[12%] size-2.5 text-[var(--accent)]/70 sparkle" style={{ animationDelay: "2.6s" }} />
          </>
        ) : (
          <>
            <Floater className="left-[20%] top-[24%] orbit-a text-[var(--accent)]/80">
              <Coins className="size-4" />
            </Floater>
            <Floater className="right-[22%] top-[26%] orbit-b text-ink/35">
              <Gift className="size-5" />
            </Floater>
            <Floater className="left-[28%] bottom-[20%] float-y text-[var(--accent)]/60">
              <Heart className="size-4 fill-current" />
            </Floater>
            <Floater className="right-[26%] bottom-[24%] float-drift text-ink/30">
              <Coins className="size-4" />
            </Floater>
            {/* Coin "rise" stream — small circles drifting upward like coins
                being collected into the gift. */}
            <span className="absolute left-1/2 -translate-x-[28px] bottom-3 size-2 rounded-full bg-[var(--accent)]/70 rise-fade" style={{ animationDelay: "0s" }} />
            <span className="absolute left-1/2 translate-x-[2px] bottom-3 size-1.5 rounded-full bg-[var(--accent)]/60 rise-fade" style={{ animationDelay: "1.1s" }} />
            <span className="absolute left-1/2 translate-x-[22px] bottom-3 size-2 rounded-full bg-[var(--accent)]/65 rise-fade" style={{ animationDelay: "2.2s" }} />
            <Sparkle className="absolute left-[14%] top-[60%] size-3 text-[var(--accent)]/70 sparkle" style={{ animationDelay: ".6s" }} />
            <Sparkle className="absolute right-[16%] top-[18%] size-2.5 text-[var(--accent)]/70 sparkle" style={{ animationDelay: "2s" }} />
          </>
        )}
      </div>

      {/* Soft halo behind the central icon */}
      <span
        aria-hidden
        className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 size-28 rounded-full bg-white/45 blur-2xl"
      />

      <span className="relative mx-auto grid size-16 place-items-center rounded-full bg-white/90 shadow-soft text-[var(--accent)] pop-in">
        {isMessage
          ? <MessageCircleHeart className="size-7" />
          : <Gift className="size-7" />}
      </span>
    </div>
  );
}

function Floater({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span className={`absolute grid place-items-center ${className}`}>
      {children}
    </span>
  );
}
