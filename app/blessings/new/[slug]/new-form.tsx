"use client";

import { useState } from "react";

type Tone = "prayer" | "affirmation" | "scripture";

const TONES: { value: Tone; label: string; desc: string }[] = [
  { value: "prayer", label: "Prayers", desc: "Gentle, hopeful, faith-warm" },
  { value: "affirmation", label: "Affirmations", desc: "Grounding, kind, present-tense" },
  { value: "scripture", label: "Scripture-style", desc: "Timeless, poetic, reverent" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewBlessingForm({ slug, firstName }: { slug: string; firstName: string }) {
  const [tone, setTone] = useState<Tone>("prayer");
  const [senderName, setSenderName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedEmail = email.trim();
  const trimmedConfirm = confirmEmail.trim();
  const emailsMatch = trimmedEmail.toLowerCase() === trimmedConfirm.toLowerCase();
  const emailValid = EMAIL_RE.test(trimmedEmail);
  const showMismatch = trimmedConfirm.length > 0 && !emailsMatch;
  const canPay = emailValid && emailsMatch && !busy;

  async function pay() {
    if (!emailValid) {
      setError(`Enter ${firstName}'s email address.`);
      return;
    }
    if (!emailsMatch) {
      setError("The two email addresses don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/blessings/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          tone,
          senderName: senderName.trim() || undefined,
          recipientEmail: trimmedEmail,
          recipientEmailConfirm: trimmedConfirm,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.authorization_url) {
        setError(json?.error ?? "Could not start payment. Try again.");
        return;
      }
      window.location.href = json.authorization_url;
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl2 bg-white shadow-ring p-6 space-y-5">
      <div>
        <p className="text-sm font-medium text-ink mb-2">Choose the tone</p>
        <div className="space-y-2">
          {TONES.map((t) => {
            const active = tone === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTone(t.value)}
                aria-pressed={active}
                className={`w-full rounded-2xl border p-3.5 text-left transition ${
                  active ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-ink/12 hover:border-ink/25"
                }`}
              >
                <p className="text-sm font-medium text-ink">{t.label}</p>
                <p className="text-xs text-ink/55 mt-0.5">{t.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="recipient-email" className="text-sm font-medium text-ink">
          {firstName}&apos;s email
        </label>
        <input
          id="recipient-email"
          type="email"
          inputMode="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="mt-1 w-full rounded-2xl border border-ink/15 px-4 py-3 outline-none focus:border-[var(--accent)]"
        />
        <p className="text-xs text-ink/45 mt-1">Their weekly blessings go straight here — no link to forward.</p>
      </div>

      <div>
        <label htmlFor="recipient-email-confirm" className="text-sm font-medium text-ink">
          Confirm {firstName}&apos;s email
        </label>
        <input
          id="recipient-email-confirm"
          type="email"
          inputMode="email"
          autoComplete="off"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          onPaste={(e) => e.preventDefault()}
          placeholder="Re-type to confirm"
          className={`mt-1 w-full rounded-2xl border px-4 py-3 outline-none focus:border-[var(--accent)] ${
            showMismatch ? "border-red-400" : "border-ink/15"
          }`}
        />
        {showMismatch && <p className="text-xs text-red-600 mt-1">These don&apos;t match yet.</p>}
      </div>

      <div>
        <label htmlFor="sender" className="text-sm font-medium text-ink">
          Sign it from <span className="text-ink/45">(optional)</span>
        </label>
        <input
          id="sender"
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          placeholder="Your name"
          maxLength={60}
          className="mt-1 w-full rounded-2xl border border-ink/15 px-4 py-3 outline-none focus:border-[var(--accent)]"
        />
        <p className="text-xs text-ink/45 mt-1">Shown to {firstName} in every weekly blessing.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="button" onClick={pay} disabled={!canPay} className="btn-primary w-full disabled:opacity-60">
        {busy ? "Starting…" : "Continue — ₦5,000"}
      </button>
      <p className="text-xs text-ink/45 text-center">
        A one-time payment. The first blessing reaches {firstName} as soon as you pay.
      </p>
    </div>
  );
}
