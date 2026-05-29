import Link from "next/link";
import { Gift, MessageCircle, ListChecks, ArrowLeft } from "lucide-react";

type Tab = "wishlist" | "messages" | "gifts";

const TABS: { id: Tab; label: string; icon: typeof Gift }[] = [
  { id: "wishlist", label: "Wishlist", icon: ListChecks },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "gifts", label: "Gifts", icon: Gift },
];

/** Page switcher (Wishlist / Messages / Gifts) + a year selector, shared by the
 * three sub-pages. Pure links — preserves the selected year across tabs. */
export function YearTabs({
  slug,
  active,
  viewCycle,
  years,
}: {
  slug: string;
  active: Tab;
  viewCycle: number;
  years: { cycle: number; year: number }[];
}) {
  const cycleQ = (cycle: number) => (cycle ? `?cycle=${cycle}` : "");
  return (
    <div className="space-y-4">
      <Link href={`/c/${slug}`} className="text-ink/55 text-sm hover:text-ink inline-flex items-center gap-1">
        <ArrowLeft className="size-4" /> Back to page
      </Link>

      <div className="flex gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            href={`/c/${slug}/${id}${cycleQ(viewCycle)}`}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm transition ${
              active === id
                ? "bg-[var(--accent)] text-white shadow-soft"
                : "bg-ink/5 text-ink/70 hover:bg-ink/10"
            }`}
          >
            <Icon className="size-4" /> {label}
          </Link>
        ))}
      </div>

      {years.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {years.map(({ cycle, year }) => (
            <Link
              key={cycle}
              href={`/c/${slug}/${active}?cycle=${cycle}`}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition ${
                cycle === viewCycle
                  ? "bg-ink text-white"
                  : "bg-ink/5 text-ink/60 hover:bg-ink/10"
              }`}
            >
              {year}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
