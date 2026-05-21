"use client";

import { useRef, useState } from "react";
import { Loader2, Pencil, Plus, RefreshCw, Sparkles, Trash2, Undo2 } from "lucide-react";
import { InlineText } from "./inline-text";
import {
  SLIDE_ACCENTS,
  slideAccentBg,
  type SlideAccent,
} from "@/lib/slide-accents";
import type { IntroContent, PageDraft } from "./types";

type IntroChapter = NonNullable<IntroContent["chapters"]>[number];

/**
 * AI slides as a WYSIWYG deck. Each entry mirrors a real slide layout: a
 * themed card with the recipient's name, the editable headline, and any
 * accompanying subtext. Users tweak copy in place and can regenerate the
 * whole deck from the brief, or add/remove "chapter" slides one by one.
 */
export function IntroSlidesEditor({
  draft,
  update,
  onGenerate,
  generating,
  error,
}: {
  draft: PageDraft;
  update: (patch: Partial<PageDraft>) => void;
  onGenerate: () => Promise<void>;
  generating: boolean;
  error: string | null;
}) {
  const intro = draft.introContent;
  const firstName = draft.recipientName.split(" ")[0] || "them";

  // Undo history for slide edits. Rapid edits (e.g. typing) within a short
  // window collapse into a single undo step so one click rolls back a burst.
  const [history, setHistory] = useState<IntroContent[]>([]);
  const lastPushRef = useRef(0);

  // `coalesce` groups a burst of typing into one undo step; discrete actions
  // (accent swaps, add/remove) pass false so each is its own step.
  function commit(next: IntroContent, coalesce = true) {
    const now = Date.now();
    if (intro && (!coalesce || now - lastPushRef.current > 700)) {
      setHistory((h) => [...h.slice(-49), intro]);
    }
    lastPushRef.current = coalesce ? now : 0;
    update({ introContent: next });
  }

  // Snapshot the current deck before regenerating so it can be undone.
  async function handleGenerate() {
    if (intro) setHistory((h) => [...h.slice(-49), intro]);
    lastPushRef.current = 0;
    await onGenerate();
  }

  function undo() {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    update({ introContent: prev });
    lastPushRef.current = 0; // next edit starts a fresh undo step
  }

  function patchIntro(patch: Partial<IntroContent>) {
    if (!intro) return;
    commit({ ...intro, ...patch } as IntroContent);
  }

  function patchAbout(patch: Partial<NonNullable<IntroContent["about"]>>, coalesce = true) {
    if (!intro) return;
    const next = { ...(intro.about ?? { headline: "", lines: [] }), ...patch };
    commit({ ...intro, about: next } as IntroContent, coalesce);
  }

  function setChapters(next: IntroChapter[], coalesce = true) {
    if (!intro) return;
    commit({ ...intro, chapters: next } as IntroContent, coalesce);
  }

  function getAccent(key: string): SlideAccent {
    return (intro?.slideStyles?.[key]?.accent as SlideAccent) ?? "default";
  }
  function setAccent(key: string, accent: SlideAccent) {
    if (!intro) return;
    const next = { ...(intro.slideStyles ?? {}) };
    if (accent === "default") delete next[key];
    else next[key] = { ...(next[key] ?? {}), accent };
    commit({ ...intro, slideStyles: next } as IntroContent, false);
  }

  if (!intro) {
    return (
      <div className="rounded-3xl2 bg-white shadow-ring p-6 text-center">
        <Sparkles className="size-5 text-[var(--accent)] mx-auto" />
        <p className="serif text-xl text-ink mt-2">AI slideshow not generated yet</p>
        <p className="text-ink/55 text-sm mt-1 max-w-md mx-auto">
          {draft.celebrantDescription.trim().length < 20
            ? `Add at least 20 characters in the AI brief about ${firstName} (below the gallery) and we'll write the opening slides.`
            : `Generate the opening slides ${firstName} sees when they tap play. You'll be able to tweak every line.`}
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || draft.celebrantDescription.trim().length < 20}
          className="btn-accent inline-flex mt-5 shadow-soft text-sm disabled:opacity-50"
        >
          {generating ? (
            <><Loader2 className="size-4 animate-spin" /> Writing slides…</>
          ) : (
            <><Sparkles className="size-4" /> Generate slides</>
          )}
        </button>
        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-medium text-ink">Slideshow opening</p>
          <p className="text-xs text-ink/55 mt-0.5">
            Click any line to rewrite it. Add or trim chapters to match {firstName}.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={undo}
            disabled={history.length === 0}
            title="Undo last slide edit"
            className="btn-outline inline-flex text-sm disabled:opacity-40"
          >
            <Undo2 className="size-4" />
            <span className="hidden sm:inline">Undo</span>
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="btn-outline inline-flex text-sm disabled:opacity-50"
          >
            {generating ? (
              <><Loader2 className="size-4 animate-spin" /> Rewriting…</>
            ) : (
              <><RefreshCw className="size-4" /> Regenerate</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm rounded-xl bg-red-50 text-red-700 px-3 py-2">{error}</p>
      )}

      <SlideCard
        label="Cover"
        position="1"
        theme="welcome"
        accent={getAccent("welcome")}
        onAccent={(a) => setAccent("welcome", a)}
      >
        <p className="text-[10px] uppercase tracking-[0.28em] text-white/55">For {firstName}</p>
        <EmojiField
          value={intro.welcome.emoji}
          onChange={(v) => patchIntro({ welcome: { ...intro.welcome, emoji: v } })}
        />
        <div className="serif text-3xl">
          <InlineText
            value={intro.welcome.title ?? ""}
            onChange={(v) => patchIntro({ welcome: { ...intro.welcome, title: v } })}
            placeholder={firstName}
            maxLength={40}
            tone="dark"
            className="serif text-3xl"
            ariaLabel="Cover title"
          />
        </div>
        <InlineSlideText
          value={intro.welcome.subtext}
          onChange={(v) => patchIntro({ welcome: { ...intro.welcome, subtext: v } })}
          placeholder="A warm opening line"
          maxLength={90}
          tone="soft"
          multiline
        />
      </SlideCard>

      <SlideCard
        label="Occasion"
        position="2"
        theme="occasion"
        accent={getAccent("occasion")}
        onAccent={(a) => setAccent("occasion", a)}
      >
        <EmojiField
          value={intro.occasion.emoji}
          onChange={(v) => patchIntro({ occasion: { ...intro.occasion, emoji: v } })}
        />
        <InlineSlideText
          value={intro.occasion.title}
          onChange={(v) => patchIntro({ occasion: { ...intro.occasion, title: v } })}
          placeholder="A creative name for the occasion"
          maxLength={70}
          tone="headline"
        />
        <InlineSlideText
          value={intro.occasion.subtext}
          onChange={(v) => patchIntro({ occasion: { ...intro.occasion, subtext: v } })}
          placeholder="What this milestone means"
          maxLength={90}
          tone="soft"
          multiline
        />
      </SlideCard>

      <SlideCard
        label="Together"
        position="3"
        theme="together"
        accent={getAccent("together")}
        onAccent={(a) => setAccent("together", a)}
      >
        <InlineSlideText
          value={intro.together.headline}
          onChange={(v) => patchIntro({ together: { ...intro.together, headline: v } })}
          placeholder="A poetic phrase about today"
          maxLength={60}
          tone="headline"
        />
        <InlineSlideText
          value={intro.together.subtext}
          onChange={(v) => patchIntro({ together: { ...intro.together, subtext: v } })}
          placeholder="What this day represents"
          maxLength={90}
          tone="soft"
          multiline
        />
      </SlideCard>

      {intro.about ? (
        <SlideCard
          label="About them"
          position="4"
          theme="about"
          accent={getAccent("about")}
          onAccent={(a) => setAccent("about", a)}
          onRemove={() => patchIntro({ about: undefined })}
        >
          <InlineSlideText
            value={intro.about.headline}
            onChange={(v) => patchAbout({ headline: v })}
            placeholder="A poetic description of who they are"
            maxLength={60}
            tone="headline"
          />
          <ul className="space-y-2">
            {intro.about.lines.map((line, i) => (
              <li key={i} className="flex gap-2 items-start">
                <span className="text-white/40 pt-1">·</span>
                <div className="flex-1">
                  <InlineSlideText
                    value={line}
                    onChange={(v) => {
                      if (!intro.about) return;
                      const lines = [...intro.about.lines];
                      lines[i] = v;
                      patchAbout({ lines });
                    }}
                    placeholder="A specific detail"
                    maxLength={70}
                    tone="soft"
                  />
                </div>
                {intro.about!.lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!intro.about) return;
                      patchAbout({ lines: intro.about.lines.filter((_, j) => j !== i) }, false);
                    }}
                    className="text-white/40 hover:text-white/80"
                    aria-label="Remove line"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {intro.about.lines.length < 4 && (
            <button
              type="button"
              onClick={() => {
                if (!intro.about) return;
                patchAbout({ lines: [...intro.about.lines, ""] }, false);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white"
            >
              <Plus className="size-3.5" /> Add a line
            </button>
          )}
        </SlideCard>
      ) : (
        <button
          type="button"
          onClick={() => patchIntro({ about: { headline: "", lines: [""] } })}
          className="w-full rounded-3xl2 border-2 border-dashed border-ink/15 py-4 text-sm text-ink/55 hover:bg-ink/5 transition"
        >
          + Add an &ldquo;about them&rdquo; slide
        </button>
      )}

      {(intro.chapters ?? []).map((ch, i) => (
        <SlideCard
          key={`ch-${i}`}
          label={`Chapter ${i + 1}`}
          position={`${(intro.about ? 5 : 4) + i}`}
          theme="chapter"
          accent={getAccent(`chapter-${i}`)}
          onAccent={(a) => setAccent(`chapter-${i}`, a)}
          onRemove={() => {
            const next = (intro.chapters ?? []).filter((_, j) => j !== i);
            setChapters(next, false);
          }}
        >
          <EmojiField
            value={ch.emoji ?? ""}
            onChange={(v) => {
              const next = [...(intro.chapters ?? [])];
              next[i] = { ...next[i], emoji: v };
              setChapters(next);
            }}
          />
          <InlineSlideText
            value={ch.headline}
            onChange={(v) => {
              const next = [...(intro.chapters ?? [])];
              next[i] = { ...next[i], headline: v };
              setChapters(next);
            }}
            placeholder="A theme drawn from them"
            maxLength={55}
            tone="headline"
          />
          <InlineSlideText
            value={ch.body}
            onChange={(v) => {
              const next = [...(intro.chapters ?? [])];
              next[i] = { ...next[i], body: v };
              setChapters(next);
            }}
            placeholder="One or two sentences"
            maxLength={140}
            tone="soft"
            multiline
          />
        </SlideCard>
      ))}

      {(intro.chapters?.length ?? 0) < 4 && (
        <button
          type="button"
          onClick={() => {
            const next: IntroChapter[] = [
              ...(intro.chapters ?? []),
              { headline: "", body: "", emoji: "✨" },
            ];
            setChapters(next, false);
          }}
          className="w-full rounded-3xl2 border-2 border-dashed border-ink/15 py-4 text-sm text-ink/55 hover:bg-ink/5 transition"
        >
          + Add a chapter slide ({4 - (intro.chapters?.length ?? 0)} left)
        </button>
      )}

      <SlideCard
        label="Ready"
        position={`${countBefore(intro, "ready")}`}
        theme="ready"
        accent={getAccent("ready")}
        onAccent={(a) => setAccent("ready", a)}
      >
        <InlineSlideText
          value={intro.ready.headline}
          onChange={(v) => patchIntro({ ready: { ...intro.ready, headline: v } })}
          placeholder="The anticipation before they dive in"
          maxLength={55}
          tone="headline"
        />
        <InlineSlideText
          value={intro.ready.subtext}
          onChange={(v) => patchIntro({ ready: { ...intro.ready, subtext: v } })}
          placeholder="A warm send-off"
          maxLength={80}
          tone="soft"
          multiline
        />
      </SlideCard>

      <SlideCard
        label="Final"
        position={`${countBefore(intro, "final")}`}
        theme="final"
        accent={getAccent("final")}
        onAccent={(a) => setAccent("final", a)}
      >
        <EmojiField
          value={intro.final.emoji ?? ""}
          onChange={(v) => patchIntro({ final: { ...intro.final, emoji: v } })}
        />
        <InlineSlideText
          value={intro.final.headline}
          onChange={(v) => patchIntro({ final: { ...intro.final, headline: v } })}
          placeholder="A closing statement"
          maxLength={55}
          tone="headline"
        />
        <InlineSlideText
          value={intro.final.subtext}
          onChange={(v) => patchIntro({ final: { ...intro.final, subtext: v } })}
          placeholder="A quiet parting thought"
          maxLength={90}
          tone="soft"
          multiline
        />
      </SlideCard>
    </div>
  );
}

function countBefore(intro: IntroContent, target: "ready" | "final"): number {
  // 3 fixed leading slides (welcome, occasion, together) + optional about +
  // chapters + the gallery insertion. The number we surface to the user is
  // intentionally rough — it tracks list order in the editor, not the
  // exact position in the played sequence.
  let n = 3;
  if (intro.about) n += 1;
  n += intro.chapters?.length ?? 0;
  if (target === "ready") return n + 1;
  return n + 2;
}

function SlideCard({
  label,
  position,
  theme,
  accent,
  onAccent,
  onRemove,
  children,
}: {
  label: string;
  position: string;
  theme: "welcome" | "occasion" | "together" | "about" | "chapter" | "ready" | "final";
  accent: SlideAccent;
  onAccent: (a: SlideAccent) => void;
  onRemove?: () => void;
  children: React.ReactNode;
}) {
  const tints: Record<typeof theme, string> = {
    welcome:
      "radial-gradient(120% 80% at 20% 0%, var(--mesh-b), transparent 60%), radial-gradient(80% 100% at 100% 100%, var(--mesh-c), transparent 60%), var(--mesh-a)",
    occasion:
      "linear-gradient(160deg, var(--mesh-d) 0%, var(--mesh-b) 100%)",
    together:
      "radial-gradient(80% 100% at 50% 0%, var(--accent-soft), transparent 60%), var(--mesh-a)",
    about:
      "linear-gradient(140deg, var(--mesh-c) 0%, var(--mesh-d) 70%, white 100%)",
    chapter:
      "radial-gradient(at 80% 20%, var(--mesh-b), transparent 50%), radial-gradient(at 20% 80%, var(--mesh-c), transparent 50%), var(--mesh-d)",
    ready:
      "linear-gradient(180deg, var(--mesh-d) 0%, var(--mesh-a) 100%)",
    final:
      "conic-gradient(from 200deg at 50% 50%, var(--mesh-b), var(--mesh-d), var(--mesh-c), var(--mesh-b))",
  };
  const bg = slideAccentBg(accent) ?? tints[theme];
  return (
    <div className="relative rounded-3xl2 overflow-hidden shadow-card">
      <div className="absolute inset-0" style={{ background: bg }} aria-hidden />
      <div className="absolute inset-0 bg-black/35 pointer-events-none" aria-hidden />
      <div className="relative p-5 space-y-3 text-white">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.28em] text-white/55 inline-flex items-center gap-1.5">
            <Pencil className="size-3" /> {label} · slide {position}
          </span>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-white/45 hover:text-white inline-flex items-center gap-1 text-xs"
            >
              <Trash2 className="size-3.5" /> Remove
            </button>
          )}
        </div>
        {children}
        <AccentRow accent={accent} onAccent={onAccent} />
      </div>
    </div>
  );
}

