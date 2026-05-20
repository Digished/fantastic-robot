"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteCustomMusic } from "./actions";

export function DeleteCustomButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const [pending, start] = useTransition();
  function onClick() {
    if (!confirm(`Delete “${label}”? This cannot be undone.`)) return;
    const fd = new FormData();
    fd.set("id", id);
    start(() => deleteCustomMusic(fd));
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-red-50 text-red-700 hover:bg-red-100 transition disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Trash2 className="size-3.5" />
      )}
      Delete
    </button>
  );
}
