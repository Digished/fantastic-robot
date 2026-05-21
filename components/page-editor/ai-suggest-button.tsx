"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

type Field = "title" | "tagline" | "message";

/**
 * A small "AI" affordance next to an editable landing-page field. Tapping it
 * fetches three on-brand suggestions for that field and shows them in a
 * popover; picking one writes it into the field.
 */
export function AiSuggestButton({
  field,
  recipientName,
  eventType,
  celebrantDescription,
  current,
  onPick,
}: {
  field: Field;
  recipientName: string;
  eventType: string;
  celebrantDescription: string;
  current: string;
  onPick: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/suggest-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, recipientName, eventType, celebrantDescription, current }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Couldn't get suggestions.");
        setSuggestions([]);
      } else if (!json.suggestions?.length) {
        setError("No suggestions came back — try again.");
      } else {
        setSuggestions(json.suggestions);
      }
    } catch {
      setError("Couldn't reach the suggester.");
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (suggestions.length === 0) void load();
  }

  const canSuggest = !!recipientName.trim();

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        disabled={!canSuggest}
        title={canSuggest ? "Get AI suggestions" : "Add the recipient's name first"}
        className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)]/12 text-[var(--accent)] px-2 py-1 text-[11px] font-medium hover:bg-[var(--accent)]/20 transition disabled:opacity-40"
      >
        <Sparkles className="size-3" /> AI
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-72 rounded-2xl bg-white shadow-card ring-1 ring-ink/10 p-2">
          <div className="flex items-center justify-between px-1.5 pb-1.5">
            <p className="text-[10px] uppercase tracking-widest text-ink/45">AI suggestions</p>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="text-[11px] text-[var(--accent)] hover:underline disabled:opacity-50"
            >
              {loading ? "Thinking…" : "Refresh"}
            </button>
          </div>

          {loading && suggestions.length === 0 && (
            <div className="flex items-center gap-2 px-2 py-3 text-sm text-ink/55">
              <Loader2 className="size-4 animate-spin" /> Writing options…
            </div>
          )}
          {error && <p className="px-2 py-2 text-xs text-red-600">{error}</p>}

          <div className="space-y-1">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { onPick(s); setOpen(false); }}
                className="w-full text-left rounded-xl px-2.5 py-2 text-sm text-ink hover:bg-[var(--accent)]/8 transition"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
