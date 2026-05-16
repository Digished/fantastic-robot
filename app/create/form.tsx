"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createCelebration, type CreateState } from "./actions";

type Bank = { name: string; code: string };

const EVENT_OPTIONS = [
  ["birthday", "Birthday"],
  ["graduation", "Graduation"],
  ["wedding", "Wedding"],
  ["appreciation", "Appreciation"],
  ["farewell", "Farewell"],
  ["baby_shower", "Baby shower"],
  ["surprise_gift", "Surprise gift"],
  ["other", "Other"],
] as const;

function minDate() {
  // 96 hours from now, formatted for <input type="datetime-local">.
  const d = new Date(Date.now() + 96 * 3600 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateForm({ banks }: { banks: Bank[] }) {
  const [state, action] = useActionState<CreateState, FormData>(
    createCelebration,
    {},
  );
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [resolved, setResolved] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolving, startResolve] = useTransition();

  useEffect(() => {
    setResolved(null);
    setResolveError(null);
    if (accountNumber.length !== 10 || !bankCode) return;
    startResolve(async () => {
      const res = await fetch("/api/paystack/resolve-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_number: accountNumber, bank_code: bankCode }),
      });
      const json = await res.json();
      if (res.ok) setResolved(json.account_name);
      else setResolveError(json.error ?? "Could not verify");
    });
  }, [accountNumber, bankCode]);

  return (
    <form action={action} className="mt-8 space-y-5">
      <div className="space-y-1">
        <label className="label">Page title</label>
        <input
          name="title"
          className="field"
          placeholder="Tunde turns 30 🎉"
          required
          maxLength={80}
        />
      </div>

      <div className="space-y-1">
        <label className="label">Who is it for?</label>
        <input
          name="recipientName"
          className="field"
          placeholder="Tunde Bakare"
          required
          maxLength={60}
        />
      </div>

      <div className="space-y-1">
        <label className="label">Type of celebration</label>
        <select name="eventType" className="field" defaultValue="birthday" required>
          {EVENT_OPTIONS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="label">Celebration date</label>
        <input
          type="datetime-local"
          name="celebrationDate"
          className="field"
          min={minDate()}
          required
        />
        <p className="text-xs text-muted">
          Contributions close 72 hours before this date. The recipient can claim on the day.
        </p>
      </div>

      <div className="space-y-1">
        <label className="label">A note from you (optional)</label>
        <textarea
          name="messageFromCreator"
          className="field min-h-[88px] resize-none"
          placeholder="Let's spoil her this year ❤️"
          maxLength={280}
        />
      </div>

      <div className="pt-3 border-t border-plum/10">
        <p className="font-serif text-xl text-plum mt-3">Where should the gift go?</p>
        <p className="text-sm text-plum/60 mt-1">
          Locked once the page is live. Contributors see this for transparency.
        </p>

        <div className="space-y-1 mt-4">
          <label className="label">Recipient's bank</label>
          <select
            name="recipientBankCode"
            className="field"
            required
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
          >
            <option value="" disabled>Select a bank</option>
            {banks.map((b) => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1 mt-3">
          <label className="label">Account number</label>
          <input
            name="recipientAccountNumber"
            className="field"
            inputMode="numeric"
            pattern="\d{10}"
            maxLength={10}
            required
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
          />
        </div>

        <div className="mt-3 min-h-[44px]" aria-live="polite">
          {resolving && <p className="text-sm text-plum/60">Verifying account…</p>}
          {resolved && (
            <p className="text-sm rounded-xl bg-terracotta-50 text-terracotta-700 px-3 py-2">
              ✓ {resolved}
            </p>
          )}
          {resolveError && (
            <p className="text-sm rounded-xl bg-terracotta-50 text-terracotta-700 px-3 py-2">
              {resolveError}
            </p>
          )}
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-terracotta">{state.error}</p>
      )}

      <button
        className="btn-primary w-full py-4 text-base"
        disabled={!resolved || resolving}
      >
        Create celebration page
      </button>
    </form>
  );
}
