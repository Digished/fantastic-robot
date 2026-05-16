"use client";

import { useState } from "react";
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
      <button className="w-full btn-accent py-5 text-base shadow-glow" onClick={() => setConfirm(true)}>
        🎁 Receive your gift · {formatNaira(amountKobo)}
      </button>
    );
  }

  return (
    <div className="glass rounded-3xl2 p-5">
      <p className="font-serif text-plum text-xl">Send {formatNaira(amountKobo)} now?</p>
      <p className="text-plum/60 text-sm mt-1">Goes straight to the saved bank account.</p>
      {error && <p className="text-sm text-terracotta mt-2">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button className="btn-outline flex-1" onClick={() => setConfirm(false)} disabled={loading}>Not yet</button>
        <button className="btn-accent flex-1" onClick={trigger} disabled={loading}>
          {loading ? "Sending…" : "Yes, send"}
        </button>
      </div>
    </div>
  );
}
