"use client";

import { useEffect, useRef } from "react";

/**
 * A text input that visually disappears into the surrounding rendered text.
 * It always looks like display text — no obvious form field — but reveals a
 * subtle background on hover and a focus ring while editing, so the editor
 * feels like a live page rather than a stack of inputs.
 */
export function InlineText({
  value,
  onChange,
  placeholder,
  multiline = false,
  maxLength,
  className = "",
  ariaLabel,
  tone = "light",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
  maxLength?: number;
  className?: string;
  ariaLabel?: string;
  /**
   * Pick "dark" when the field sits on a coloured slide card so hover and
   * focus affordances stay visible against a dark backdrop.
   */
  tone?: "light" | "dark";
}) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!multiline) return;
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, multiline]);

  const toneClasses =
    tone === "dark"
      ? "hover:bg-white/10 focus:bg-white/15 focus:ring-1 focus:ring-white/40 placeholder:text-white/40 text-white"
      : "hover:bg-ink/[0.04] focus:bg-white/90 focus:ring-1 focus:ring-[var(--accent)]/40 placeholder:text-ink/30";
  const shared = `w-full bg-transparent outline-none rounded-md transition px-1.5 -mx-1.5 ${toneClasses}`;

  if (multiline) {
    return (
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={1}
        aria-label={ariaLabel ?? placeholder}
        className={`${shared} resize-none overflow-hidden border-0 ${className}`}
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      aria-label={ariaLabel ?? placeholder}
      className={`${shared} border-0 ${className}`}
    />
  );
}
