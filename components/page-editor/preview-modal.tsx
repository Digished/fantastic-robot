"use client";

import { useState } from "react";
import { Gift, Layout, Sparkles, X } from "lucide-react";
import { Player } from "@/app/c/[slug]/celebrate/play/player";
import { findTrack, parseMusicValue, type MusicTrack } from "@/lib/music";
import { formatDate } from "@/lib/time";
import { AudienceActions } from "./audience-actions";
import { eventLabel, type PageDraft } from "./types";

type View = "contributor" | "celebrant";

const FAR_FUTURE = "2999-01-01T00:00:00.000Z";

/**
 * Full-screen preview of the unpublished page. Toggles between the public
 * landing page a contributor sees and the slideshow the recipient gets on
 * the day — both rendered from the live draft, before any payment.
 */
export function PreviewModal({
  draft,
  tracks,
  onClose,
  confirm,
  confirmError,
}: {
  draft: PageDraft;
  tracks: MusicTrack[];
  onClose: () => void;
  confirm?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    submitting?: boolean;
    submittingLabel?: string;
  };
  confirmError?: string | null;
}) {
  const [view, setView] = useState<View>("contributor");

  const track = findTrack(draft.backgroundMusic, tracks);
  const clip = parseMusicValue(draft.backgroundMusic).clip;

  const toggle = (
    <div className="flex items-center gap-1 rounded-full bg-ink/6 p-1">
      <ViewTab active={view === "contributor"} onClick={() => setView("contributor")}>
        <Layout className="size-3.5" /> Contributor
      </ViewTab>
      <ViewTab active={view === "celebrant"} onClick={() => setView("celebrant")}>
        <Sparkles className="size-3.5" /> Celebrant
      </ViewTab>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] bg-white flex flex-col">
      {/* Top bar */}
      <header className="shrink-0 border-b border-ink/8 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 md:px-8 py-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline text-sm py-2 px-3 inline-flex items-center gap-1.5 shrink-0"
            >
              <X className="size-4" />
              <span className="hidden sm:inline">{confirm ? "Back to editing" : "Close"}</span>
            </button>

            {/* Toggle — inline on desktop, own row on mobile */}
            <div className="hidden sm:block sm:mx-auto">{toggle}</div>

            {confirm && (
              <button
                type="button"
                onClick={confirm.onClick}
                disabled={confirm.disabled || confirm.submitting}
                title={confirm.disabled ? "Add a page title and cover photo to publish" : undefined}
                className="btn-accent shadow-soft text-sm py-2 px-3.5 disabled:opacity-60 ml-auto sm:ml-0 shrink-0"
              >
                {confirm.submitting ? (
                  confirm.submittingLabel ?? "Publishing…"
                ) : (
                  <>
                    <span className="sm:hidden">Pay &amp; publish</span>
                    <span className="hidden sm:inline">{confirm.label}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Mobile toggle row */}
          <div className="sm:hidden mt-2.5 flex justify-center">{toggle}</div>
        </div>
        {confirm && (confirmError || confirm.disabled) && (
          <p className="mx-auto max-w-6xl px-4 md:px-8 pb-2 text-xs text-center sm:text-right text-red-600">
            {confirmError ?? "Add a page title and cover photo before publishing."}
          </p>
        )}
      </header>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {view === "contributor" ? (
          <div className="absolute inset-0 overflow-y-auto">
            <ContributorView draft={draft} />
          </div>
        ) : (
          <div className="absolute inset-0">
            <Player
              slug="preview"
              theme={draft.theme}
              musicUrl={track?.src ?? null}
              musicClip={clip}
              recipientName={draft.recipientName || "Your celebrant"}
              eventType={draft.eventType}
              celebrationDate={draft.celebrationDate || FAR_FUTURE}
              celebrationTitle={draft.title || "Your celebration"}
              tagline={draft.tagline || null}
              celebrantDescription={draft.celebrantDescription || null}
              introContent={draft.introContent}
              galleryImages={draft.gallery.map((g) => ({
                path: g.path,
                caption: g.caption,
                kind: g.kind,
              }))}
              messages={[]}
              totalRaisedKobo={0}
              claimableAt={FAR_FUTURE}
              payoutStatus=""
              createdBy={null}
              onExit={onClose}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
        active ? "bg-white text-ink shadow-soft" : "text-ink/55 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/** Read-only render of the public landing page, as a contributor sees it. */
function ContributorView({ draft }: { draft: PageDraft }) {
  const firstName = draft.recipientName.split(" ")[0] || "them";
  const eventName = eventLabel(draft.eventType || "birthday");
  const niceDate = draft.celebrationDate
    ? formatDate(new Date(draft.celebrationDate).toISOString())
    : "soon";

  return (
    <main className="min-h-full bg-white pb-16" data-theme={draft.theme}>
      <div className="mx-auto w-full max-w-6xl px-4 md:px-10 pt-6">
        <div className="md:grid md:grid-cols-[2fr_3fr] md:gap-12 md:items-start">
          {/* Cover */}
          <div className="md:sticky md:top-8 md:self-start">
            <section className="relative rounded-3xl2 overflow-hidden shadow-card">
              <div className="relative aspect-[4/5]">
                {draft.coverPreview ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={draft.coverPreview} alt="" className="absolute inset-0 size-full object-cover" />
                ) : (
                  <div className="absolute inset-0 theme-mesh" />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/25 to-black/80" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-white md:hidden">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/80">
                    {eventName} · {niceDate}
                  </p>
                  <h1 className="serif text-4xl mt-2 leading-[0.95]">{draft.title || "Your celebration"}</h1>
                  <p className="text-white/85 mt-1">For {draft.recipientName || firstName}</p>
                </div>
              </div>
            </section>
          </div>

          {/* Content */}
          <div className="space-y-5 mt-4 md:mt-0">
            <div className="hidden md:block">
              <p className="text-[10px] uppercase tracking-[0.3em] text-ink/50 font-medium">
                {eventName} · {niceDate}
              </p>
              <h1 className="serif text-5xl text-ink mt-3 leading-[0.92]">
                {draft.title || "Your celebration"}
              </h1>
              <p className="text-ink/55 mt-2">For {draft.recipientName || firstName}</p>
            </div>

            {/* Stats — contributor sees count + countdown, never the raised amount */}
            <div className="rounded-3xl2 bg-white shadow-ring p-5 grid grid-cols-2 gap-5">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-ink/50">Contributors</p>
                <p className="serif text-3xl text-ink mt-1.5">0</p>
                <p className="text-xs text-ink/50 mt-1">be the first to send love</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-ink/50">Closes in</p>
                <p className="serif text-3xl text-ink mt-1.5">soon</p>
                <p className="text-xs text-ink/50 mt-1 truncate">to send your gift</p>
              </div>
            </div>

            {draft.tagline && (
              <p className="serif italic text-ink/80 text-lg leading-snug">{draft.tagline}</p>
            )}

            {draft.messageFromCreator && (
              <blockquote className="serif text-ink text-2xl leading-tight italic">
                &ldquo;{draft.messageFromCreator}&rdquo;
              </blockquote>
            )}

            <AudienceActions firstName={firstName} theme={draft.theme} />

            <p className="text-[11px] text-ink/40 text-center flex items-center justify-center gap-1.5">
              <Gift className="size-3.5 text-[var(--accent)]" />
              A cash gift goes straight to {firstName}&apos;s bank on the day.
            </p>

            {draft.gallery.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 pt-2">
                {draft.gallery.slice(0, 6).map((g, idx) => (
                  <div key={`${g.path}-${idx}`} className="aspect-square rounded-2xl overflow-hidden bg-ink/5">
                    {g.kind === "video" ? (
                      <div className="size-full bg-ink/80" />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={g.preview} alt="" className="size-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <section className="pt-2">
              <h2 className="serif text-3xl text-ink mb-1">The wall</h2>
              <p className="text-sm text-ink/50">
                Messages and photos from friends will appear here once your page is live.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
