"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteUnpaidCelebration } from "./actions";

/**
 * A small trash button overlaid on the dashboard card for unpublished
 * celebrations. Confirms before firing the server action, refreshes the
 * dashboard on success.
 */
export function DeleteUnpaidButton({ slug, title }: { slug: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const confirmed = window.confirm(
      `Delete "${title}"? This unpublished page will be gone for good.`,
    );
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteUnpaidCelebration(slug);
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
      title={error ?? "Delete this unpublished page"}
      aria-label="Delete unpublished celebration"
      className="absolute top-3 left-3 grid size-7 place-items-center rounded-full bg-white/85 text-ink/60 hover:bg-white hover:text-red-600 transition disabled:opacity-50"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
