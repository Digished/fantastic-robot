"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Plus, Users, Settings, LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";

export function MobileNav({
  showCreate,
  createHref,
  createLabel,
  pendingRequests,
}: {
  showCreate: boolean;
  createHref: string;
  createLabel: string;
  pendingRequests: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Menu"
        className="relative text-ink/70 hover:text-ink p-1"
      >
        <Menu className="size-6" />
        {pendingRequests > 0 && (
          <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-[var(--accent)]" />
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 max-w-[80%] bg-white shadow-card p-5 flex flex-col gap-1">
            <div className="flex items-center justify-between mb-3">
              <span className="serif text-xl text-ink">Menu</span>
              <button onClick={() => setOpen(false)} className="text-ink/40 hover:text-ink"><X className="size-5" /></button>
            </div>

            {showCreate && (
              <Link href={createHref} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-ink/5 text-ink">
                <Plus className="size-5 text-[var(--accent)]" /> {createLabel}
              </Link>
            )}
            <Link href="/dashboard/friends" onClick={() => setOpen(false)} className="flex items-center justify-between rounded-2xl px-3 py-3 hover:bg-ink/5 text-ink">
              <span className="flex items-center gap-3"><Users className="size-5 text-ink/60" /> Friends</span>
              {pendingRequests > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-[var(--accent)] text-white text-xs grid place-items-center">{pendingRequests}</span>
              )}
            </Link>
            <Link href="/dashboard/settings" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-ink/5 text-ink">
              <Settings className="size-5 text-ink/60" /> Settings
            </Link>
            <form action={logout} className="mt-auto">
              <button className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-ink/5 text-ink/70">
                <LogOut className="size-5" /> Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
