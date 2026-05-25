import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { isTheme, type Theme } from "@/lib/themes";
import { resolveSavedTrack } from "@/lib/music/server";
import type { IntroContent } from "@/lib/openai/generate-intro";
import type { GalleryImage } from "./player";
import { Player } from "./player";
import { getCreatorLabel } from "@/lib/creator";

export const dynamic = "force-dynamic";

export default async function PlayPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data: page } = await supabase
    .from("celebrations")
    .select("id, slug, recipient_name, event_type, celebration_date, title, tagline, celebrant_description, intro_content, gallery_images, theme, background_music, creator_id, total_raised_kobo, claimable_at, payout_status, is_sealed, is_self, current_cycle, presentation")
    .eq("slug", slug)
    .maybeSingle();

  if (!page) notFound();

  // Sealed pages stay a surprise — even from the owner — until the date.
  // Personal pages are always sealed regardless of the stored flag.
  if ((page.is_sealed || page.is_self) && new Date(page.claimable_at).getTime() > Date.now()) {
    redirect(`/c/${slug}`);
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("id, contributor_name, is_anonymous, body, media_kind, media_path, media_duration_ms, interactive_kind, interactive_payload, contributor_session_id, created_at")
    .eq("celebration_id", page.id)
    .eq("cycle", page.current_cycle)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const theme: Theme = isTheme(page.theme) ? page.theme : "ivory";
  const galleryImages = (page.gallery_images as GalleryImage[]) ?? [];
  // Personal pages are the celebrant's own — no "put together by" credit.
  const createdBy = page.is_self ? null : await getCreatorLabel(page.creator_id);
  const musicTrack = await resolveSavedTrack(page.background_music);

  return (
    <Player
      createdBy={createdBy}
      slug={slug}
      theme={theme}
      musicUrl={musicTrack?.src ?? null}
      musicClip={musicTrack?.clip ?? null}
      musicBpm={musicTrack?.bpm ?? null}
      presentation={page.presentation === "book" ? "book" : "reel"}
      recipientName={page.recipient_name}
      eventType={page.event_type}
      celebrationDate={page.celebration_date}
      celebrationTitle={page.title}
      tagline={page.tagline ?? null}
      celebrantDescription={page.celebrant_description ?? null}
      introContent={(page.intro_content as IntroContent) ?? null}
      galleryImages={galleryImages}
      messages={messages ?? []}
      totalRaisedKobo={Number(page.total_raised_kobo ?? 0)}
      claimableAt={page.claimable_at}
      payoutStatus={page.payout_status ?? ""}
    />
  );
}
