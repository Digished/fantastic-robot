"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Eye, Home, Layout, Sparkles } from "lucide-react";
import { MusicPicker } from "@/components/music-picker";
import type { MusicTrack } from "@/lib/music";
import { LandingPreview } from "./landing-preview";
import { PreviewModal } from "./preview-modal";
import { SlideshowPreview } from "./slideshow-preview";
import { ThemePickerButton } from "./theme-picker-button";
import type { PageDraft, UpdateDraft } from "./types";

type Tab = "landing" | "slideshow";

/**
 * Step 2 of the editor: a live preview the creator edits in place. Tabs at
 * the top switch between landing-page and slideshow previews. Theme and
 * music live in a sticky toolbar so they affect both previews instantly.
 */
export function DesignStep({
  draft,
  update,
  tracks,
  onBack,
  backLabel,
  primary,
  errorText,
  initialTab = "landing",
  extrasBelow,
  mode,
  confirmViaPreview,
  publishChecklist,
  onGenerateIntro,
  generatingIntro,
  introError,
  onAddTrack,
}: {
  draft: PageDraft;
  update: UpdateDraft;
  tracks: MusicTrack[];
  onBack?: () => void;
  backLabel?: string;
  primary: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    submitting?: boolean;
    submittingLabel?: string;
  };
  errorText?: string | null;
  initialTab?: Tab;
  extrasBelow?: React.ReactNode;
  mode: "create" | "edit";
  /** When set, the primary action runs from inside the preview, so the
   *  creator always sees the page before it's published/paid for. */
  confirmViaPreview?: boolean;
  /** Outstanding requirements before publishing. While non-empty (in
   *  confirmViaPreview mode) the publish button is replaced by a checklist. */
  publishChecklist?: string[];
  onGenerateIntro: () => Promise<void>;
  generatingIntro: boolean;
  introError: string | null;
  onAddTrack: (track: MusicTrack) => void;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [previewing, setPreviewing] = useState(false);

  // Step 2 should open at the top, not wherever step 1 was scrolled to.
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const checklist = publishChecklist ?? [];
  const ready = checklist.length === 0;
  // The primary CTA opens the preview first (so the page is always seen before
  // it's paid for) in create mode, or fires the action directly in edit mode.
  const handlePrimary = confirmViaPreview ? () => setPreviewing(true) : primary.onClick;
  // In create mode the publish button only appears once everything's filled.
  const showPrimary = !confirmViaPreview || ready;

  const tabs = (
    <div className="flex items-center gap-1 rounded-full bg-ink/6 p-1">
      <TabButton active={tab === "landing"} onClick={() => setTab("landing")}>
        <Layout className="size-3.5" /> Landing
      </TabButton>
      <TabButton active={tab === "slideshow"} onClick={() => setTab("slideshow")}>
        <Sparkles className="size-3.5" /> Slideshow
      </TabButton>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-white">
      {previewing && (
        <PreviewModal
          draft={draft}
          tracks={tracks}
          onClose={() => setPreviewing(false)}
          confirm={confirmViaPreview ? primary : undefined}
          confirmError={errorText}
        />
      )}
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-ink/8">
        <div className="mx-auto max-w-6xl px-4 md:px-10 py-3">
          <div className="flex items-center gap-2.5">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="text-sm text-ink/60 hover:text-ink inline-flex items-center gap-1 shrink-0"
              >
                <ArrowLeft className="size-4" />
                <span className="hidden sm:inline">{backLabel ?? "Back"}</span>
              </button>
            ) : (
              <span className="serif text-lg text-ink shrink-0">Spendbox</span>
            )}

            {mode === "create" && (
              <Link
                href="/dashboard"
                title="Saves your progress as a draft"
                className="text-sm text-ink/55 hover:text-ink inline-flex items-center gap-1 shrink-0"
              >
                <Home className="size-4" />
                <span className="hidden sm:inline">Save &amp; exit</span>
              </Link>
            )}

            {/* Tabs — inline on desktop, dropped to their own row on mobile */}
            <div className="hidden sm:block sm:mx-auto">{tabs}</div>

            <div className="ml-auto sm:ml-0 flex items-center gap-2 shrink-0">
              {!confirmViaPreview && (
                <button
                  type="button"
                  onClick={() => setPreviewing(true)}
                  className="btn-outline text-sm py-2.5 px-3 inline-flex items-center gap-1.5"
                >
                  <Eye className="size-4" />
                  <span className="hidden sm:inline">Preview</span>
                </button>
              )}
              {showPrimary ? (
                <button
                  type="button"
                  onClick={handlePrimary}
                  disabled={primary.submitting || (!confirmViaPreview && primary.disabled)}
                  className="btn-accent shadow-soft text-sm py-2.5 px-3.5 disabled:opacity-60 inline-flex items-center gap-1.5"
                >
                  {confirmViaPreview && <Eye className="size-4" />}
                  {primary.submitting
                    ? primary.submittingLabel ?? "Saving…"
                    : confirmViaPreview ? (
                      <>
                        <span className="sm:hidden">Publish</span>
                        <span className="hidden sm:inline">Preview &amp; publish</span>
                      </>
                    ) : primary.label}
                </button>
              ) : (
                <span className="text-xs text-ink/50 inline-flex items-center gap-1.5 rounded-full bg-ink/6 px-3 py-2">
                  {checklist.length} step{checklist.length > 1 ? "s" : ""} to publish
                </span>
              )}
            </div>
          </div>

          {/* Mobile tab row */}
          <div className="sm:hidden mt-2.5 flex justify-center">{tabs}</div>
        </div>

        {/* Style toolbar — compact pills that open popups */}
        <div className="border-t border-ink/8 bg-white/95">
          <div className="mx-auto max-w-6xl px-4 md:px-10 py-2.5 flex flex-wrap items-center gap-2.5">
            <ThemePickerButton value={draft.theme} onChange={(v) => update({ theme: v })} />
            <div className="flex-1 min-w-[180px] max-w-xs">
              <MusicPicker
                compact
                allowUpload
                value={draft.backgroundMusic}
                onChange={(v) => update({ backgroundMusic: v })}
                onAddTrack={onAddTrack}
                tracks={tracks}
              />
            </div>
          </div>
        </div>

        {errorText && (
          <div className="mx-auto max-w-6xl px-4 md:px-10 pb-3">
            <p className="text-sm rounded-xl bg-red-50 text-red-700 px-3 py-2">
              {errorText}
            </p>
          </div>
        )}
      </header>

      {/* Preview */}
      <div className="pt-2">
        {tab === "landing" ? (
          <LandingPreview draft={draft} update={update} mode={mode} />
        ) : (
          <SlideshowPreview
            draft={draft}
            update={update}
            tracks={tracks}
            onGenerateIntro={onGenerateIntro}
            generatingIntro={generatingIntro}
            introError={introError}
          />
        )}
      </div>

      {extrasBelow && (
        <div className="mx-auto max-w-6xl px-4 md:px-10 pb-10">{extrasBelow}</div>
      )}

      {/* Bottom CTA — the same publish action, repeated at the end of the page
          so the creator never has to hunt for it back up top. */}
      {confirmViaPreview && (
        <div className="mx-auto max-w-md px-4 pb-16 pt-2 text-center">
          {ready ? (
            <>
              <button
                type="button"
                onClick={handlePrimary}
                disabled={primary.submitting}
                className="btn-accent shadow-soft w-full py-3.5 inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Eye className="size-4" />
                {primary.submitting ? primary.submittingLabel ?? "Publishing…" : "Preview & publish"}
              </button>
              <p className="text-xs text-ink/45 mt-3">
                This button is also pinned to the top of the screen.
              </p>
            </>
          ) : (
            <div className="rounded-3xl2 bg-white shadow-ring p-5 text-left">
              <p className="font-medium text-ink text-center">Before you publish</p>
              <ul className="mt-4 space-y-2.5">
                {checklist.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-ink/70">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full border border-ink/20 text-ink/30">
                      <Check className="size-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ink/45 mt-4 text-center">
                The Preview &amp; publish button appears here (and up top) once these are done.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
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
        active
          ? "bg-white text-ink shadow-soft"
          : "text-ink/55 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
