"use client";

import { useMemo, useState } from "react";
import { formatNaira } from "@/lib/utils";

const QUICK = [500, 1000, 2000, 5000, 10_000];

export function ContributeForm({ slug }: { slug: string }) {
  const [amountNaira, setAmountNaira] = useState<number>(2000);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountKobo = useMemo(() => BigInt(Math.round(amountNaira * 100)), [amountNaira]);
  const platformFeeKobo = (amountKobo * 5n) / 100n;
  const totalKobo = amountKobo + platformFeeKobo;
  const valid = amountKobo >= 50_000n && name.trim().length > 0 && /.+@.+/.test(email);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/paystack/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          amountKobo: amountKobo.toString(),
          contributorName: name,
          contributorEmail: email,
          contributorPhone: phone || undefined,
          isAnonymous: anon,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not start payment");
      window.location.href = j.authorization_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={go} className="mt-6 space-y-5">
      <div>
        <label className="label">Amount</label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {QUICK.map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setAmountNaira(n)}
              className={`rounded-full py-2 text-sm border ${
                amountNaira === n
                  ? "bg-ink text-white border-ink"
                  : "border-ink/15 text-ink"
              }`}
            >
              ₦{n.toLocaleString()}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={500}
          step={100}
          className="field mt-3"
          value={amountNaira}
          onChange={(e) => setAmountNaira(Number(e.target.value))}
          inputMode="numeric"
        />
        <div className="mt-2 text-xs text-muted">
          You pay {formatNaira(Number(totalKobo))} (5% platform fee:&nbsp;
          {formatNaira(Number(platformFeeKobo))}). Recipient gets {formatNaira(Number(amountKobo))}.
        </div>
      </div>

      <div className="space-y-1">
        <label className="label">Your name</label>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <label className="label">Email</label>
        <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <label className="label">Phone (optional)</label>
        <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
        Make my contribution anonymous
      </label>

      {error && <p className="text-sm text-[var(--accent)]">{error}</p>}

      <button className="btn-primary w-full py-4" disabled={!valid || busy}>
        {busy ? "Starting…" : `Pay ${formatNaira(Number(totalKobo))}`}
      </button>
      <p className="text-xs text-muted text-center">Secure payment by Paystack</p>
    </form>
  );
}
