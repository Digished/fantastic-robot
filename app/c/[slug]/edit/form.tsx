"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Lock } from "lucide-react";
import { editCelebration, type EditState } from "./actions";
import { DesignStep } from "@/components/page-editor/design-step";
import { BankCombobox, type Bank } from "@/components/page-editor/bank-combobox";
import { SlugEditor } from "./slug-editor";
import { PresentationToggle } from "./presentation-toggle";
import {
  isValidUploadedTrackId,
  makeUploadedTrack,
  parseMusicValue,
  type MusicTrack,
} from "@/lib/music";
import type { Theme } from "@/lib/themes";
import type { IntroContent, PageDraft } from "@/components/page-editor/types";

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

// Stored ISO → a value the datetime-local input understands (local time).
function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function EditForm({
  slug,
  initial,
  tracks: initialTracks,
  banks,
  canEditDateBank,
}: {
  slug: string;
  tracks: MusicTrack[];
  banks: Bank[];
  canEditDateBank: boolean;
  initial: {
    title: string;
    messageFromCreator: string;
    tagline: string;
    celebrantDescription: string;
    coverPhotoPath: string | null;
    theme: Theme;
    backgroundMusic: string | null;
    recipientName: string;
    eventType: string;
    celebrationDate: string;
    recipientBankCode: string;
    recipientAccountNumber: string;
    recipientAccountName: string;
    presentation: "reel" | "book";
    introContent: IntroContent | null;
    galleryImages: { path: string; caption: string; kind?: "image" | "video" }[];
  };
}) {
  const router = useRouter();
  const action = editCelebration.bind(null, slug);
  const [state, dispatch, pending] = useActionState<EditState, FormData>(action, {});

  const [presentation, setPresentation] = useState<"reel" | "book">(initial.presentation);

  // Date & payout account — editable only within the 24h window.
  const [celebrationDate, setCelebrationDate] = useState(toLocalInput(initial.celebrationDate));
  const [bankCode, setBankCode] = useState(initial.recipientBankCode);
  const [accountNumber, setAccountNumber] = useState(initial.recipientAccountNumber);
  const [accountName, setAccountName] = useState(initial.recipientAccountName);
  const [resolvingBank, setResolvingBank] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  async function resolveBank(code: string, num: string) {
    setBankError(null);
    setAccountName("");
    if (!code || !/^\d{10}$/.test(num)) return;
    setResolvingBank(true);
    try {
      const res = await fetch("/api/paystack/resolve-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_number: num, bank_code: code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not verify account");
      setAccountName(json.account_name);
    } catch (err) {
      setBankError(err instanceof Error ? err.message : "Could not verify account");
    } finally {
      setResolvingBank(false);
    }
  }

  // A previously uploaded song lives only in background_music; surface it in
  // the picker list so it shows as selected and can be previewed.
  const [tracks, setTracks] = useState<MusicTrack[]>(() => {
    const { id } = parseMusicValue(initial.backgroundMusic);
    if (id && isValidUploadedTrackId(id) && !initialTracks.some((t) => t.id === id)) {
      return [makeUploadedTrack(id), ...initialTracks];
    }
    return initialTracks;
  });

  function addTrack(track: MusicTrack) {
    setTracks((prev) =>
      prev.some((t) => t.id === track.id) ? prev : [track, ...prev],
    );
  }

  const [draft, setDraft] = useState<PageDraft>({
    title: initial.title,
    recipientName: initial.recipientName,
    eventType: initial.eventType,
    celebrationDate: initial.celebrationDate,
    messageFromCreator: initial.messageFromCreator,
    tagline: initial.tagline,
    celebrantDescription: initial.celebrantDescription,
    coverPath: initial.coverPhotoPath,
    coverPreview: initial.coverPhotoPath ? publicUrl(initial.coverPhotoPath) : null,
    theme: initial.theme,
    backgroundMusic: initial.backgroundMusic,
    gallery: initial.galleryImages.map((img) => ({
      path: img.path,
      caption: img.caption,
      kind: img.kind ?? "image",
      preview: publicUrl(img.path),
    })),
    introContent: initial.introContent,
  });
  const [generatingIntro, setGeneratingIntro] = useState(false);
  const [introError, setIntroError] = useState<string | null>(null);

  function update(
    patch: Partial<PageDraft> | ((prev: PageDraft) => Partial<PageDraft>),
  ) {
    setDraft((prev) => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) }));
  }

  async function generateIntro() {
    setIntroError(null);
    if (draft.celebrantDescription.trim().length < 20) {
      setIntroError(`Add at least 20 characters in the AI brief about ${draft.recipientName.split(" ")[0] || "them"} below.`);
      return;
    }
    setGeneratingIntro(true);
    try {
      const res = await fetch("/api/ai/generate-intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName: draft.recipientName,
          eventType: draft.eventType,
          celebrationDate: draft.celebrationDate,
          celebrationTitle: draft.title,
          celebrantDescription: draft.celebrantDescription,
        }),
      });
      const json = await res.json();
      if (!res.ok) setIntroError(json.error ?? "Could not generate slides.");
      else update({ introContent: json.introContent });
    } catch {
      setIntroError("Could not reach the slide generator.");
    } finally {
      setGeneratingIntro(false);
    }
  }

  function save() {
    const fd = new FormData();
    fd.set("title", draft.title);
    fd.set("theme", draft.theme);
    if (draft.backgroundMusic) fd.set("backgroundMusic", draft.backgroundMusic);
    if (draft.messageFromCreator) fd.set("messageFromCreator", draft.messageFromCreator);
    if (draft.tagline) fd.set("tagline", draft.tagline);
    fd.set("celebrantDescription", draft.celebrantDescription);
    if (draft.coverPath) fd.set("coverPhotoPath", draft.coverPath);
    fd.set(
      "galleryImages",
      JSON.stringify(
        draft.gallery
          .filter((g) => g.path) // drop any item still uploading
          .map(({ path, caption, kind }) => ({ path, caption, kind })),
      ),
    );
    if (draft.introContent) {
      fd.set("introContent", JSON.stringify(draft.introContent));
    }
    fd.set("presentation", presentation);
    if (canEditDateBank) {
      if (celebrationDate) fd.set("celebrationDate", celebrationDate);
      if (bankCode && /^\d{10}$/.test(accountNumber)) {
        fd.set("recipientBankCode", bankCode);
        fd.set("recipientAccountNumber", accountNumber);
      }
    }
    dispatch(fd);
  }

  const firstName = draft.recipientName.split(" ")[0] || "them";

  return (
    <DesignStep
      draft={draft}
      update={update}
      tracks={tracks}
      mode="edit"
      onBack={() => router.push(`/c/${slug}`)}
      backLabel="Back to page"
      errorText={state.error ?? null}
      primary={{
        label: state.ok ? "Saved ✓" : "Save changes",
        submittingLabel: "Saving…",
        onClick: save,
        submitting: pending,
      }}
      onGenerateIntro={generateIntro}
      generatingIntro={generatingIntro}
      introError={introError}
      onAddTrack={addTrack}
      extrasBelow={
        <div className="space-y-4">
          <div className="rounded-3xl2 bg-white shadow-ring p-5 space-y-3">
            <div>
              <p className="font-medium text-ink">AI brief about {firstName}</p>
              <p className="text-xs text-ink/50 mt-0.5">
                Only you see this. Used to personalise {firstName}&apos;s slideshow opening.
              </p>
            </div>
            <textarea
              className="field min-h-[120px] resize-none"
              value={draft.celebrantDescription}
              onChange={(e) => update({ celebrantDescription: e.target.value })}
              maxLength={1500}
              placeholder={`Tell us about ${firstName} — their personality, what they love, what makes them who they are.`}
            />
            <p className="text-xs text-ink/45">
              {draft.celebrantDescription.length}/1500
            </p>
          </div>

          <PresentationToggle value={presentation} onChange={setPresentation} />

          {/* Date & payout account — only within 24h of publishing */}
          <div className="rounded-3xl2 bg-white shadow-ring p-5 space-y-4">
            <div>
              <p className="font-medium text-ink">Date &amp; payout account</p>
              <p className="text-xs text-ink/50 mt-0.5">
                {canEditDateBank
                  ? "You can fix these within 24 hours of publishing, then they lock."
                  : "Locked — the date and account can only be changed in the first 24 hours after publishing."}
              </p>
            </div>

            {canEditDateBank ? (
              <>
                <div className="space-y-1.5">
                  <label className="label" htmlFor="celebrationDate">Celebration date</label>
                  <input
                    id="celebrationDate"
                    type="datetime-local"
                    className="field"
                    value={celebrationDate}
                    onChange={(e) => setCelebrationDate(e.target.value)}
                  />
                  <p className="text-xs text-ink/45">Must be at least 96 hours away.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="label">Recipient&apos;s bank</label>
                  <BankCombobox
                    banks={banks}
                    value={bankCode}
                    onChange={(code) => { setBankCode(code); resolveBank(code, accountNumber); }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="label" htmlFor="recipientAccountNumber">Account number</label>
                  <input
                    id="recipientAccountNumber"
                    className="field"
                    inputMode="numeric"
                    maxLength={10}
                    value={accountNumber}
                    placeholder="10-digit account number"
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setAccountNumber(v);
                      if (v.length === 10) resolveBank(bankCode, v);
                      else setAccountName("");
                    }}
                  />
                </div>
                {resolvingBank && (
                  <p className="text-sm text-ink/55 inline-flex items-center gap-1.5">
                    <Loader2 className="size-4 animate-spin" /> Checking account…
                  </p>
                )}
                {accountName && !resolvingBank && (
                  <p className="text-sm rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] px-3 py-2 inline-flex items-center gap-1.5">
                    <Check className="size-4" /> {accountName}
                  </p>
                )}
                {bankError && <p className="text-sm text-red-600">{bankError}</p>}
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm text-ink/55">
                <Lock className="size-4 text-ink/40" />
                {accountName || "Account"} · sends on the celebration day
              </div>
            )}
          </div>

          <SlugEditor slug={slug} />
        </div>
      }
    />
  );
}
