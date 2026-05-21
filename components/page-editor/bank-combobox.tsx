"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Landmark, Search, X } from "lucide-react";
import { Portal } from "@/components/portal";

export type Bank = { name: string; code: string; slug?: string };

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

  const selected = banks.find((b) => b.code === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? banks
        .filter((b) => b.name.toLowerCase().includes(q))
        // Surface prefix matches ("gtb…") above mid-string matches.
        .sort((a, b) => {
          const ap = a.name.toLowerCase().startsWith(q) ? 0 : 1;
          const bp = b.name.toLowerCase().startsWith(q) ? 0 : 1;
          return ap - bp || a.name.localeCompare(b.name);
        })
    : banks;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="field text-left flex items-center justify-between"
      >
        <span className={selected ? "text-ink" : "text-ink/40"}>
          {selected ? selected.name : "Search for a bank…"}
        </span>
        <ChevronDown className="size-4 text-ink/40 shrink-0 ml-2" />
      </button>

      {open && (
        <Portal>
          <div
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/50 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
          >
            <div className="w-full sm:max-w-md bg-[#FDFCFB] rounded-t-[28px] sm:rounded-[28px] shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[75vh]">
              <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                <div className="w-10 h-1 rounded-full bg-ink/15" />
              </div>

              <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
                <p className="font-semibold text-ink text-[15px] inline-flex items-center gap-2">
                  <Landmark className="size-4 text-[var(--accent)]" /> Choose a bank
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="grid size-7 place-items-center rounded-full bg-ink/8 text-ink/50 hover:bg-ink/14 transition"
                  aria-label="Close"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <div className="px-5 pb-3 shrink-0">
                <div className="flex items-center gap-2 rounded-2xl bg-ink/6 px-3.5 py-2.5">
                  <Search className="size-4 text-ink/40 shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Type a bank name…"
                    className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink/40"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="text-ink/40 hover:text-ink/70"
                      aria-label="Clear"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <ul className="flex-1 overflow-y-auto px-2 pb-2" role="listbox">
                {filtered.length === 0 && (
                  <li className="px-4 py-6 text-sm text-ink/50 text-center">
                    No banks match &ldquo;{query}&rdquo;
                  </li>
                )}
                {filtered.map((b) => (
                  <li key={b.slug ?? b.code}>
                    <button
                      type="button"
                      onClick={() => { onChange(b.code); close(); }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-3 transition ${
                        b.code === value
                          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "text-ink hover:bg-ink/5"
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
              <div className="h-safe-b sm:hidden shrink-0" />
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
