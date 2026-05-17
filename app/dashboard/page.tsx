import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { formatNaira } from "@/lib/utils";
import { formatDate } from "@/lib/time";

function coverUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

export default async function Dashboard() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const { data: pages } = await supabase
    .from("celebrations")
    .select("id, slug, title, recipient_name, event_type, celebration_date, status, total_raised_kobo, contributor_count, theme, cover_photo_path, is_paid_for_creation")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-[100dvh] bg-white pb-28">
      <div className="mx-auto max-w-6xl px-5 md:px-10">

        {/* Header */}
        <header className="py-5 md:py-7 flex items-center justify-between border-b border-ink/8">
          <Link href="/" className="serif text-xl md:text-2xl text-ink">Spendbox</Link>
          <div className="flex items-center gap-4">
            <Link href="/create" className="btn-accent shadow-soft hidden md:inline-flex gap-2">
              <Plus className="size-4" /> New celebration
            </Link>
            <form action={logout}>
              <button className="text-sm text-ink/55 hover:text-ink transition">Sign out</button>
            </form>
          </div>
        </header>

        <div className="pt-7 md:pt-12">
          <h1 className="fade-up serif text-4xl md:text-6xl text-ink">
            Your<br className="md:hidden" /> celebrations
          </h1>

          <div className="mt-7 md:mt-8 grid sm:grid-cols-2 gap-4">
            {!pages?.length && (
              <div className="sm:col-span-2 card text-center py-12">
                <p className="serif text-3xl text-ink">Nothing here yet.</p>
                <p className="text-ink/55 mt-3 text-sm">Build a beautiful page in two minutes.</p>
                <Link href="/create" className="btn-accent mt-6 inline-flex">+ Create your first page</Link>
              </div>
            )}
            {pages?.map((p, i) => {
              const cover = coverUrl(p.cover_photo_path);
              return (
                <Link
                  key={p.id}
                  href={p.is_paid_for_creation === false ? `/c/${p.slug}/post-payment` : `/c/${p.slug}`}
                  data-theme={p.theme ?? "ivory"}
                  className="group rounded-3xl2 overflow-hidden bg-white shadow-ring hover:shadow-card transition fade-up"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  {/* Cover */}
                  <div className="relative aspect-[16/10]">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" className="absolute inset-0 size-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 theme-mesh" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                    {p.is_paid_for_creation === false ? (
                      <span className="absolute top-3 right-3 bg-amber-500 text-white rounded-full px-2.5 py-1 text-[10px] uppercase tracking-widest">
                        Awaiting payment
                      </span>
                    ) : p.status !== "active" && (
                      <span className="absolute top-3 right-3 glass-dark text-white rounded-full px-2.5 py-1 text-[10px] uppercase tracking-widest">
                        {p.status}
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <p className="text-[10px] uppercase tracking-widest text-white/75">
                        {p.event_type.replace(/_/g, " ")}
                      </p>
                      <p className="serif text-2xl leading-tight mt-0.5 truncate">{p.title}</p>
                      <p className="text-sm text-white/80">For {p.recipient_name}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="serif text-lg text-[var(--accent)]">
                        {formatNaira(Number(p.total_raised_kobo ?? 0))}
                      </p>
                      <p className="text-[11px] text-ink/45">{p.contributor_count ?? 0} contributors</p>
                    </div>
                    <p className="text-xs text-ink/45">{formatDate(p.celebration_date)}</p>
                  </div>
                </Link>
              );
            })}
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
