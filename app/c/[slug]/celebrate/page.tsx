import { notFound } from "next/navigation";
import Link from "next/link";
import { Play, Gift } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDate } from "@/lib/time";
import { ClaimButton } from "../claim-button";
import { isTheme, type Theme } from "@/lib/themes";
import { Sparkles } from "@/components/sparkles";
import { NavLoadingLink } from "@/components/nav-loading-link";
import { GalleryStrip } from "@/components/gallery-strip";
import { GalleryUploadButton } from "@/components/gallery-upload-button";
import { WallGrid } from "../wall-grid";

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
      "id, slug, title, recipient_name, event_type, celebration_date, deadline_at, claimable_at, status, message_from_creator, tagline, total_raised_kobo, payout_status, recipient_account_name, cover_photo_path, creator_id, theme, gallery_images",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!page) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, contributor_name, is_anonymous, body, media_kind, media_path, media_duration_ms, interactive_kind, interactive_payload, contributor_session_id, created_at")
    .eq("celebration_id", page.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  const theme: Theme = isTheme(page.theme) ? page.theme : "ivory";
  const now = Date.now();
  const claimable = new Date(page.claimable_at).getTime() <= now;
  const active = page.status === "active" && new Date(page.deadline_at).getTime() > now;
  const cover = coverUrl(page.cover_photo_path);
  const firstName = page.recipient_name.split(" ")[0];
  const galleryImages = (page.gallery_images as { path: string; caption: string; kind?: "image" | "video" }[]) ?? [];
  const eventLabel = !["other", "surprise_gift"].includes(page.event_type)
    ? page.event_type.replace(/_/g, " ")
    : "";

  return (
    <main className="min-h-[100dvh] bg-white pb-20" data-theme={theme}>
      <div className="mx-auto w-full max-w-6xl px-4 md:px-10 pt-4">

        {/* Desktop header */}
        <header className="hidden md:flex items-center justify-between pb-6 mb-8 border-b border-ink/8">
          <Link href="/" className="serif text-2xl text-ink hover:opacity-70 transition">
            Spendbox
          </Link>
          <span className="rounded-full border border-ink/15 px-3 py-1 text-[10px] uppercase tracking-widest text-ink/60">
            For you
          </span>
        </header>

        {/* 2-col grid */}
        <div className="md:grid md:grid-cols-[2fr_3fr] md:gap-12 md:items-start">

          {/* Left: Hero + gallery (sticky on desktop) */}
          <div className="md:sticky md:top-8 md:self-start space-y-3">

            {/* Hero card */}
            <section className="relative rounded-3xl2 overflow-hidden shadow-card">
              <div className="relative aspect-[4/5]">
                {cover ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover} alt="" className="absolute inset-0 size-full object-cover ken-burns" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/85" />
                  </>
                ) : (
                  <div className="absolute inset-0 theme-mesh" />
                )}

                <Sparkles count={8} />

                <div className="absolute inset-0 flex flex-col">
                  {/* Mobile header inside hero */}
                  <header className="md:hidden relative z-10 px-5 pt-5 flex items-center justify-between">
                    <Link href="/" className="serif text-lg text-white drop-shadow">
                      Spendbox
                    </Link>
                    <span className="glass-dark rounded-full px-3 py-1 text-[10px] uppercase tracking-widest text-white">
                      For you
                    </span>
                  </header>

                  {/* Hero text */}
                  <div className="relative z-10 mt-auto px-5 pb-7 text-white">
                    <p className="fade-up text-[10px] uppercase tracking-[0.35em] text-white/80">
                      {eventLabel && <span>{eventLabel} · </span>}
                      {formatDate(page.celebration_date)}
                    </p>
                    <p className="fade-up mt-2 text-white/65 text-sm" style={{ animationDelay: "60ms" }}>
                      Hi {firstName},
                    </p>
                    <h1
                      className="fade-up mt-1 serif leading-[0.92] drop-shadow-sm md:hidden"
                      style={{ fontSize: "clamp(2rem,9vw,3.5rem)", animationDelay: "120ms" }}
                    >
                      {page.title}
                    </h1>
                    {page.tagline && (
                      <p className="fade-up mt-3 text-white/85 text-base leading-snug md:hidden" style={{ animationDelay: "200ms" }}>
                        {page.tagline}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Gallery */}
            {(galleryImages.length > 0 || active) && (
              <div className="rounded-3xl2 bg-white shadow-ring p-3">
                <div className="flex items-center justify-between px-1 mb-2">
                  <p className="text-[10px] uppercase tracking-widest text-ink/40">Gallery</p>
                  {active && <GalleryUploadButton slug={slug} />}
                </div>
                {galleryImages.length > 0
                  ? <GalleryStrip images={galleryImages} />
                  : <p className="text-xs text-ink/40 text-center py-2">Be the first to add a photo!</p>
                }
              </div>
            )}
          </div>

          {/* Right: content */}
          <div className="space-y-5 mt-4 md:mt-0">

            {/* Desktop title */}
            <div className="hidden md:block">
              <p className="text-[10px] uppercase tracking-[0.3em] text-ink/50 font-medium">
                {eventLabel && `${eventLabel} · `}{formatDate(page.celebration_date)}
              </p>
              <p className="text-ink/55 mt-2 text-lg">Hi {firstName},</p>
              <h2 className="serif text-5xl text-ink mt-1 leading-[0.92]">{page.title}</h2>
              {page.tagline && <p className="text-ink/60 text-lg mt-3 italic serif">{page.tagline}</p>}
            </div>

            {/* Play button */}
            <NavLoadingLink
              href={`/c/${slug}/celebrate/play`}
              className="btn-accent w-full py-5 shadow-glow text-base inline-flex items-center justify-center gap-2"
              loadingText="Opening your surprise…"
            >
              <Play className="size-5 fill-current" />
              Play your surprise
            </NavLoadingLink>

            {/* Creator note */}
            {page.message_from_creator && (
              <blockquote className="serif text-ink text-2xl leading-tight italic fade-up text-center md:text-left">
                &ldquo;{page.message_from_creator}&rdquo;
              </blockquote>
            )}

            {/* Payout notice */}
            {Number(page.total_raised_kobo) > 0 && !claimable && page.payout_status !== "paid" && (
              <p className="text-sm text-ink/55 text-center fade-up flex items-center justify-center gap-1.5">
                <Gift className="size-4 text-[var(--accent)]" />
                A cash gift is waiting — paid to your bank on {formatDate(page.celebration_date)}.
              </p>
            )}

            {/* Claim */}
            {claimable && page.payout_status !== "paid" && Number(page.total_raised_kobo) > 0 && (
              <div className="fade-up">
                <p className="text-center text-[11px] uppercase tracking-[0.3em] text-ink/40 mb-3 flex items-center justify-center gap-1.5">
                  <Gift className="size-3.5" /> A gift is waiting for you
                </p>
                <ClaimButton slug={page.slug} amountKobo={Number(page.total_raised_kobo)} />
              </div>
            )}
            {claimable && page.payout_status === "paid" && (
              <p className="text-center text-sm text-ink/70 fade-up">
                ✓ Gift delivered to {page.recipient_account_name}
              </p>
            )}

            {/* Wall */}
            {(messages ?? []).length > 0 && (
              <section className="mt-4">
                <h2 className="serif text-3xl text-ink mb-1">Your wall</h2>
                <WallGrid
                  messages={messages ?? []}
                  celebrationId={page.id}
                  slug={page.slug}
                  isCreator={false}
                />
              </section>
            )}

            <footer className="pt-8 text-center md:text-left">
              <p className="text-[11px] text-ink/35">Made with Spendbox · for {page.recipient_name}</p>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
