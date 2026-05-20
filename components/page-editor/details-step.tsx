"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { BankCombobox, type Bank } from "./bank-combobox";
import { EVENT_OPTIONS, type PageDraft } from "./types";

/**
 * Step 1 of the editor (create flow only) — collects every field that
 * doesn't appear visually on the page: who it's for, when, the AI brief,
 * and the bank account that will receive contributions.
 */
export function DetailsStep({
  draft,
  update,
  banks,
  bankCode,
  setBankCode,
  accountNumber,
  setAccountNumber,
  resolvedAccountName,
  setResolvedAccountName,
  onContinue,
}: {
  draft: PageDraft;
  update: (patch: Partial<PageDraft>) => void;
  banks: Bank[];
  bankCode: string;
  setBankCode: (v: string) => void;
  accountNumber: string;
  setAccountNumber: (v: string) => void;
  resolvedAccountName: string | null;
  setResolvedAccountName: (v: string | null) => void;
  onContinue: () => void;
}) {
  const [resolving, startResolve] = useTransition();
  // Local error state isn't needed in a parent — keep ephemeral inside this
  // component so we don't lift state we don't need.
  const firstName = draft.recipientName.split(" ")[0] || "them";

  useEffect(() => {
    setResolvedAccountName(null);
    if (accountNumber.length !== 10 || !bankCode) return;
    startResolve(async () => {
      const res = await fetch("/api/paystack/resolve-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_number: accountNumber, bank_code: bankCode }),
      });
      const json = await res.json();
      if (res.ok) setResolvedAccountName(json.account_name);
      else setResolvedAccountName(null);
    });
  }, [accountNumber, bankCode, setResolvedAccountName]);

  const errors = collectErrors({
    draft,
    bankCode,
    accountNumber,
    resolvedAccountName,
  });
  const canContinue = errors.length === 0;

  return (
    <main className="min-h-[100dvh] bg-white pb-24">
      <div className="mx-auto w-full max-w-2xl px-5 pt-6">
        <Link
          href="/dashboard"
          className="text-ink/55 text-sm hover:text-ink inline-flex items-center gap-1"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>
        <div className="mt-2 mb-6 flex items-center gap-2 text-[11px] uppercase tracking-widest text-ink/40">
          <span className="text-ink font-medium">1. Details</span>
          <span>·</span>
          <span>2. Design</span>
        </div>
        <h1 className="serif text-4xl text-ink">
          Tell us about the celebration
        </h1>
        <p className="text-ink/55 mt-3 text-sm">
          A bit of context only you see. We&apos;ll use it to build {firstName}&apos;s page —
          you&apos;ll design what visitors see in the next step.
        </p>

        <div className="mt-8 space-y-5">
          <div className="space-y-1.5">
            <label className="label">Who is it for?</label>
            <input
              className="field"
              value={draft.recipientName}
              onChange={(e) => update({ recipientName: e.target.value })}
              placeholder="Tunde Bakare"
              maxLength={60}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="label">Type of celebration</label>
              <select
                className="field"
                value={draft.eventType}
                onChange={(e) => update({ eventType: e.target.value })}
              >
                {EVENT_OPTIONS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="label">Celebration date</label>
              <input
                type="datetime-local"
                className="field"
                min={minDate()}
                value={draft.celebrationDate}
                onChange={(e) => update({ celebrationDate: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-ink/50 -mt-3">
            Contributions close 72 hours before this date. Wall messages and
            page edits stay open until 1 hour before.
          </p>

          <div className="space-y-1.5">
            <label className="label">
              Tell us about {firstName}
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <textarea
              className="field min-h-[160px] resize-none"
              value={draft.celebrantDescription}
              onChange={(e) => update({ celebrantDescription: e.target.value })}
              placeholder="Their personality, what they love, what makes them who they are — the more you share, the richer the experience."
              maxLength={1500}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink/45">
                {draft.celebrantDescription.length}/1500
              </span>
              <span className="text-xs text-ink/40">
                Used to craft the personalised opening — not shown on the page.
              </span>
            </div>
          </div>

          <div className="pt-6 border-t border-ink/10 space-y-4">
            <div>
              <p className="font-medium text-ink">Where the gift goes</p>
              <p className="text-xs text-ink/55 mt-0.5">
                For cash gifts. Locked once the page is published.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="label">Recipient&apos;s bank</label>
              <BankCombobox banks={banks} value={bankCode} onChange={setBankCode} />
            </div>

            <div className="space-y-1.5">
              <label className="label">Account number</label>
              <input
                className="field"
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                value={accountNumber}
                onChange={(e) =>
                  setAccountNumber(e.target.value.replace(/\D/g, ""))
                }
              />
            </div>

            <div className="min-h-[44px]" aria-live="polite">
              {resolving && <p className="text-sm text-ink/60">Verifying account…</p>}
              {resolvedAccountName && !resolving && (
                <p className="text-sm rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] px-4 py-2 font-medium inline-flex items-center gap-1.5">
                  <Check className="size-4" /> {resolvedAccountName}
                </p>
              )}
              {accountNumber.length === 10 && bankCode && !resolving && !resolvedAccountName && (
                <p className="text-sm rounded-2xl bg-red-50 text-red-700 px-4 py-2">
                  Could not verify this account.
                </p>
              )}
            </div>
          </div>

          {errors.length > 0 && (draft.recipientName || draft.celebrationDate) && (
            <ul className="text-xs text-red-600 space-y-0.5">
              {errors.map((e) => (
                <li key={e}>• {e}</li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={onContinue}
            disabled={!canContinue}
            className="btn-accent w-full shadow-soft py-4 disabled:opacity-50"
          >
            Continue — design the page
          </button>
        </div>
      </div>
    </main>
  );
}

function minDate(): string {
  const d = new Date(Date.now() + 96 * 3600 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function collectErrors({
  draft,
  bankCode,
  accountNumber,
  resolvedAccountName,
}: {
  draft: PageDraft;
  bankCode: string;
  accountNumber: string;
  resolvedAccountName: string | null;
}): string[] {
  const errs: string[] = [];
  if (draft.recipientName.trim().length < 1) errs.push("Recipient name is required.");
  if (!draft.celebrationDate) errs.push("Pick a celebration date.");
  else if (new Date(draft.celebrationDate).getTime() <= Date.now() + 96 * 3600 * 1000) {
    errs.push("Celebration date must be at least 96 hours from now.");
  }
  if (draft.celebrantDescription.trim().length < 20) {
    errs.push("Add a short brief about the celebrant (20+ characters).");
  }
  if (!bankCode) errs.push("Pick the recipient's bank.");
  if (accountNumber.length !== 10) errs.push("Account number must be 10 digits.");
  if (!resolvedAccountName) errs.push("Account couldn't be verified.");
  return errs;
}
