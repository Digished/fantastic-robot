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
import { GalleryStrip } from "@/components/gallery-strip";
import { NavLoadingLink } from "@/components/nav-loading-link";

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
      "id, slug, title, recipient_name, event_type, celebration_date, deadline_at, claimable_at, status, message_from_creator, total_raised_kobo, contributor_count, payout_status, recipient_account_name, cover_photo_path, creator_id, theme, gallery_images",
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
  const galleryImages = (page.gallery_images as { path: string; caption: string; kind?: "image" | "video" }[]) ?? [];
  const eventLabel = page.event_type.replace(/_/g, " ");

  return (
    <main className="min-h-[100dvh] bg-white pb-20" data-theme={theme}>

      {/* ── Wide container ── */}
      <div className="mx-auto w-full max-w-6xl px-4 md:px-10 pt-4">

        {/* Desktop-only top header */}
        <header className="hidden md:flex items-center justify-between pb-6 mb-8 border-b border-ink/8">
          <Link href={isCreator ? "/dashboard" : "/"} className="serif text-2xl text-ink hover:opacity-70 transition">
            Spendbox
          </Link>
          <div className="flex items-center gap-3">
            {isCreator && (
              <Link href={`/c/${page.slug}/edit`} className="btn-outline text-sm py-2">
                Edit page
              </Link>
            )}
          </div>
        </header>

        {/* ── 2-col grid ── */}
        <div className="md:grid md:grid-cols-[2fr_3fr] md:gap-12 md:items-start">

          {/* ══ LEFT: Hero + gallery (sticky on desktop) ══ */}
          <div className="md:sticky md:top-8 md:self-start space-y-3">

            {/* Hero card */}
            <section className="relative rounded-3xl2 overflow-hidden shadow-card">
              <div className="relative aspect-[4/5]">
                {cover ? (
                  <div className="absolute inset-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover} alt="" className="absolute inset-0 size-full object-cover ken-burns" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/25 to-black/80" />
                  </div>
                ) : (
                  <div className="absolute inset-0 theme-mesh" />
                )}

                <Sparkles count={6} />

                <div className="absolute inset-0 flex flex-col">
                  {/* Mobile-only header inside hero */}
                  <header className="md:hidden relative z-10 px-5 pt-5 flex items-center justify-between">
                    <Link href={isCreator ? "/dashboard" : "/"} className="serif text-lg text-white drop-shadow">
                      Spendbox
                    </Link>
                    {isCreator && (
                      <Link href={`/c/${page.slug}/edit`} className="glass-dark rounded-full px-3 py-1.5 text-xs text-white">
                        Edit page
                      </Link>
                    )}
                  </header>

                  {/* Hero text — mobile: overlaid at bottom; desktop: repeated in right col */}
                  <div className="relative z-10 mt-auto px-5 pb-6 text-white">
                    <p className="fade-up text-[10px] uppercase tracking-[0.3em] text-white/80">
                      {eventLabel} · {formatDate(page.celebration_date)}
                    </p>
                    <h2 className="fade-up mt-3 serif text-[40px] leading-[0.95] drop-shadow-sm md:hidden">
                      {page.title}
                    </h2>
                    <p className="fade-up mt-2 text-white/80 text-sm md:hidden">For {page.recipient_name}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Gallery strip */}
            {galleryImages.length > 0 && (
              <div className="rounded-3xl2 bg-white shadow-ring p-3">
                <p className="text-[10px] uppercase tracking-widest text-ink/40 px-1 mb-2">Gallery</p>
                <GalleryStrip images={galleryImages} />
              </div>
            )}

            {/* Share bar + creator CTA (left col on desktop, inline on mobile) */}
            <div className="hidden md:block">
              <ShareBar slug={page.slug} title={page.title} recipient={page.recipient_name} />
              {isCreator && <CelebrantLinkButton slug={page.slug} recipient={page.recipient_name} />}
            </div>
          </div>

          {/* ══ RIGHT: All content ══ */}
          <div className="space-y-5 mt-4 md:mt-0">

            {/* Desktop title (hidden on mobile — shown inside hero) */}
            <div className="hidden md:block">
              <p className="text-[10px] uppercase tracking-[0.3em] text-ink/50 font-medium">
                {eventLabel} · {formatDate(page.celebration_date)}
              </p>
              <h1 className="serif text-5xl text-ink mt-3 leading-[0.92]">{page.title}</h1>
              <p className="text-ink/55 mt-2">For {page.recipient_name}</p>
            </div>

            {/* Stats */}
            <div className="rounded-3xl2 bg-white shadow-ring p-5 grid grid-cols-2 gap-5 fade-up">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-ink/50">Raised</p>
                <p className="serif text-3xl text-[var(--accent)] mt-1.5">
                  <AnimatedNaira kobo={Number(page.total_raised_kobo)} />
                </p>
                <p className="text-xs text-ink/50 mt-1">{page.contributor_count} contributors</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-ink/50">
                  {closed ? (claimable ? "Celebration" : "Closing") : "Closes in"}
                </p>
                <p className="serif text-3xl text-ink mt-1.5">
                  {closed && claimable ? "today" : timeUntil(page.deadline_at)}
                </p>
                <p className="text-xs text-ink/50 mt-1 truncate">to {page.recipient_account_name}</p>
              </div>
            </div>

            {/* Creator note */}
            {page.message_from_creator && (
              <blockquote className="serif text-ink text-2xl leading-tight italic fade-up">
                &ldquo;{page.message_from_creator}&rdquo;
              </blockquote>
            )}

            {/* Claim */}
            {claimable && page.payout_status !== "paid" && Number(page.total_raised_kobo) > 0 && (
              <div className="fade-up">
                <ClaimButton slug={page.slug} amountKobo={Number(page.total_raised_kobo)} />
              </div>
            )}
            {claimable && page.payout_status === "paid" && (
              <p className="text-center text-sm text-ink/70 fade-up">
                ✓ Gift delivered to {page.recipient_account_name}
              </p>
            )}

            {/* CTA buttons */}
            {!closed && (
              <div className="flex gap-3 fade-up">
                <NavLoadingLink
                  href={`/c/${page.slug}/post`}
                  className="btn-accent flex-1 shadow-soft inline-flex items-center justify-center gap-2"
                  loadingText="Opening…"
                >
                  Leave a message
                </NavLoadingLink>
                <NavLoadingLink
                  href={`/c/${page.slug}/contribute`}
                  className="btn-outline flex-1 inline-flex items-center justify-center gap-2"
                  loadingText="Opening…"
                >
                  Contribute
                </NavLoadingLink>
              </div>
            )}
            {closed && !claimable && (
              <p className="text-center text-sm text-ink/60 fade-up">
                Contributions closed. The gift unlocks on {formatDate(page.celebration_date)}.
              </p>
            )}

            {/* Mobile: share + creator CTA */}
            <div className="md:hidden">
              <ShareBar slug={page.slug} title={page.title} recipient={page.recipient_name} />
              {isCreator && <CelebrantLinkButton slug={page.slug} recipient={page.recipient_name} />}
            </div>

            {/* Wall */}
            <section className="mt-4">
              <h2 className="serif text-3xl text-ink mb-1">The wall</h2>
              <WallGrid
                messages={messages ?? []}
                celebrationId={page.id}
                slug={page.slug}
                isCreator={isCreator}
              />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