function AccentRow({
  accent,
  onAccent,
}: {
  accent: SlideAccent;
  onAccent: (a: SlideAccent) => void;
}) {
  return (
    <div className="flex items-center gap-2 pt-2 mt-1 border-t border-white/15">
      <span className="text-[10px] uppercase tracking-widest text-white/50 mr-0.5">Colour</span>
      {SLIDE_ACCENTS.map((a) => {
        const isSel = a.id === accent;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onAccent(a.id)}
            title={a.label}
            aria-label={a.label}
            aria-pressed={isSel}
            className={`size-6 rounded-full transition grid place-items-center ${
              isSel ? "ring-2 ring-white ring-offset-1 ring-offset-black/30" : "ring-1 ring-white/30 hover:ring-white/60"
            }`}
            style={{
              background: a.cssVar ?? "transparent",
            }}
          >
            {a.id === "default" && (
              <span className="text-[9px] font-medium text-white/80">A</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function EmojiField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value.slice(0, 4))}
      placeholder="✨"
      aria-label="Emoji"
      className="bg-transparent text-3xl w-14 text-center rounded-md outline-none hover:bg-white/10 focus:bg-white/20 transition"
    />
  );
}

function InlineSlideText({
  value,
  onChange,
  placeholder,
  maxLength,
  multiline,
  tone,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxLength?: number;
  multiline?: boolean;
  tone: "headline" | "soft";
}) {
  const classes =
    tone === "headline"
      ? "serif text-2xl leading-tight"
      : "text-sm leading-snug text-white/85";
  return (
    <InlineText
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={maxLength}
      multiline={multiline}
      tone="dark"
      className={classes}
    />
  );
}
