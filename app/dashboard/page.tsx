import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { formatNaira } from "@/lib/utils";

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
    <main className="min-h-[100dvh] px-5 pt-6 pb-24 max-w-md mx-auto">
      <header className="flex items-center justify-between">
        <span className="font-serif text-2xl text-plum">Spendbox</span>
        <form action={logout}>
          <button className="text-sm text-plum/60">Sign out</button>
        </form>
      </header>

      <h1 className="font-serif text-4xl text-plum mt-8">Your celebrations</h1>

      <div className="mt-6 space-y-3">
        {!pages?.length && (
          <div className="card text-center">
            <p className="text-plum/70">Nothing here yet.</p>
            <Link href="/create" className="btn-primary mt-4 inline-flex">
              Create your first celebration
            </Link>
          </div>
        )}
        {pages?.map((p) => (
          <Link key={p.id} href={`/c/${p.slug}`} className="card block">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-serif text-xl text-plum">{p.title}</p>
                <p className="text-sm text-plum/60">For {p.recipient_name}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-plum">
                  {formatNaira(Number(p.total_raised_kobo ?? 0))}
                </p>
                <p className="text-xs text-muted">{p.contributor_count ?? 0} contributors</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <Link
        href="/create"
        className="btn-primary fixed bottom-6 left-1/2 -translate-x-1/2 shadow-card"
      >
        + New celebration
      </Link>
    </main>
  );
}
