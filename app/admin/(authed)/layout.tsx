import Link from "next/link";
import { LogOut } from "lucide-react";
import { adminLogout } from "../logout";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/celebrations", label: "Celebrations" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/sounds", label: "Sounds" },
] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-[#FAFAF8] text-ink">
      <header className="border-b border-ink/10 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-5">
          {/* Top row: logo + sign out */}
          <div className="flex items-center justify-between py-3">
            <Link href="/admin" className="font-semibold tracking-tight">
              spendbox <span className="text-ink/40 font-normal">/ admin</span>
            </Link>
            <form action={adminLogout}>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-sm text-ink/55 hover:text-ink transition"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
          {/* Nav row — scrollable on mobile */}
          <nav className="flex gap-0.5 overflow-x-auto pb-px -mx-1 px-1 scrollbar-none">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap px-3 py-2 text-sm rounded-full text-ink/70 hover:text-ink hover:bg-ink/5 transition shrink-0"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 sm:px-5 py-6 sm:py-8">{children}</main>
    </div>
  );
}
