"use client";

import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { formatDate } from "@/lib/time";
import { AiSuggestButton } from "./ai-suggest-button";
import { CoverEditor } from "./cover-editor";
import { GalleryEditor } from "./gallery-editor";
import { InlineText } from "./inline-text";
import { eventLabel, type PageDraft, type UpdateDraft } from "./types";

const STEPS = [
  { key: "cover", label: "Cover" },
  { key: "title", label: "Title" },
  { key: "note", label: "Note" },
  { key: "gallery", label: "Gallery" },
] as const;

/**
 * Editable landing page, walked through one section at a time. A sub-step bar
 * keeps the creator focused on a single part (cover → title → note → gallery)
 * instead of one long form. Each section still edits the real page values.
 */
export function LandingPreview({
  draft,
  update,
  mode,
}: {
  draft: PageDraft;
  update: UpdateDraft;
  mode: "create" | "edit";
}) {
  const [sub, setSub] = useState(0);
  const firstName = draft.recipientName.split(" ")[0] || "them";
  const eventName = eventLabel(draft.eventType || "birthday");
  const niceDate = draft.celebrationDate
    ? formatDate(new Date(draft.celebrationDate).toISOString())
    : "—";

  const coverDone = !!draft.coverPath;
  const titleDone = draft.title.trim().length >= 2;
  const stepDone = [coverDone, titleDone, true, true];

  return (
    <main className="min-h-full bg-white pb-10" data-theme={draft.theme}>
      <div className="mx-auto w-full max-w-xl px-4 md:px-6 pt-3">
        {/* Sub-step bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {STEPS.map((s, i) => {
            const active = i === sub;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSub(i)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-ink text-white"
                    : "bg-ink/6 text-ink/60 hover:bg-ink/10"
                }`}
              >
                <span
                  className={`grid size-4 place-items-center rounded-full text-[10px] ${
                    active ? "bg-white/25" : stepDone[i] ? "bg-[var(--accent)] text-white" : "bg-ink/15 text-ink/60"
                  }`}
                >
                  {stepDone[i] && !active ? <Check className="size-2.5" /> : i + 1}
                </span>
                {s.label}
              </button>
            );
          })}
        </div>
        <div className="h-1 rounded-full bg-ink/8 mt-2 overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] transition-[width] duration-500 ease-out"
            style={{ width: `${((sub + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Active section — keyed so it re-animates each step */}
        <div key={sub} className="mt-6 fade-up">
          {sub === 0 && (
            <Section title="Cover photo" hint={`The first thing guests see on ${firstName}'s page.`}>
              <div className="mx-auto max-w-xs">
                <CoverEditor
                  src={draft.coverPreview}
                  onUploaded={({ path, previewUrl }) =>
                    update({ coverPath: path, coverPreview: previewUrl })
                  }
                  aspectClass="aspect-[4/5]"
                  className="rounded-3xl2 shadow-card"
                  emptyLabel={`Add a photo of ${firstName}`}
                />
              </div>
              {!coverDone && (
                <p className="text-xs text-ink/40 text-center mt-2">
                  Tap the photo to upload {firstName}&apos;s cover.
                </p>
              )}
            </Section>
          )}

          {sub === 1 && (
            <Section title="Title & tagline" hint="Name the celebration and add a short line under it.">
              <div className="rounded-3xl2 bg-white shadow-ring p-5">
                <p className="text-[10px] uppercase tracking-[0.3em] text-ink/35 font-medium">
                  {eventName} · {niceDate}
                </p>
                <div className="flex items-start justify-between gap-2 mt-3">
                  <h1 className="serif text-4xl text-ink leading-[0.95] flex-1 min-w-0">
                    <InlineText
                      value={draft.title}
                      onChange={(v) => update({ title: v })}
                      placeholder="A title for the page"
                      maxLength={80}
                      ariaLabel="Page title"
                    />
                  </h1>
                  <AiSuggestButton
                    field="title"
                    recipientName={draft.recipientName}
                    eventType={draft.eventType}
                    celebrantDescription={draft.celebrantDescription}
                    current={draft.title}
                    onPick={(v) => update({ title: v })}
                  />
                </div>
                <p className="text-ink/40 mt-2 text-sm">For {draft.recipientName || firstName}</p>

                <div className="border-t border-ink/8 mt-5 pt-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] uppercase tracking-widest text-ink/40">Tagline</p>
                    <AiSuggestButton
                      field="tagline"
                      recipientName={draft.recipientName}
                      eventType={draft.eventType}
                      celebrantDescription={draft.celebrantDescription}
                      current={draft.tagline}
                      onPick={(v) => update({ tagline: v })}
                    />
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
              </div>
            </Section>
          )}

          {sub === 2 && (
            <Section title="A note from you" hint="A personal message shown near the top of the page.">
              <div className="rounded-3xl2 bg-white shadow-ring p-5">
                <div className="flex justify-end mb-1">
                  <AiSuggestButton
                    field="message"
                    recipientName={draft.recipientName}
                    eventType={draft.eventType}
                    celebrantDescription={draft.celebrantDescription}
                    current={draft.messageFromCreator}
                    onPick={(v) => update({ messageFromCreator: v })}
                  />
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
            </Section>
          )}

          {sub === 3 && (
            <div className="rounded-3xl2 bg-white shadow-ring p-5">
              <GalleryEditor
                items={draft.gallery}
                setItems={(next) =>
                  update((prev) => ({
                    gallery: typeof next === "function" ? next(prev.gallery) : next,
                  }))
                }
                recipientFirstName={firstName}
              />
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between mt-8">
          <button
            type="button"
            onClick={() => setSub((s) => Math.max(0, s - 1))}
            disabled={sub === 0}
            className="btn-outline text-sm inline-flex items-center gap-1.5 disabled:opacity-40"
          >
            <ArrowLeft className="size-4" /> Back
          </button>
          {sub < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setSub((s) => Math.min(STEPS.length - 1, s + 1))}
              className="btn-accent shadow-soft text-sm inline-flex items-center gap-1.5"
            >
              Next: {STEPS[sub + 1].label} <ArrowRight className="size-4" />
            </button>
          ) : (
            <span className="text-xs text-ink/45 text-right">
              {mode === "create" ? "Scroll down to preview & publish." : "Save changes up top."}
            </span>
          )}
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="serif text-2xl text-ink">{title}</h2>
        <p className="text-sm text-ink/50 mt-0.5">{hint}</p>
      </div>
      {children}
    </div>
  );
}
