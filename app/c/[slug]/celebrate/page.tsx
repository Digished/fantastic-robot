import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDate } from "@/lib/time";
import { WallGrid } from "../wall-grid";
import { ClaimButton } from "../claim-button";
import { isTheme, type Theme } from "@/lib/themes";
import { AnimatedNaira } from "@/components/animated-counter";
import { Sparkles } from "@/components/sparkles";
import { FeaturedRotator } from "./featured-rotator";

export const dynamic = "force-dynamic";

function coverUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

export default async function CelebrantPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data: page } = await supabase
    .from("celebrations")
    .select(
      "id, slug, title, recipient_name, event_type, celebration_date, deadline_at, claimable_at, status, message_from_creator, total_raised_kobo, contributor_count, payout_status, recipient_account_name, cover_photo_path, creator_id, theme",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!page) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const isCreator = !!user && user.id === page.creator_id;
  const theme: Theme = isTheme(page.theme) ? page.theme : "ivory";

  const { data: messages } = await supabase
    .from("messages")
    .select("id, contributor_name, is_anonymous, body, media_kind, media_path, media_duration_ms, created_at")
    .eq("celebration_id", page.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  const now = Date.now();
  const claimable = new Date(page.claimable_at).getTime() <= now;
  const cover = coverUrl(page.cover_photo_path);

  return (
    <main className="min-h-[100dvh] bg-white pb-32" data-theme={theme}>
      <div className="page-shell pt-4">

        {/* CINEMATIC HERO */}
        <section className="relative rounded-3xl2 overflow-hidden shadow-card">
          <div className="relative aspect-[4/5]">
            {cover ? (
              <div className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt="" className="absolute inset-0 size-full object-cover ken-burns" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/85" />
              </div>
            ) : (
              <div className="absolute inset-0 theme-mesh" />
            )}

            {/* sparkle layer */}
            <Sparkles count={10} />

            <div className="absolute inset-0 flex flex-col">
              <header className="relative z-10 px-5 pt-5 flex items-center justify-between">
                <Link href={`/c/${slug}`} className="serif text-lg text-white drop-shadow">Spendbox</Link>
                <span className="glass-dark rounded-full px-3 py-1 text-[10px] uppercase tracking-widest text-white">
                  For you
                </span>
              </header>

              <div className="relative z-10 mt-auto px-5 pb-8 text-white">
                <p className="fade-up text-[10px] uppercase tracking-[0.35em] text-white/85">
                  {page.event_type.replace("_", " ")} · {formatDate(page.celebration_date)}
                </p>
                <h1 className="fade-up mt-3 serif text-5xl leading-[0.95] drop-shadow-sm">
                  Hi {page.recipient_name.split(" ")[0]},
                </h1>
                <p className="fade-up mt-3 text-white/90 text-lg leading-snug">
                  Your friends made you something.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* GIFT CARD */}
        <div className="mt-3 rounded-3xl2 bg-white shadow-ring p-5 fade-up text-center">
          <p className="text-[10px] uppercase tracking-widest text-ink/55">Your gift</p>
          <p className="serif text-5xl mt-2 shimmer-text">
            <AnimatedNaira kobo={Number(page.total_raised_kobo)} />
          </p>
          <p className="text-xs text-ink/55 mt-2">
            from {page.contributor_count} {page.contributor_count === 1 ? "person" : "people"}
          </p>

          {claimable && page.payout_status !== "paid" && Number(page.total_raised_kobo) > 0 && (
            <div className="mt-5">
              <ClaimButton slug={page.slug} amountKobo={Number(page.total_raised_kobo)} />
            </div>
          )}
          {claimable && page.payout_status === "paid" && (
            <p className="mt-5 text-sm text-ink/70">
              ✓ Gift delivered to {page.recipient_account_name}
            </p>
          )}
          {!claimable && (
            <p className="mt-5 text-xs text-ink/55">
              Unlocks on {formatDate(page.celebration_date)}
            </p>
          )}
        </div>

        {/* Creator's note */}
        {page.message_from_creator && (
          <blockquote className="mt-8 serif text-ink text-2xl leading-tight italic fade-up text-center">
            "{page.message_from_creator}"
          </blockquote>
        )}

        {/* FEATURED ROTATING CARD */}
        <section className="mt-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-ink/45 mb-3 text-center">
            A note for you
          </p>
          <FeaturedRotator messages={messages ?? []} />
        </section>

        {/* WALL */}
        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="serif text-3xl text-ink">Every message</h2>
            <p className="text-[10px] uppercase tracking-widest text-ink/45">
              {messages?.length ?? 0} cards
            </p>
          </div>
          <WallGrid
            messages={messages ?? []}
            celebrationId={page.id}
            slug={page.slug}
            isCreator={isCreator}
          />
        </section>

        <footer className="mt-16 text-center">
          <p className="text-[11px] text-ink/45">Made with Spendbox · for {page.recipient_name}</p>
        </footer>
      </div>
    </main>
  );
}
