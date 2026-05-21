"use client";

import { useState, type ReactNode } from "react";
import { Info, X } from "lucide-react";
import { Portal } from "@/components/portal";

/**
 * A small "(i)" chip that opens a clean explanatory modal. Used to explain
 * how cash contributions and bank redemption work, without cluttering the
 * form with paragraphs of helper text.
 */
export function InfoButton({
  title,
  label = "Why?",
  children,
}: {
  title: string;
  label?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent)] hover:opacity-80 transition"
      >
        <Info className="size-3.5" /> {label}
      </button>

      {open && (
        <Portal>
          <div
            className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center bg-ink/55 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          >
            <div className="w-full sm:max-w-md bg-[#FDFCFB] rounded-t-[28px] sm:rounded-[28px] shadow-2xl">
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-ink/15" />
              </div>
              <div className="flex items-start justify-between px-6 pt-5 pb-2 gap-3">
                <h3 className="serif text-2xl text-ink leading-tight">{title}</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-ink/8 text-ink/50 hover:bg-ink/14 transition"
                  aria-label="Close"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <div className="px-6 pb-6 pt-1 space-y-3 text-sm text-ink/70 leading-relaxed">
                {children}
              </div>
              <div className="px-6 pb-6 sm:pb-7">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-accent w-full shadow-soft"
                >
                  Got it
                </button>
              </div>
              <div className="h-safe-b sm:hidden" />
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
