"use client";

import { useEffect, useRef, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { BankCombobox, type Bank } from "./bank-combobox";
import { InfoButton } from "./info-button";
import { EVENT_OPTIONS, type PageDraft } from "./types";

const LEAD_HOURS = 96;

/** Brings a focused field to the centre of the screen, clear of the sticky bar. */
function focusScroll(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.scrollIntoView({ behavior: "smooth", block: "center" });
}

/** Reveals its children with a soft fade and eases them into view once shown. */
function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (show) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [show]);
  if (!show) return null;
  return <div ref={ref} className="fade-up">{children}</div>;
}

/**
 * Step 1 of the editor (create flow only) — collects every field that
 * doesn't appear visually on the page: who it's for, when, the AI brief,
 * and the bank account that will receive contributions. Fields reveal one
 * after another so the form never feels long, and validation stays quiet
 * until a field is actually relevant.
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

  const dateValid =
    !!draft.celebrationDate &&
    new Date(draft.celebrationDate).getTime() > Date.now() + LEAD_HOURS * 3600 * 1000;
  const descValid = draft.celebrantDescription.trim().length >= 20;

  // Progressive reveal — each block appears once the previous one is filled.
  const showBasics = draft.recipientName.trim().length >= 1;
  const showDesc = showBasics && !!draft.celebrationDate;
  const showBank = showDesc && dateValid && descValid;
  const showAccount = showBank && !!bankCode;

  // Smooth completion bar at the bottom.
  const gates = [showBasics, dateValid, descValid, !!bankCode, !!resolvedAccountName];
  const completed = gates.filter(Boolean).length;
  const progress = completed / gates.length;
  const canContinue = completed === gates.length;

  return (
    <main className="min-h-[100dvh] bg-white pb-32">
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
        <h1 className="serif text-4xl text-ink">Tell us about the celebration</h1>
        <p className="text-ink/55 mt-3 text-sm">
          A bit of context only you see. We&apos;ll use it to build {firstName}&apos;s page —
          you&apos;ll design what visitors see in the next step.
        </p>

        <div className="mt-8 space-y-5">
          {/* Recipient — always visible */}
          <div className="space-y-1.5">
            <label className="label">Who is it for?</label>
            <input
              className="field"
              value={draft.recipientName}
              onChange={(e) => update({ recipientName: e.target.value })}
              onFocus={focusScroll}
              placeholder="Tunde Bakare"
              maxLength={60}
              autoFocus
            />
          </div>

          {/* Occasion + date */}
          <Reveal show={showBasics}>
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="label">Type of celebration</label>
                  <select
                    className="field"
                    value={draft.eventType}
                    onChange={(e) => update({ eventType: e.target.value })}
                    onFocus={focusScroll}
                  >
                    {EVENT_OPTIONS.map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="label">Celebration date</label>
                    <InfoButton title="How cash gifts work" label="How it works">
                      <p>
                        Guests contribute cash gifts toward {firstName}&apos;s celebration.
                        Contributions open the moment your page goes live.
                      </p>
                      <p>
                        They automatically <strong>close 72 hours before</strong> the date
                        so there&apos;s time to settle the gift, while wall messages and
                        photos stay open until <strong>1 hour before</strong>.
                      </p>
                    </InfoButton>
                  </div>
                  <input
                    type="datetime-local"
                    className="field"
                    min={minDate()}
                    value={draft.celebrationDate}
                    onChange={(e) => update({ celebrationDate: e.target.value })}
                    onFocus={focusScroll}
                  />
                </div>
              </div>
              {draft.celebrationDate && !dateValid && (
                <p className="text-xs text-red-600 -mt-3">
                  Pick a date at least {LEAD_HOURS} hours away so guests have time to chip in.
                </p>
              )}
            </div>
          </Reveal>

          {/* AI brief */}
          <Reveal show={showDesc}>
            <div className="space-y-1.5">
              <label className="label">
                Tell us about {firstName}
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <textarea
                className="field min-h-[160px] resize-none"
                value={draft.celebrantDescription}
                onChange={(e) => update({ celebrantDescription: e.target.value })}
                onFocus={focusScroll}
                placeholder="Their personality, what they love, what makes them who they are — the more you share, the richer the experience."
                maxLength={1500}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-ink/45">
                  Used to craft the personalised opening — not shown on the page.
                </p>
                <p className="text-xs text-ink/40">{draft.celebrantDescription.length}/1500</p>
              </div>
            </div>
          </Reveal>

          {/* Bank details */}
          <Reveal show={showBank}>
            <div className="pt-6 border-t border-ink/10 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">Where the gift goes</p>
                  <p className="text-xs text-ink/55 mt-0.5">
                    For cash gifts. Locked once the page is published.
                  </p>
                </div>
                <InfoButton title="How redemption works" label="How it works">
                  <p>
                    Every cash gift is pooled and paid out in a single transfer to this
                    account on the celebration day.
                  </p>
                  <p>
                    The money lands directly in {firstName}&apos;s bank — no cash to
                    collect and no transfers to chase. This account can&apos;t be changed
                    after the page is published.
                  </p>
                </InfoButton>
              </div>

              <div className="space-y-1.5">
                <label className="label">Recipient&apos;s bank</label>
                <BankCombobox banks={banks} value={bankCode} onChange={setBankCode} />
              </div>
            </div>
          </Reveal>

          {/* Account number + verification */}
          <Reveal show={showAccount}>
            <div className="space-y-1.5">
              <label className="label">Account number</label>
              <input
                className="field"
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                onFocus={focusScroll}
                placeholder="0123456789"
              />
              <div className="min-h-[44px]" aria-live="polite">
                {resolving && <p className="text-sm text-ink/60">Verifying account…</p>}
                {resolvedAccountName && !resolving && (
                  <p className="text-sm rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] px-4 py-2 font-medium inline-flex items-center gap-1.5">
                    <Check className="size-4" /> {resolvedAccountName}
                  </p>
                )}
                {accountNumber.length === 10 && bankCode && !resolving && !resolvedAccountName && (
                  <p className="text-sm rounded-2xl bg-red-50 text-red-700 px-4 py-2">
                    Couldn&apos;t verify this account — double-check the number and bank.
                  </p>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Sticky bottom: smooth progress + CTA */}
      <div className="fixed bottom-0 inset-x-0 z-30">
        <div className="h-1 bg-ink/10">
          <div
            className="h-full bg-[var(--accent)] transition-[width] duration-500 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="bg-white/95 backdrop-blur border-t border-ink/8">
          <div className="mx-auto max-w-2xl px-5 py-3">
            <button
              type="button"
              onClick={onContinue}
              disabled={!canContinue}
              className="btn-accent w-full shadow-soft py-3.5 disabled:opacity-50"
            >
              Continue — design the page
            </button>
          </div>
          <div className="h-safe-b" />
        </div>
      </div>
    </main>
  );
}

function minDate(): string {
  const d = new Date(Date.now() + LEAD_HOURS * 3600 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
