"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Eye, Layout, Sparkles } from "lucide-react";
import { MusicPicker } from "@/components/music-picker";
import type { MusicTrack } from "@/lib/music";
import { LandingPreview } from "./landing-preview";
import { PreviewModal } from "./preview-modal";
import { SlideshowPreview } from "./slideshow-preview";
import { ThemePickerButton } from "./theme-picker-button";
import type { PageDraft } from "./types";

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
  onGenerateIntro,
  generatingIntro,
  introError,
  onAddTrack,
}: {
  draft: PageDraft;
  update: (patch: Partial<PageDraft>) => void;
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
  onGenerateIntro: () => Promise<void>;
  generatingIntro: boolean;
  introError: string | null;
  onAddTrack: (track: MusicTrack) => void;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [previewing, setPreviewing] = useState(false);

  // Step 2 should open at the top, not wherever step 1 was scrolled to.
  useEffect(() => { window.scrollTo(0, 0); }, []);

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
              <button
                type="button"
                onClick={confirmViaPreview ? () => setPreviewing(true) : primary.onClick}
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
