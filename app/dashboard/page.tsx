import Link from "next/link";
import { redirect } from "next/navigation";
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
      <div className="page-shell pt-6">
        <header className="flex items-center justify-between">
          <Link href="/" className="serif text-2xl text-ink">Spendbox</Link>
          <form action={logout}><button className="text-sm text-ink/55 hover:text-ink">Sign out</button></form>
        </header>

        <h1 className="fade-up serif text-5xl text-ink mt-12">Your<br/>celebrations</h1>

        <div className="mt-8 space-y-3">
          {!pages?.length && (
            <div className="card text-center">
              <p className="serif text-2xl text-ink">Nothing here yet.</p>
              <p className="text-ink/55 mt-2 text-sm">Build a beautiful page in a minute.</p>
              <Link href="/create" className="btn-accent mt-5 inline-flex">+ Create your first page</Link>
            </div>
          )}
          {pages?.map((p, i) => (
            <Link
              key={p.id}
              href={`/c/${p.slug}`}
              data-theme={p.theme ?? "ivory"}
              className="card flex items-stretch gap-4 hover:shadow-card transition fade-up"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div className="size-16 shrink-0 rounded-2xl theme-mesh" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-widest text-ink/50">{p.event_type.replace("_", " ")}</p>
                <p className="serif text-2xl text-ink mt-0.5 truncate">{p.title}</p>
                <p className="text-sm text-ink/55 mt-0.5">For {p.recipient_name} · {formatDate(p.celebration_date)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="serif text-xl text-[var(--accent)]">{formatNaira(Number(p.total_raised_kobo ?? 0))}</p>
                <p className="text-xs text-ink/45 mt-1">{p.contributor_count ?? 0} cards</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Link href="/create" className="btn-accent fixed bottom-6 left-1/2 -translate-x-1/2 shadow-glow z-20">
        + New celebration
      </Link>
    </main>
  );
}
