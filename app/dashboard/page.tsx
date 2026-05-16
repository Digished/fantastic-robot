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
    .select("id, slug, title, recipient_name, event_type, celebration_date, status, total_raised_kobo, contributor_count")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="relative min-h-[100dvh] mesh-warm grain pb-32">
      <div className="relative z-10 px-5 pt-6 max-w-md mx-auto">
        <header className="flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl text-plum">Spendbox</Link>
          <form action={logout}><button className="text-sm text-plum/60 hover:text-plum">Sign out</button></form>
        </header>

        <h1 className="fade-up font-serif text-5xl text-plum mt-10">Your<br/>celebrations</h1>

        <div className="mt-8 space-y-3">
          {!pages?.length && (
            <div className="glass rounded-3xl2 p-8 text-center">
              <p className="font-serif text-2xl text-plum">Nothing here yet.</p>
              <p className="text-plum/60 mt-2 text-sm">Build a beautiful page in a minute.</p>
              <Link href="/create" className="btn-accent mt-5 inline-flex">+ Create your first page</Link>
            </div>
          )}
          {pages?.map((p, i) => (
            <Link key={p.id} href={`/c/${p.slug}`} className="glass rounded-3xl2 p-5 block fade-up" style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-widest text-plum/50">{p.event_type.replace("_", " ")}</p>
                  <p className="font-serif text-2xl text-plum mt-1 truncate">{p.title}</p>
                  <p className="text-sm text-plum/60 mt-1">For {p.recipient_name} · {formatDate(p.celebration_date)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-serif text-2xl text-terracotta">{formatNaira(Number(p.total_raised_kobo ?? 0))}</p>
                  <p className="text-xs text-plum/50 mt-1">{p.contributor_count ?? 0} cards</p>
                </div>
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
