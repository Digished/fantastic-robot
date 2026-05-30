"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { formatNaira } from "@/lib/utils";
import { deleteCelebration } from "./actions";

/**
 * A small trash button overlaid on a dashboard card. Works for any page the
 * creator owns — published or not. Confirms before firing (with a stronger
 * warning when real money is attached), then refreshes the dashboard.
 */
export function DeleteCelebrationButton({
  slug,
  title,
  raisedKobo = 0,
}: {
  slug: string;
  title: string;
  raisedKobo?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const message =
      raisedKobo > 0
        ? `Delete "${title}"? It received ${formatNaira(raisedKobo)} in gifts. This permanently removes the page and ALL its messages, gifts and payment records. This cannot be undone.`
        : `Delete "${title}"? This permanently removes the page and everything on it. This cannot be undone.`;
    if (!window.confirm(message)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCelebration(slug);
      if (result.error) {
        setError(result.error);
        window.alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title={error ?? "Delete this page"}
      aria-label="Delete celebration"
      className="absolute top-3 left-3 grid size-7 place-items-center rounded-full bg-white/85 text-ink/60 hover:bg-white hover:text-red-600 transition disabled:opacity-50"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
