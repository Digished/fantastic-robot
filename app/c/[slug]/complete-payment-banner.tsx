"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { restartCreationPayment } from "@/app/create/actions";

/**
 * Shown to the creator on an unpaid page. The page is fully editable in this
 * state — this just lets them finish the one-time setup fee whenever they're
 * ready (e.g. after abandoning the first payment attempt).
 */
export function CompletePaymentBanner({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setLoading(true);
    setError(null);
    const res = await restartCreationPayment(slug);
    if (res.authorizationUrl) {
      window.location.href = res.authorizationUrl;
      return;
    }
    if (res.alreadyPaid) {
      window.location.reload();
      return;
    }
    setError(res.error ?? "Could not start payment.");
    setLoading(false);
  }

  return (
    <div className="rounded-3xl2 border border-amber-300/70 bg-amber-50 p-5 fade-up">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-600">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">This page isn&apos;t live yet</p>
          <p className="text-sm text-ink/65 mt-0.5">
            Only you can see it. Keep editing as much as you like, then complete the
            one-time ₦500 setup fee to publish and start collecting gifts.
          </p>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          <div className="flex flex-wrap gap-2.5 mt-3.5">
            <button
              type="button"
              onClick={pay}
              disabled={loading}
              className="btn-accent shadow-soft text-sm inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {loading ? <><Loader2 className="size-4 animate-spin" /> Starting…</> : "Complete payment & publish"}
            </button>
            <a href={`/c/${slug}/edit`} className="btn-outline text-sm inline-flex">
              Keep editing
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
