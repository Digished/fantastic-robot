"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Home, ListChecks, MessageCircle, Gift, Users, Settings, LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";

/** Global slide-out menu shown on every page while signed in. */
export function NavMenu({ slug }: { slug: string | null }) {
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/dashboard", label: "Home", icon: Home },
    ...(slug
      ? [
          { href: `/c/${slug}/wishlist`, label: "Wishlist", icon: ListChecks },
          { href: `/c/${slug}/messages`, label: "Messages", icon: MessageCircle },
          { href: `/c/${slug}/gifts`, label: "Gifts", icon: Gift },
        ]
      : []),
    { href: "/dashboard/friends", label: "Friends", icon: Users },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Menu"
        className="fixed top-3 right-3 z-[60] grid size-10 place-items-center rounded-full bg-white/85 backdrop-blur shadow-ring text-ink/70 hover:text-ink transition"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 max-w-[82%] bg-white shadow-card p-5 flex flex-col gap-1">
            <div className="flex items-center justify-between mb-3">
              <span className="serif text-xl text-ink">Menu</span>
              <button onClick={() => setOpen(false)} className="text-ink/40 hover:text-ink"><X className="size-5" /></button>
            </div>

            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href + label}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-ink/5 text-ink"
              >
                <Icon className="size-5 text-ink/60" /> {label}
              </Link>
            ))}

            <form action={logout} className="mt-auto">
              <button className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-ink/5 text-ink/70">
                <LogOut className="size-5" /> Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
