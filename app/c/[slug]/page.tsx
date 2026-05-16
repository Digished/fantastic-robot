import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/utils";
import { formatDate, timeUntil } from "@/lib/time";
import { WallGrid } from "./wall-grid";
import { ShareBar } from "./share-bar";
import { ClaimButton } from "./claim-button";

export const dynamic = "force-dynamic";

function coverUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

export default async function WallPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data: page } = await supabase
    .from("celebrations")
    .select(
      "id, slug, title, recipient_name, event_type, celebration_date, deadline_at, claimable_at, status, message_from_creator, total_raised_kobo, contributor_count, payout_status, recipient_account_name, cover_photo_path, creator_id",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!page) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const isCreator = !!user && user.id === page.creator_id;

  const { data: messages } = await supabase
    .from("messages")
    .select("id, contributor_name, is_anonymous, body, media_kind, media_path, media_duration_ms, created_at")
    .eq("celebration_id", page.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  const now = Date.now();
  const claimable = new Date(page.claimable_at).getTime() <= now;
  const closed = page.status !== "active" || new Date(page.deadline_at).getTime() <= now;
  const cover = coverUrl(page.cover_photo_path);

  return (
    <main className="relative min-h-[100dvh] mesh-warm grain pb-40">
      {/* HERO */}
      <section className="relative">
        <div className="relative h-[58vh] min-h-[440px] w-full overflow-hidden">
          {cover ? (
            // Full-bleed cover photo
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="" className="absolute inset-0 size-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-plum/10 via-plum/30 to-cream" />
            </>
          ) : (
            <div className="absolute inset-0 mesh-dusk" />
          )}

          <div className="absolute inset-0 flex flex-col">
            <header className="relative z-10 px-5 pt-6 flex items-center justify-between">
              <Link href="/" className="font-serif text-xl text-cream/90 drop-shadow">Spendbox</Link>
              {isCreator && (
                <Link
                  href={`/c/${page.slug}/edit`}
                  className="glass-dark rounded-full px-3 py-1.5 text-xs text-cream"
                >
                  Edit page
                </Link>
              )}
            </header>

            <div className="relative z-10 mt-auto px-5 pb-8 max-w-md mx-auto w-full text-cream">
              <p className="fade-up text-[11px] uppercase tracking-[0.3em] text-cream/80">
                {page.event_type.replace("_", " ")} · {formatDate(page.celebration_date)}
              </p>
              <h1 className="fade-up mt-3 font-serif text-[56px] leading-[0.95] drop-shadow-sm">
                {page.title}
              </h1>
              <p className="fade-up mt-2 text-cream/85 text-lg">For {page.recipient_name}</p>
            </div>
          </div>
        </div>

        {/* Floating stats card */}
        <div className="relative z-10 -mt-12 px-5 max-w-md mx-auto">
          <div className="glass rounded-3xl2 p-5 grid grid-cols-2 gap-4 shadow-card fade-up">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-plum/60">Raised</p>
              <p className="font-serif text-3xl text-plum mt-1">{formatNaira(Number(page.total_raised_kobo))}</p>
              <p className="text-xs text-plum/60 mt-1">{page.contributor_count} contributors</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-plum/60">
                {closed ? (claimable ? "Celebration" : "Closing") : "Closes in"}
              </p>
              <p className="font-serif text-3xl text-plum mt-1">
                {closed && claimable ? "today" : timeUntil(page.deadline_at)}
              </p>
              <p className="text-xs text-plum/60 mt-1">to {page.recipient_account_name}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Note + actions */}
      <section className="px-5 max-w-md mx-auto mt-6">
        {page.message_from_creator && (
          <blockquote className="fade-up font-serif text-plum text-2xl leading-tight italic">
            "{page.message_from_creator}"
          </blockquote>
        )}

        {claimable && page.payout_status !== "paid" && Number(page.total_raised_kobo) > 0 && (
          <div className="mt-6 fade-up"><ClaimButton slug={page.slug} amountKobo={Number(page.total_raised_kobo)} /></div>
        )}
        {claimable && page.payout_status === "paid" && (
          <p className="mt-6 text-center text-sm text-plum/70 fade-up">
            ✓ Gift delivered to {page.recipient_account_name}
          </p>
        )}

        {!closed && (
          <div className="mt-6 flex gap-3 fade-up">
            <Link href={`/c/${page.slug}/post`} className="btn-glass flex-1">Leave a message</Link>
            <Link href={`/c/${page.slug}/contribute`} className="btn-accent flex-1 shadow-soft">Contribute</Link>
          </div>
        )}
        {closed && !claimable && (
          <p className="mt-6 text-center text-sm text-plum/70 fade-up">
            Contributions closed. The gift unlocks on {formatDate(page.celebration_date)}.
          </p>
        )}

        <ShareBar slug={page.slug} title={page.title} recipient={page.recipient_name} />
      </section>

      {/* WALL */}
      <section className="px-4 mt-12 max-w-md mx-auto">
        <div className="px-1 flex items-baseline justify-between">
          <h2 className="font-serif text-3xl text-plum">The wall</h2>
          <p className="text-xs uppercase tracking-widest text-plum/50">{messages?.length ?? 0} cards</p>
        </div>
        <WallGrid
          messages={messages ?? []}
          celebrationId={page.id}
          slug={page.slug}
          isCreator={isCreator}
        />
      </section>
    </main>
  );
}
