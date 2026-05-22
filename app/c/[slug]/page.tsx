import { notFound } from "next/navigation";
import Link from "next/link";
import { Gift } from "lucide-react";
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
import { GalleryUploadButton } from "@/components/gallery-upload-button";
import { contentWindowOpen, contentWindowClosesAt } from "@/lib/celebration-windows";
import { NavLoadingLink } from "@/components/nav-loading-link";
import { CompletePaymentBanner } from "./complete-payment-banner";
import { AudienceActions } from "@/components/page-editor/audience-actions";
import { InfoButton } from "@/components/page-editor/info-button";
import { getCreatorProfile } from "@/lib/creator";
import { SealedCountdown } from "./sealed-countdown";

export const dynamic = "force-dynamic";

function coverUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

export default async function WallPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cycle?: string }>;
}) {
  const { slug } = await params;
  const { cycle: cycleParam } = await searchParams;
  const supabase = await supabaseServer();

  const { data: page } = await supabase
    .from("celebrations")
    .select(
      "id, slug, title, recipient_name, event_type, celebration_date, deadline_at, claimable_at, status, message_from_creator, total_raised_kobo, contributor_count, payout_status, recipient_account_name, cover_photo_path, creator_id, theme, gallery_images, is_paid_for_creation, creation_payment_reference, is_self, is_sealed, is_recurring, current_cycle",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!page) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const isCreator = !!user && user.id === page.creator_id;

  // Page-creation fee gate: unpaid pages are invisible to anyone but the creator.
  if (page.is_paid_for_creation === false && !isCreator) notFound();
  const theme: Theme = isTheme(page.theme) ? page.theme : "ivory";

  const now = Date.now();
  const claimable = new Date(page.claimable_at).getTime() <= now;
  // Two windows: contributions close 72h before the date (deadline_at);
  // wall posts / gallery uploads stay open until 1h before.
  const closed = page.status !== "active" || new Date(page.deadline_at).getTime() <= now;
  const contentOpen =
    page.status === "active" && contentWindowOpen(page.celebration_date, now);
  const profile = await getCreatorProfile(page.creator_id);
  const createdBy = profile.label;

  // Sealed surprise: nobody — not even the owner — sees the wall or totals
  // until the celebration date. Everyone gets a countdown instead.
  if (page.is_sealed && !claimable) {
    return (
      <SealedCountdown
        slug={page.slug}
        title={page.title}
        recipientName={page.recipient_name}
        eventLabel={page.event_type.replace(/_/g, " ")}
        celebrationDate={page.celebration_date}
        avatarUrl={profile.avatarPath ? coverUrl(profile.avatarPath) : null}
        createdBy={createdBy}
        isCreator={isCreator}
        canMessage={contentOpen}
        canContribute={!closed}
        theme={theme}
      />
    );
  }

  // Recurring pages keep each year's wall separate; show the chosen cycle
  // (defaults to the current one). ?cycle=N lets you browse past years.
  const viewCycleNum = Number(cycleParam);
  const viewCycle =
    Number.isInteger(viewCycleNum) && viewCycleNum >= 1 && viewCycleNum <= page.current_cycle
      ? viewCycleNum
      : page.current_cycle;
  const viewingPast = viewCycle !== page.current_cycle;

  const { data: messages } = await supabase
    .from("messages")
    .select("id, contributor_name, is_anonymous, body, media_kind, media_path, media_duration_ms, interactive_kind, interactive_payload, contributor_session_id, created_at")
    .eq("celebration_id", page.id)
    .eq("cycle", viewCycle)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  const pastCycles =
    page.is_recurring && page.current_cycle > 1
      ? (
          await supabase
            .from("celebration_cycles")
            .select("cycle, celebration_date, total_raised_kobo, contributor_count, payout_status")
            .eq("celebration_id", page.id)
            .order("cycle", { ascending: false })
        ).data ?? []
      : [];

  const cover = coverUrl(page.cover_photo_path);
  const unpaid = page.is_paid_for_creation === false;
  const firstName = page.recipient_name.split(" ")[0];
  const galleryImages = (page.gallery_images as { path: string; caption: string; kind?: "image" | "video" }[]) ?? [];
  const eventLabel = page.event_type.replace(/_/g, " ");
  const accountLabel = page.recipient_account_name ?? "your account";

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
                    <img src={cover} alt="" className="absolute inset-0 size-full object-cover cover-pan" />
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

            {/* Gallery */}
            {(galleryImages.length > 0 || !closed) && (
              <div className="rounded-3xl2 bg-white shadow-ring p-3">
                <div className="flex items-center justify-between px-1 mb-2">
                  <p className="text-[10px] uppercase tracking-widest text-ink/40">Gallery</p>
                  {!closed && <GalleryUploadButton slug={slug} />}
                </div>
                {galleryImages.length > 0
                  ? <GalleryStrip images={galleryImages} />
                  : <p className="text-xs text-ink/40 text-center py-2">Be the first to add a photo!</p>
                }
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

            {isCreator && page.is_paid_for_creation === false && (
              <CompletePaymentBanner slug={page.slug} />
            )}

            {/* Desktop title (hidden on mobile — shown inside hero) */}
            <div className="hidden md:block">
              <p className="text-[10px] uppercase tracking-[0.3em] text-ink/50 font-medium">
                {eventLabel} · {formatDate(page.celebration_date)}
              </p>
              <h1 className="serif text-5xl text-ink mt-3 leading-[0.92]">{page.title}</h1>
              <p className="text-ink/55 mt-2">For {page.recipient_name}</p>
            </div>

            {/* Stats — raised amount is creator-only */}
            <div className="rounded-3xl2 bg-white shadow-ring p-5 grid grid-cols-2 gap-5 fade-up">
              <div>
                {isCreator ? (
                  <>
                    <p className="text-[10px] uppercase tracking-widest text-ink/50">Raised</p>
                    <p className="serif text-3xl text-[var(--accent)] mt-1.5">
                      <AnimatedNaira kobo={Number(page.total_raised_kobo)} />
                    </p>
                    <p className="text-xs text-ink/50 mt-1">{page.contributor_count} contributors</p>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] uppercase tracking-widest text-ink/50">Contributors</p>
                    <p className="serif text-3xl text-ink mt-1.5">{page.contributor_count}</p>
                    <p className="text-xs text-ink/50 mt-1">have sent love so far</p>
                  </>
                )}
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <p className="text-[10px] uppercase tracking-widest text-ink/50">
                    {closed ? (claimable ? "Celebration" : "Closing") : "Closes in"}
                  </p>
                  {!isCreator && !closed && (
                    <InfoButton title="Why contributions close early" label="Why?">
                      <p>
                        Contributions close <strong>72 hours before</strong> {firstName}&apos;s
                        celebration. That window gives time to settle the cash gift
                        cleanly and to curate the wall of messages and photos so
                        nothing arrives mid-celebration.
                      </p>
                      <p>
                        Wall messages and photos stay open longer — until about an
                        hour before — so you can keep sending love right up to the
                        day.
                      </p>
                    </InfoButton>
                  )}
                </div>
                <p className="serif text-3xl text-ink mt-1.5">
                  {closed && claimable ? "today" : timeUntil(page.deadline_at)}
                </p>
                <p className="text-xs text-ink/50 mt-1 truncate">
                  {isCreator ? `to ${accountLabel}` : "to send your gift"}
                </p>
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
                ✓ Gift delivered to {accountLabel}
              </p>
            )}

            {/* CTA buttons — wall stays open longer than contributions */}
            {unpaid ? (
              <div className="fade-up">
                <AudienceActions firstName={firstName} theme={theme} />
              </div>
            ) : (contentOpen || !closed) && (
              <div className="flex gap-3 fade-up">
                {contentOpen && (
                  <NavLoadingLink
                    href={`/c/${page.slug}/post`}
                    className={`btn-accent ${closed ? "w-full" : "flex-1"} shadow-soft inline-flex items-center justify-center gap-2`}
                    loadingText="Opening…"
                  >
                    Leave a message
                  </NavLoadingLink>
                )}
                {!closed && (
                  <NavLoadingLink
                    href={`/c/${page.slug}/contribute`}
                    className={`btn-outline ${contentOpen ? "flex-1" : "w-full"} inline-flex items-center justify-center gap-2`}
                    loadingText="Opening…"
                  >
                    Contribute
                  </NavLoadingLink>
                )}
              </div>
            )}
            {closed && contentOpen && (
              <p className="text-center text-xs text-ink/50 fade-up">
                Contributions closed. Wall messages stay open until {formatDate(contentWindowClosesAt(page.celebration_date).toISOString())}.
              </p>
            )}
            {closed && !contentOpen && !claimable && (
              <p className="text-center text-sm text-ink/60 fade-up">
                Wall and contributions closed. The gift unlocks on {formatDate(page.celebration_date)}.
              </p>
            )}

            {/* Payout notice */}
            {Number(page.total_raised_kobo) > 0 && !claimable && page.payout_status !== "paid" && (
              <p className="text-xs text-ink/50 text-center fade-up flex items-center justify-center gap-1.5">
                <Gift className="size-3.5 text-[var(--accent)]" />
                Cash gift pays to {page.recipient_name}&apos;s bank on {formatDate(page.celebration_date)}.
              </p>
            )}

            {/* Mobile: share + creator CTA */}
            <div className="md:hidden">
              <ShareBar slug={page.slug} title={page.title} recipient={page.recipient_name} />
              {isCreator && <CelebrantLinkButton slug={page.slug} recipient={page.recipient_name} />}
            </div>

            {/* Wall */}
            <section className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="serif text-3xl text-ink">The wall</h2>
                {viewingPast && (
                  <span className="text-[11px] uppercase tracking-widest text-ink/45">
                    {formatDate(page.celebration_date).split(" ").pop()}
                  </span>
                )}
              </div>
              {viewingPast && (
                <Link href={`/c/${page.slug}`} className="text-xs text-[var(--accent)] mb-2 inline-block">
                  ← Back to this year
                </Link>
              )}
              <WallGrid
                messages={messages ?? []}
                celebrationId={page.id}
                slug={page.slug}
                isCreator={isCreator && !viewingPast}
              />
            </section>

            {/* Past celebrations (recurring pages) */}
            {pastCycles.length > 0 && (
              <section className="mt-2 rounded-3xl2 bg-white shadow-ring p-4">
                <p className="text-[10px] uppercase tracking-widest text-ink/40 mb-2">Past years</p>
                <ul className="divide-y divide-ink/8">
                  {pastCycles.map((c) => {
                    const claimable =
                      isCreator && c.payout_status === "pending" && Number(c.total_raised_kobo) > 0;
                    return (
                      <li key={c.cycle} className="flex items-center justify-between py-2.5 gap-3">
                        <Link
                          href={`/c/${page.slug}?cycle=${c.cycle}`}
                          className="flex-1 flex items-center justify-between text-sm hover:opacity-70 transition"
                        >
                          <span className="text-ink/70">{formatDate(c.celebration_date)}</span>
                          <span className="text-ink/45 text-xs">{c.contributor_count} messages</span>
                        </Link>
                        {claimable && (
                          <ClaimButton
                            slug={page.slug}
                            cycle={c.cycle}
                            amountKobo={Number(c.total_raised_kobo)}
                            compact
                          />
                        )}
                        {isCreator && c.payout_status === "paid" && (
                          <span className="text-[11px] text-ink/40 shrink-0">✓ received</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {createdBy && (
              <p className="pt-6 text-center md:text-left text-[11px] text-ink/45">
                Put together by <span className="text-ink/70">{createdBy}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
