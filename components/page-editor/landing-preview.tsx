"use client";

import { Gift } from "lucide-react";
import { formatDate } from "@/lib/time";
import { CoverEditor } from "./cover-editor";
import { GalleryEditor } from "./gallery-editor";
import { InlineText } from "./inline-text";
import { eventLabel, type PageDraft } from "./types";

/**
 * Editable preview of the public landing page (/c/[slug]). Click any text
 * to edit; tap the cover to upload a new one. Stats and the wall are mocked
 * to give the user a sense of what visitors will see.
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
              <p className="text-xs text-ink/50 text-center">
                Tap the photo above to upload {firstName}&apos;s cover.
              </p>
            )}
          </div>

          {/* RIGHT: editable content */}
          <div className="space-y-5 mt-4 md:mt-0">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-ink/50 font-medium">
                {eventName} · {niceDate}
              </p>
              <h1 className="serif text-4xl md:text-5xl text-ink mt-3 leading-[0.95]">
                <InlineText
                  value={draft.title}
                  onChange={(v) => update({ title: v })}
                  placeholder="A title for the page"
                  maxLength={80}
                  ariaLabel="Page title"
                />
              </h1>
              <p className="text-ink/55 mt-2">For {draft.recipientName || firstName}</p>
            </div>

            {/* Stats — mock for the editor */}
            <div className="rounded-3xl2 bg-white shadow-ring p-5 grid grid-cols-2 gap-5">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-ink/50">Raised</p>
                <p className="serif text-3xl text-[var(--accent)] mt-1.5">₦0</p>
                <p className="text-xs text-ink/50 mt-1">0 contributors yet</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-ink/50">Closes in</p>
                <p className="serif text-3xl text-ink mt-1.5">—</p>
                <p className="text-xs text-ink/50 mt-1 truncate">when your page goes live</p>
              </div>
            </div>

            {/* Tagline — italic, inline */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink/40 mb-1">Tagline</p>
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
              <p className="text-[10px] uppercase tracking-widest text-ink/40 mb-1">A note from you</p>
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

            {/* Mock CTAs */}
            <div className="flex gap-3 opacity-60 pointer-events-none">
              <span className="btn-accent flex-1 shadow-soft inline-flex items-center justify-center gap-2">
                Leave a message
              </span>
              <span className="btn-outline flex-1 inline-flex items-center justify-center gap-2">
                Contribute
              </span>
            </div>

            <p className="text-[11px] text-ink/40 text-center flex items-center justify-center gap-1.5">
              <Gift className="size-3.5 text-[var(--accent)]" />
              {mode === "create"
                ? "Preview — friends will see these buttons live once you publish."
                : "Preview — this is what visitors see on your page."}
            </p>

            {/* Gallery — managed below */}
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
