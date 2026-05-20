"use client";

import { useState } from "react";
import { createCelebration } from "./actions";
import type { MusicTrack } from "@/lib/music";
import type { Theme } from "@/lib/themes";
import { DesignStep } from "@/components/page-editor/design-step";
import { DetailsStep } from "@/components/page-editor/details-step";
import type { Bank } from "@/components/page-editor/bank-combobox";
import type { PageDraft } from "@/components/page-editor/types";

type Step = "details" | "design";

export function CreateForm({
  banks,
  tracks,
}: {
  banks: Bank[];
  tracks: MusicTrack[];
}) {
  const [step, setStep] = useState<Step>("details");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [draft, setDraft] = useState<PageDraft>({
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
  });

  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedAccountName, setResolvedAccountName] = useState<string | null>(null);
  const [generatingIntro, setGeneratingIntro] = useState(false);
  const [introError, setIntroError] = useState<string | null>(null);

  function update(patch: Partial<PageDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
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
        draft.gallery.map(({ path, caption, kind }) => ({ path, caption, kind })),
      ),
    );
    if (draft.introContent) {
      fd.set("introContent", JSON.stringify(draft.introContent));
    }

    const result = await createCelebration({}, fd);
    if (result?.authorizationUrl) {
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
    />
  );
}

function collectDesignErrors(draft: PageDraft): string[] {
  const errs: string[] = [];
  if (draft.title.trim().length < 2) errs.push("Add a page title.");
  if (!draft.coverPath) errs.push("Upload a cover photo.");
  return errs;
}
