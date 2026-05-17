"use client";

import { useState } from "react";
import { Gift, Loader2 } from "lucide-react";
import { formatNaira } from "@/lib/utils";

export function ClaimButton({ slug, amountKobo }: { slug: string; amountKobo: number }) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function trigger() {
    setLoading(true); setError(null);
    const res = await fetch("/api/paystack/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Could not send gift");
      return;
    }
    location.reload();
  }

  if (!confirm) {
    return (
      <button className="w-full btn-accent py-5 text-base shadow-glow inline-flex" onClick={() => setConfirm(true)}>
        <Gift className="size-5" /> Receive your gift
      </button>
    );
  }

  return (
    <div className="card">
      <p className="serif text-ink text-xl">Send {formatNaira(amountKobo)} now?</p>
      <p className="text-ink/60 text-sm mt-1">Goes straight to the saved bank account.</p>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button className="btn-outline flex-1" onClick={() => setConfirm(false)} disabled={loading}>Not yet</button>
        <button className="btn-accent flex-1 inline-flex" onClick={trigger} disabled={loading}>
          {loading ? <><Loader2 className="size-4 animate-spin" /> Sending…</> : "Yes, send"}
        </button>
      </div>
    </div>
  );
}
