"use client";

import { Pencil } from "lucide-react";

/**
 * Tiny pencil icon next to the things you can click to edit. Used through
 * the WYSIWYG editor so creators can tell at a glance which surfaces are
 * editable versus which are preview chrome.
 */
export function EditHint({
  label,
  className = "",
  tone = "light",
}: {
  /** Optional short caption that sits next to the pencil (e.g. "Edit"). */
  label?: string;
  className?: string;
  tone?: "light" | "dark";
}) {
  const colour = tone === "dark" ? "text-white/55" : "text-ink/35";
  return (
    <span
      aria-hidden
      className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] ${colour} ${className}`}
    >
      <Pencil className="size-3" />
      {label && <span>{label}</span>}
    </span>
  );
}
