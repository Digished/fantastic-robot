"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Search } from "lucide-react";

export type Bank = { name: string; code: string };

export function BankCombobox({
  banks,
  value,
  onChange,
}: {
  banks: Bank[];
  value: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = banks.find((b) => b.code === value) ?? null;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q ? banks.filter((b) => b.name.toLowerCase().includes(q)) : banks;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="field text-left flex items-center justify-between"
      >
        <span className={selected ? "text-ink" : "text-ink/40"}>
          {selected ? selected.name : "Search for a bank…"}
        </span>
        <Search className="size-4 text-ink/40 shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 left-0 right-0 rounded-2xl bg-white shadow-card border border-ink/8 overflow-hidden">
          <div className="px-3 py-2 border-b border-ink/8 flex items-center gap-2">
            <Search className="size-4 text-ink/40 shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a bank name…"
              className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink/40"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto py-1" role="listbox">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-ink/50">
                No banks match &ldquo;{query}&rdquo;
              </li>
            )}
            {filtered.map((b) => (
              <li key={b.code}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(b.code);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between gap-3 hover:bg-ink/5 ${
                    b.code === value
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "text-ink"
                  }`}
                  role="option"
                  aria-selected={b.code === value}
                >
                  <span>{b.name}</span>
                  {b.code === value && <Check className="size-4 shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
