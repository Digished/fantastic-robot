"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createCelebration } from "./actions";
import type { MusicTrack } from "@/lib/music";
import type { Theme } from "@/lib/themes";
import { DesignStep } from "@/components/page-editor/design-step";
import { DetailsStep } from "@/components/page-editor/details-step";
import type { Bank } from "@/components/page-editor/bank-combobox";
import type { PageDraft } from "@/components/page-editor/types";
import {
  isDraftPristine,
  serializeDraft,
  type SavedDraft,
} from "@/lib/draft/draft";

type Step = "details" | "design";

const SAVE_DEBOUNCE_MS = 800;
const DRAFT_ENDPOINT = "/api/draft";

const EMPTY_DRAFT: PageDraft = {
  title: "",
  recipientName: "",
  eventType: "birthday",
  celebrationDate: "",
  messageFromCreator: "",
  tagline: "",
  celebrantDescription: "",
  coverPath: null,
  coverPreview: null,
  theme: "ivory" as Theme,
  backgroundMusic: null,
  gallery: [],
  introContent: null,
};

export function CreateForm({
  banks,
  tracks: initialTracks,
  initialDraft,
}: {
  banks: Bank[];
  tracks: MusicTrack[];
  initialDraft: SavedDraft | null;
}) {
  const [step, setStep] = useState<Step>("details");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<MusicTrack[]>(initialTracks);

  function addTrack(track: MusicTrack) {
    setTracks((prev) =>
      prev.some((t) => t.id === track.id) ? prev : [track, ...prev],
    );
  }

  const [draft, setDraft] = useState<PageDraft>(initialDraft?.draft ?? EMPTY_DRAFT);
  const [bankCode, setBankCode] = useState(initialDraft?.bankCode ?? "");
  const [accountNumber, setAccountNumber] = useState(initialDraft?.accountNumber ?? "");
  const [resolvedAccountName, setResolvedAccountName] = useState<string | null>(null);
  const [generatingIntro, setGeneratingIntro] = useState(false);
  const [introError, setIntroError] = useState<string | null>(null);

  // ── Server-side autosave ────────────────────────────────────────────
  // Keep the latest snapshot in a ref so debounced/beacon flushes always
  // read the most recent values without re-creating handlers.
  const latestRef = useRef({ draft, bankCode, accountNumber });
  useEffect(() => {
    latestRef.current = { draft, bankCode, accountNumber };
  }, [draft, bankCode, accountNumber]);

  // Avoid an immediate re-save right after server hydration with the same
  // payload we just read.
  const skipNextSaveRef = useRef(!!initialDraft);

  // Suppresses saves after the page has been persisted (Paystack handoff)
  // so the unloading tab doesn't write a stale draft back over the cleared
  // server row.
  const suppressSaveRef = useRef(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef<Promise<void> | null>(null);

  const buildPayload = useCallback(() => {
    const snap = latestRef.current;
    if (isDraftPristine(snap.draft, snap.bankCode, snap.accountNumber)) return null;
    return serializeDraft({
      draft: snap.draft,
      bankCode: snap.bankCode,
      accountNumber: snap.accountNumber,
    });
  }, []);

  const flushSave = useCallback(async () => {
    if (suppressSaveRef.current) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const payload = buildPayload();
    if (!payload) return;
    const send = fetch(DRAFT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).then(() => undefined).catch(() => undefined);
    inflightRef.current = send;
    await send;
  }, [buildPayload]);

  // Debounced save on every state change.
  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (suppressSaveRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void flushSave();
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [draft, bankCode, accountNumber, flushSave]);

  // Flush on tab hide / pagehide so leaving for a bank app or closing the
  // tab never loses unsaved keystrokes. sendBeacon is fire-and-forget and
  // survives the unload; the keepalive fetch is the fallback for browsers
  // where sendBeacon strips the cookie auth header.
  useEffect(() => {
    function beaconFlush() {
      if (suppressSaveRef.current) return;
      const payload = buildPayload();
      if (!payload) return;
      try {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        const ok = navigator.sendBeacon?.(DRAFT_ENDPOINT, blob);
        if (ok) return;
      } catch {
        // fall through to fetch
      }
      // Best-effort fallback.
      void fetch(DRAFT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => undefined);
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") beaconFlush();
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", beaconFlush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", beaconFlush);
    };
  }, [buildPayload]);

  function update(
    patch: Partial<PageDraft> | ((prev: PageDraft) => Partial<PageDraft>),
  ) {
    setDraft((prev) => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) }));
  }

  async function generateIntro() {
    setIntroError(null);
    if (
      draft.celebrantDescription.trim().length < 20 ||
      !draft.recipientName ||
      !draft.celebrationDate
    ) {
      setIntroError("Add the brief and basics in step 1 first.");
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
          celebrationTitle: draft.title || `For ${draft.recipientName}`,
          celebrantDescription: draft.celebrantDescription,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setIntroError(json.error ?? "Could not generate slides.");
      } else {
        update({ introContent: json.introContent });
      }
    } catch {
      setIntroError("Could not reach the slide generator.");
    } finally {
      setGeneratingIntro(false);
    }
  }

  const designErrors = collectDesignErrors(draft);
  const canPublish = designErrors.length === 0;

  async function submit() {
    if (!canPublish) {
      setSubmitError(designErrors[0]);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const fd = new FormData();
    fd.set("title", draft.title);
    fd.set("recipientName", draft.recipientName);
    fd.set("eventType", draft.eventType);
    fd.set("theme", draft.theme);
    if (draft.backgroundMusic) fd.set("backgroundMusic", draft.backgroundMusic);
    fd.set("celebrationDate", draft.celebrationDate);
    if (draft.messageFromCreator) fd.set("messageFromCreator", draft.messageFromCreator);
    if (draft.tagline) fd.set("tagline", draft.tagline);
    fd.set("celebrantDescription", draft.celebrantDescription);
    if (draft.coverPath) fd.set("coverPhotoPath", draft.coverPath);
    fd.set("recipientBankCode", bankCode);
    fd.set("recipientAccountNumber", accountNumber);
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

    const result = await createCelebration({}, fd);
    if (result?.authorizationUrl) {
      // The page is now a real DB row. Wipe the draft (server + any pending
      // flush) so the dashboard doesn't show "Continue editing" alongside
      // the freshly-created page.
      suppressSaveRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // Drain any debounced save already in flight so the DELETE below
      // can't be raced by a POST landing late.
      if (inflightRef.current) {
        try { await inflightRef.current; } catch { /* ignore */ }
      }
      await fetch(DRAFT_ENDPOINT, { method: "DELETE", keepalive: true }).catch(() => undefined);
      // The unpaid page is already saved and listed on the dashboard. Point the
      // browser's back/return target there so cancelling at Paystack doesn't
      // drop the user back onto a blank "new celebration" form.
      window.history.replaceState(null, "", "/dashboard");
      window.location.href = result.authorizationUrl;
      return;
    }
    if (result?.error) {
      setSubmitError(result.error);
      setSubmitting(false);
    }
  }

  if (step === "details") {
    return (
      <DetailsStep
        draft={draft}
        update={update}
        banks={banks}
        bankCode={bankCode}
        setBankCode={setBankCode}
        accountNumber={accountNumber}
        setAccountNumber={setAccountNumber}
        resolvedAccountName={resolvedAccountName}
        setResolvedAccountName={setResolvedAccountName}
        onContinue={() => setStep("design")}
      />
    );
  }

  return (
    <DesignStep
      draft={draft}
      update={update}
      tracks={tracks}
      mode="create"
      onBack={() => setStep("details")}
      backLabel="Edit details"
      errorText={submitError}
      confirmViaPreview
      publishChecklist={designErrors}
      primary={{
        label: "Pay ₦500 & publish",
        submittingLabel: "Publishing…",
        onClick: submit,
        submitting,
        disabled: !canPublish,
      }}
      onGenerateIntro={generateIntro}
      generatingIntro={generatingIntro}
      introError={introError}
      onAddTrack={addTrack}
    />
  );
}

function collectDesignErrors(draft: PageDraft): string[] {
  const errs: string[] = [];
  if (draft.title.trim().length < 2) errs.push("Add a page title");
  if (!draft.coverPath) errs.push("Add a cover photo");
  if (draft.gallery.some((g) => g.uploading)) errs.push("Wait for media to finish uploading");
  return errs;
}
