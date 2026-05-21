import Link from "next/link";
import { LogOut } from "lucide-react";
import { adminLogout } from "../logout";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/celebrations", label: "Celebrations" },
  { href: "/admin/sounds", label: "Sounds" },
] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-[#FAFAF8] text-ink">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center gap-6">
          <Link href="/admin" className="font-semibold tracking-tight">
            spendbox <span className="text-ink/40 font-normal">/ admin</span>
          </Link>
          <nav className="flex gap-1 ml-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 text-sm rounded-full text-ink/70 hover:text-ink hover:bg-ink/5 transition"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={adminLogout} className="ml-auto">
            <button
              type="submit"
              className="flex items-center gap-1.5 text-sm text-ink/55 hover:text-ink transition"
            >
              <LogOut className="size-3.5" /> Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
