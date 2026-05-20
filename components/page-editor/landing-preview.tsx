"use client";

import { formatDate } from "@/lib/time";
import { CoverEditor } from "./cover-editor";
import { EditHint } from "./edit-hint";
import { GalleryEditor } from "./gallery-editor";
import { InlineText } from "./inline-text";
import { eventLabel, type PageDraft } from "./types";

/**
 * Editable preview of the public landing page. Editable surfaces (title,
 * tagline, message, cover, gallery) sit at full opacity; mock/preview
 * surfaces (date badge, stats card, CTAs, footer notes) sit at low opacity
 * so it's obvious what's editable and what's just illustration.
 */
export function LandingPreview({
  draft,
  update,
  mode,
}: {
  draft: PageDraft;
  update: (patch: Partial<PageDraft>) => void;
  mode: "create" | "edit";
}) {
  const firstName = draft.recipientName.split(" ")[0] || "them";
  const eventName = eventLabel(draft.eventType || "birthday");
  const niceDate = draft.celebrationDate
    ? formatDate(new Date(draft.celebrationDate).toISOString())
    : "—";

  return (
    <main className="min-h-full bg-white pb-6" data-theme={draft.theme}>
      <div className="mx-auto w-full max-w-6xl px-4 md:px-10 pt-2">
        <div className="md:grid md:grid-cols-[2fr_3fr] md:gap-10 md:items-start">
          {/* LEFT: cover + edit-it hint */}
          <div className="md:sticky md:top-4 md:self-start space-y-3">
            <CoverEditor
              src={draft.coverPreview}
              onUploaded={({ path, previewUrl }) =>
                update({ coverPath: path, coverPreview: previewUrl })
              }
              aspectClass="aspect-[4/5]"
              className="rounded-3xl2 shadow-card"
              emptyLabel={`Add a photo of ${firstName}`}
            />
            {!draft.coverPath && (
              <p className="text-xs text-ink/40 text-center">
                Tap the photo above to upload {firstName}&apos;s cover.
              </p>
            )}
          </div>

          {/* RIGHT: editable content */}
          <div className="space-y-5 mt-4 md:mt-0">
            <div>
              {/* Date / event — display only */}
              <p className="text-[10px] uppercase tracking-[0.3em] text-ink/35 font-medium">
                {eventName} · {niceDate}
              </p>
              <div className="flex items-center justify-between gap-2 mt-3">
                <h1 className="serif text-4xl md:text-5xl text-ink leading-[0.95] flex-1 min-w-0">
                  <InlineText
                    value={draft.title}
                    onChange={(v) => update({ title: v })}
                    placeholder="A title for the page"
                    maxLength={80}
                    ariaLabel="Page title"
                  />
                </h1>
                <EditHint label="Title" className="shrink-0" />
              </div>
              <p className="text-ink/35 mt-2 text-sm">
                For {draft.recipientName || firstName}
              </p>
            </div>

            {/* Stats — mock, faded out */}
            <div className="relative">
              <div className="rounded-3xl2 bg-white shadow-ring p-5 grid grid-cols-2 gap-5 opacity-35 pointer-events-none select-none">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-ink/50">Raised</p>
                  <p className="serif text-3xl text-[var(--accent)] mt-1.5">₦0</p>
                  <p className="text-xs text-ink/50 mt-1">0 contributors yet</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-ink/50">Closes in</p>
                  <p className="serif text-3xl text-ink mt-1.5">—</p>
                  <p className="text-xs text-ink/50 mt-1 truncate">once published</p>
                </div>
              </div>
              <span className="absolute top-2 right-3 text-[9px] uppercase tracking-[0.28em] text-ink/40">
                Preview
              </span>
            </div>

            {/* Tagline — italic, inline */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] uppercase tracking-widest text-ink/40">Tagline</p>
                <EditHint />
              </div>
              <p className="serif italic text-ink/80 text-lg leading-snug">
                <InlineText
                  value={draft.tagline}
                  onChange={(v) => update({ tagline: v })}
                  placeholder={`e.g. "We got you, queen ✨"`}
                  maxLength={140}
                  ariaLabel="Tagline"
                />
              </p>
            </div>

            {/* Message from creator — blockquote-style */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] uppercase tracking-widest text-ink/40">A note from you</p>
                <EditHint />
              </div>
              <blockquote className="serif text-ink text-2xl leading-tight italic">
                <InlineText
                  value={draft.messageFromCreator}
                  onChange={(v) => update({ messageFromCreator: v })}
                  placeholder={`Let's spoil ${firstName} this year ❤️`}
                  maxLength={280}
                  multiline
                  ariaLabel="Message from you"
                />
              </blockquote>
            </div>

            {/* Mock CTAs — faded */}
            <div className="flex gap-3 opacity-25 pointer-events-none select-none">
              <span className="btn-accent flex-1 shadow-soft inline-flex items-center justify-center gap-2">
                Leave a message
              </span>
              <span className="btn-outline flex-1 inline-flex items-center justify-center gap-2">
                Contribute
              </span>
            </div>

            <p className="text-[10px] uppercase tracking-[0.28em] text-ink/35 text-center">
              {mode === "create" ? "Preview · live once published" : "Preview · visitor view"}
            </p>

            {/* Gallery — editable, full opacity */}
            <div className="rounded-3xl2 bg-white shadow-ring p-5">
              <GalleryEditor
                items={draft.gallery}
                setItems={(next) => update({ gallery: next })}
                recipientFirstName={firstName}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
