"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X, Link2 } from "lucide-react";
import { checkSlugAvailable, updateCelebrationSlug } from "./actions";

type Status = "idle" | "checking" | "available" | "taken" | "invalid";

export function SlugEditor({ slug }: { slug: string }) {
  const router = useRouter();
  const [value, setValue] = useState(slug);
  const [status, setStatus] = useState<Status>("idle");
  const [hint, setHint] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, startSave] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dirty = value !== slug;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    setSaved(false);
    if (!dirty) { setStatus("idle"); setHint(null); return; }
    setStatus("checking");
    timer.current = setTimeout(async () => {
      const res = await checkSlugAvailable(value);
      if (res.error) { setStatus("invalid"); setHint(res.error); return; }
      setStatus(res.available ? "available" : "taken");
      setHint(res.available ? "This link is free" : "That link is taken — try another");
    }, 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value, dirty]);

  function onChange(raw: string) {
    // Mirror the server rules as you type: lowercase, hyphen-separated.
    const v = raw.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 40);
    setValue(v);
  }

  function save() {
    startSave(async () => {
      const res = await updateCelebrationSlug(slug, value);
      if (res.error) { setStatus("taken"); setHint(res.error); return; }
      if (res.slug && res.slug !== slug) {
        router.replace(`/c/${res.slug}/edit`);
        router.refresh();
      }
      setSaved(true);
    });
  }

  return (
    <div className="rounded-3xl2 bg-white shadow-ring p-5 space-y-3">
      <div>
        <p className="font-medium text-ink inline-flex items-center gap-2">
          <Link2 className="size-4 text-[var(--accent)]" /> Page link
        </p>
        <p className="text-xs text-ink/50 mt-0.5">
          Make it memorable. Changing it updates the shareable link — older links stop working.
        </p>
      </div>

      <div className="flex items-center rounded-2xl border border-ink/15 bg-white overflow-hidden focus-within:border-ink/30">
        <span className="pl-3.5 pr-1 text-sm text-ink/40 select-none shrink-0">/c/</span>
        <input
          className="flex-1 min-w-0 bg-transparent py-3 pr-3 text-sm text-ink outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          autoCapitalize="none"
          placeholder="my-birthday"
        />
        <span className="px-3 shrink-0">
          {status === "checking" && <Loader2 className="size-4 animate-spin text-ink/40" />}
          {status === "available" && <Check className="size-4 text-[var(--accent)]" />}
          {(status === "taken" || status === "invalid") && <X className="size-4 text-red-500" />}
        </span>
      </div>

      {hint && (
        <p className={`text-xs ${status === "available" ? "text-[var(--accent)]" : status === "checking" ? "text-ink/45" : "text-red-600"}`}>
          {hint}
        </p>
      )}
      {saved && !dirty && <p className="text-xs text-[var(--accent)] inline-flex items-center gap-1"><Check className="size-3.5" /> Link updated</p>}

      <button
        type="button"
        onClick={save}
        disabled={saving || !dirty || status !== "available"}
        className="btn-outline text-sm py-2 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Update link"}
      </button>
    </div>
  );
}
