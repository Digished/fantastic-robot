import Link from "next/link";
import { Sparkles, ChevronRight } from "lucide-react";

// A lightweight onboarding checklist. Each completed item disappears; the whole
// card hides once everything's done.
export function DashboardChecklist({
  hasBirthdayPage,
  hasUsername,
  hasPhoto,
  referralCount,
  messageCount,
  giftCount,
}: {
  hasBirthdayPage: boolean;
  hasUsername: boolean;
  hasPhoto: boolean;
  referralCount: number;
  messageCount: number;
  giftCount: number;
}) {
  const items = [
    { label: "Create your birthday page", href: "/create/me", done: hasBirthdayPage },
    { label: "Pick a username", href: "/dashboard/settings", done: hasUsername },
    { label: "Add a profile photo", href: "/dashboard/settings", done: hasPhoto },
    {
      label: "Invite 10 friends to join",
      href: "/dashboard/friends",
      done: referralCount >= 10,
      progress: `${Math.min(referralCount, 10)}/10`,
    },
    {
      label: "Send 10 birthday messages",
      href: "/dashboard/friends",
      done: messageCount >= 10,
      progress: `${Math.min(messageCount, 10)}/10`,
    },
    {
      label: "Send 10 gifts",
      href: "/dashboard/friends",
      done: giftCount >= 10,
      progress: `${Math.min(giftCount, 10)}/10`,
    },
  ];
  const remaining = items.filter((i) => !i.done);
  if (remaining.length === 0) return null;

  return (
    <section className="card mb-6 fade-up">
      <div className="flex items-center gap-2 mb-3">
        <span className="size-8 rounded-full grid place-items-center" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
          <Sparkles className="size-4" />
        </span>
        <div>
          <h2 className="serif text-lg text-ink leading-none">Get started</h2>
          <p className="text-[11px] text-ink/45 mt-1">{remaining.length} left</p>
        </div>
      </div>
      <ul className="divide-y divide-ink/8">
        {remaining.map((i) => (
          <li key={i.label}>
            <Link href={i.href} className="flex items-center gap-3 py-2.5 group">
              <span className="size-5 rounded-full border-2 border-ink/20 shrink-0 group-hover:border-[var(--accent)] transition" />
              <span className="text-sm text-ink flex-1">{i.label}</span>
              {"progress" in i && i.progress && (
                <span className="text-xs text-ink/45">{i.progress}</span>
              )}
              <ChevronRight className="size-4 text-ink/30 group-hover:text-[var(--accent)] transition" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
