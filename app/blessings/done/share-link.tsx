"use client";

import { useState } from "react";

export function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 rounded-2xl border border-ink/15 px-4 py-3 text-sm text-ink/80 bg-white"
      />
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            /* clipboard blocked — the field is selectable as a fallback */
          }
        }}
        className="btn-primary px-5 whitespace-nowrap"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
