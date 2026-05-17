import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/utils";
import { formatDate, timeUntil } from "@/lib/time";
import { WallGrid } from "./wall-grid";
import { ShareBar } from "./share-bar";
import { ClaimButton } from "./claim-button";
import { isTheme, type Theme } from "@/lib/themes";
import { AnimatedNaira } from "@/components/animated-counter";
import { Sparkles } from "@/components/sparkles";
import { CelebrantLinkButton } from "./celebrant-link-button";

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
    .select("id, contributor_name, is_anonymous, body, media_kind, media_path, media_duration_ms, interactive_kind, interactive_payload, contributor_session_id, created_at")
    .eq("celebration_id", page.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  const now = Date.now();
  const claimable = new Date(page.claimable_at).getTime() <= now;
  const closed = page.status !== "active" || new Date(page.deadline_at).getTime() <= now;
  const cover = coverUrl(page.cover_photo_path);

  return (
    <main className="min-h-[100dvh] bg-white pb-32" data-theme={theme}>
      <div className="page-shell pt-4">

        {/* HERO — constrained to phone width even on desktop */}
        <section className="relative rounded-3xl2 overflow-hidden shadow-card">
          <div className="relative aspect-[4/5]">
            {cover ? (
              <div className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt="" className="absolute inset-0 size-full object-cover ken-burns" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/75" />
              </div>
            ) : (
              <div className="absolute inset-0 theme-mesh" />
            )}

            <Sparkles count={8} />

            <div className="absolute inset-0 flex flex-col">
              <header className="relative z-10 px-5 pt-5 flex items-center justify-between">
                <Link href={isCreator ? "/dashboard" : "/"} className="serif text-lg text-white drop-shadow">Spendbox</Link>
                {isCreator && (
                  <Link
                    href={`/c/${page.slug}/edit`}
                    className="glass-dark rounded-full px-3 py-1.5 text-xs text-white"
                  >
                    Edit page
                  </Link>
                )}
              </header>

              <div className="relative z-10 mt-auto px-5 pb-6 text-white">
                <p className="fade-up text-[10px] uppercase tracking-[0.3em] text-white/85">
                  {page.event_type.replace("_", " ")} · {formatDate(page.celebration_date)}
                </p>
                <h1 className="fade-up mt-3 serif text-[44px] leading-[0.95] drop-shadow-sm">
                  {page.title}
                </h1>
                <p className="fade-up mt-2 text-white/85 text-base">For {page.recipient_name}</p>
              </div>
            </div>
          </div>
        </section>

        {/* STATS — separate block below, no overlap */}
        <div className="mt-3 rounded-3xl2 bg-white shadow-ring p-4 grid grid-cols-2 gap-4 fade-up">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-ink/55">Raised</p>
            <p className="serif text-3xl text-[var(--accent)] mt-1">
              <AnimatedNaira kobo={Number(page.total_raised_kobo)} />
            </p>
            <p className="text-xs text-ink/55 mt-1">{page.contributor_count} contributors</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-ink/55">
              {closed ? (claimable ? "Celebration" : "Closing") : "Closes in"}
            </p>
            <p className="serif text-3xl text-ink mt-1">
              {closed && claimable ? "today" : timeUntil(page.deadline_at)}
            </p>
            <p className="text-xs text-ink/55 mt-1 truncate">to {page.recipient_account_name}</p>
          </div>
        </div>

        {/* NOTE + ACTIONS */}
        {page.message_from_creator && (
          <blockquote className="mt-6 serif text-ink text-2xl leading-tight italic">
            "{page.message_from_creator}"
          </blockquote>
        )}

        {claimable && page.payout_status !== "paid" && Number(page.total_raised_kobo) > 0 && (
          <div className="mt-6 fade-up">
            <ClaimButton slug={page.slug} amountKobo={Number(page.total_raised_kobo)} />
          </div>
        )}
        {claimable && page.payout_status === "paid" && (
          <p className="mt-6 text-center text-sm text-ink/70 fade-up">
            ✓ Gift delivered to {page.recipient_account_name}
          </p>
        )}

        {!closed && (
          <div className="mt-6 flex gap-3 fade-up">
            <Link href={`/c/${page.slug}/post`} className="btn-accent flex-1 shadow-soft">Leave a message</Link>
            <Link href={`/c/${page.slug}/contribute`} className="btn-outline flex-1">Contribute</Link>
          </div>
        )}
        {closed && !claimable && (
          <p className="mt-6 text-center text-sm text-ink/65 fade-up">
            Contributions closed. The gift unlocks on {formatDate(page.celebration_date)}.
          </p>
        )}

        <ShareBar slug={page.slug} title={page.title} recipient={page.recipient_name} />

        {isCreator && <CelebrantLinkButton slug={page.slug} recipient={page.recipient_name} />}

        {/* WALL */}
        <section className="mt-12">
          <h2 className="serif text-3xl text-ink">The wall</h2>
          <WallGrid
            messages={messages ?? []}
            celebrationId={page.id}
            slug={page.slug}
            isCreator={isCreator}
          />
        </section>
      </div>
    </main>
  );
}
