import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { formatNaira } from "@/lib/utils";
import { formatDate } from "@/lib/time";

export default async function Dashboard() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const { data: pages } = await supabase
    .from("celebrations")
    .select("id, slug, title, recipient_name, event_type, celebration_date, status, total_raised_kobo, contributor_count, theme")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-[100dvh] bg-white pb-32">
      <div className="mx-auto max-w-6xl px-5 md:px-10">

        {/* Header */}
        <header className="py-5 md:py-7 flex items-center justify-between border-b border-ink/8">
          <Link href="/" className="serif text-2xl text-ink">Spendbox</Link>
          <div className="flex items-center gap-4">
            <Link href="/create" className="btn-accent shadow-soft hidden md:inline-flex gap-2">
              <Plus className="size-4" /> New celebration
            </Link>
            <form action={logout}>
              <button className="text-sm text-ink/55 hover:text-ink transition">Sign out</button>
            </form>
          </div>
        </header>

        <div className="pt-8 md:pt-12">
          <h1 className="fade-up serif text-5xl md:text-6xl text-ink">Your<br className="md:hidden" /> celebrations</h1>

          <div className="mt-8 grid md:grid-cols-2 gap-4">
            {!pages?.length && (
              <div className="md:col-span-2 card text-center py-12">
                <p className="serif text-3xl text-ink">Nothing here yet.</p>
                <p className="text-ink/55 mt-3 text-sm">Build a beautiful page in two minutes.</p>
                <Link href="/create" className="btn-accent mt-6 inline-flex">+ Create your first page</Link>
              </div>
            )}
            {pages?.map((p, i) => (
              <Link
                key={p.id}
                href={`/c/${p.slug}`}
                data-theme={p.theme ?? "ivory"}
                className="card flex items-stretch gap-5 hover:shadow-card transition fade-up group"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                {/* Theme swatch */}
                <div className="w-20 shrink-0 rounded-2xl theme-mesh self-stretch" />

                <div className="min-w-0 flex-1 py-1">
                  <p className="text-[10px] uppercase tracking-widest text-ink/50 font-medium">
                    {p.event_type.replace(/_/g, " ")}
                  </p>
                  <p className="serif text-2xl text-ink mt-1 truncate group-hover:text-[var(--accent)] transition">
                    {p.title}
                  </p>
                  <p className="text-sm text-ink/55 mt-1">For {p.recipient_name}</p>
                  <p className="text-xs text-ink/40 mt-0.5">{formatDate(p.celebration_date)}</p>
                </div>

                <div className="text-right shrink-0 py-1">
                  <p className="serif text-xl text-[var(--accent)]">{formatNaira(Number(p.total_raised_kobo ?? 0))}</p>
                  <p className="text-xs text-ink/45 mt-1">{p.contributor_count ?? 0} contributors</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      <Link href="/create" className="btn-accent fixed bottom-6 right-6 shadow-glow z-20 md:hidden gap-2">
        <Plus className="size-4" /> New
      </Link>
    </main>
  );
}
