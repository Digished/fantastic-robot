"use client";

import { useState } from "react";
import { ArrowLeft, Layout, Sparkles } from "lucide-react";
import { ThemePicker } from "@/components/theme-picker";
import { MusicPicker } from "@/components/music-picker";
import type { MusicTrack } from "@/lib/music";
import { LandingPreview } from "./landing-preview";
import { SlideshowPreview } from "./slideshow-preview";
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
  onGenerateIntro,
  generatingIntro,
  introError,
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
  onGenerateIntro: () => Promise<void>;
  generatingIntro: boolean;
  introError: string | null;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="min-h-[100dvh] bg-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-ink/8">
        <div className="mx-auto max-w-6xl px-4 md:px-10 py-3 flex items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-ink/60 hover:text-ink inline-flex items-center gap-1"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">{backLabel ?? "Back"}</span>
            </button>
          ) : (
            <span className="serif text-lg text-ink">Spendbox</span>
          )}

          {/* Tabs */}
          <div className="mx-auto flex items-center gap-1 rounded-full bg-ink/6 p-1">
            <TabButton active={tab === "landing"} onClick={() => setTab("landing")}>
              <Layout className="size-3.5" /> Landing
            </TabButton>
            <TabButton active={tab === "slideshow"} onClick={() => setTab("slideshow")}>
              <Sparkles className="size-3.5" /> Slideshow
            </TabButton>
          </div>

          <button
            type="button"
            onClick={primary.onClick}
            disabled={primary.disabled || primary.submitting}
            className="btn-accent shadow-soft text-sm py-2.5 px-4 disabled:opacity-60"
          >
            {primary.submitting ? primary.submittingLabel ?? "Saving…" : primary.label}
          </button>
        </div>

        {/* Style toolbar */}
        <div className="border-t border-ink/8 bg-white/95">
          <div className="mx-auto max-w-6xl px-4 md:px-10 py-3 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3 items-end">
            <ThemePicker value={draft.theme} onChange={(v) => update({ theme: v })} />
            <MusicPicker
              value={draft.backgroundMusic}
              onChange={(v) => update({ backgroundMusic: v })}
              tracks={tracks}
            />
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
