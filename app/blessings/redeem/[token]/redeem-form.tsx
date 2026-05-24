"use client";

import { useState } from "react";

export function RedeemForm({ token, firstName }: { token: string; firstName: string }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError("Please tick the box so we can email you.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/blessings/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, consent }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? "Something went wrong. Try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-3xl2 bg-white shadow-ring p-6">
        <div className="text-3xl mb-2">💌</div>
        <p className="serif text-xl text-ink">Your first blessing is on its way</p>
        <p className="text-ink/60 mt-2 text-sm">
          Check {email}. A new one arrives every week for a year.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-3xl2 bg-white shadow-ring p-6 text-left space-y-4">
      <div>
        <label htmlFor="email" className="text-sm font-medium text-ink">
          Your email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1 w-full rounded-2xl border border-ink/15 px-4 py-3 outline-none focus:border-[var(--accent)]"
        />
      </div>
      <label className="flex items-start gap-3 text-sm text-ink/70">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 size-4 accent-[var(--accent)]"
        />
        <span>
          Yes, email {firstName} a blessing every week for a year. I can unsubscribe anytime.
        </span>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
        {busy ? "Setting up…" : "Start my year of blessings"}
      </button>
    </form>
  );
}
