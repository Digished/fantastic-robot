import { notFound } from "next/navigation";
import { Lock, Gift } from "lucide-react";
import { loadCelebrationView } from "@/lib/celebration-view";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatNaira } from "@/lib/utils";
import { formatDate } from "@/lib/time";
import { YearTabs } from "../year-tabs";

export const dynamic = "force-dynamic";

export default async function GiftsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cycle?: string }>;
}) {
  const { slug } = await params;
  const { cycle } = await searchParams;
  const view = await loadCelebrationView(slug, cycle);
  if (!view) notFound();

  const { page, isCreator, viewCycle, sealed, years } = view;

  let gifts: { id: string; contributor_name: string; is_anonymous: boolean; amount_net_kobo: number }[] = [];
  let total = 0;
  if (!sealed) {
    const { data } = await supabaseAdmin()
      .from("contributions")
      .select("id, contributor_name, is_anonymous, amount_net_kobo")
      .eq("celebration_id", page.id)
      .eq("cycle", viewCycle)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(200);
    gifts = (data ?? []).map((g) => ({ ...g, amount_net_kobo: Number(g.amount_net_kobo) }));
    total = gifts.reduce((s, g) => s + g.amount_net_kobo, 0);
  }

  return (
    <main className="min-h-[100dvh] bg-white pb-24" data-theme={page.theme ?? "ivory"}>
      <div className="mx-auto max-w-2xl px-5 md:px-10 pt-6 space-y-6">
        <YearTabs slug={slug} active="gifts" viewCycle={viewCycle} years={years} />

        <div className="flex items-end justify-between">
          <h1 className="serif text-3xl text-ink">Gifts</h1>
          {!sealed && isCreator && gifts.length > 0 && (
            <div className="text-right">
              <p className="serif text-2xl text-[var(--accent)]">{formatNaira(total)}</p>
              <p className="text-[11px] text-ink/45">{gifts.length} gifts</p>
            </div>
          )}
        </div>

        {sealed ? (
          <div className="card text-center py-12">
            <Lock className="size-7 text-[var(--accent)] mx-auto" />
            <p className="serif text-xl text-ink mt-3">Sealed until the day</p>
            <p className="text-ink/55 text-sm mt-1.5">
              Gifts stay hidden until {formatDate(page.celebration_date)}, then it&apos;s all revealed.
            </p>
          </div>
        ) : gifts.length === 0 ? (
          <p className="text-ink/50 text-sm">No gifts this year yet.</p>
        ) : (
          <ul className="space-y-2">
            {gifts.map((g) => (
              <li key={g.id} className="card flex items-center justify-between py-3">
                <span className="inline-flex items-center gap-2 text-ink">
                  <Gift className="size-4 text-[var(--accent)]" />
                  {g.is_anonymous ? "Someone special" : g.contributor_name}
                </span>
                {isCreator && <span className="text-ink/60 text-sm">{formatNaira(g.amount_net_kobo)}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
