import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { isTheme, type Theme } from "@/lib/themes";
import type { IntroContent } from "@/lib/openai/generate-intro";
import type { GalleryImage } from "./player";
import { Player } from "./player";

export const dynamic = "force-dynamic";

export default async function PlayPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data: page } = await supabase
    .from("celebrations")
    .select("id, slug, recipient_name, event_type, celebration_date, title, tagline, celebrant_description, intro_content, gallery_images, theme, creator_id, total_raised_kobo, claimable_at, payout_status")
    .eq("slug", slug)
    .maybeSingle();

  if (!page) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, contributor_name, is_anonymous, body, media_kind, media_path, media_duration_ms, interactive_kind, interactive_payload, contributor_session_id, created_at")
    .eq("celebration_id", page.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const theme: Theme = isTheme(page.theme) ? page.theme : "ivory";
  const galleryImages = (page.gallery_images as GalleryImage[]) ?? [];

  return (
    <Player
      slug={slug}
      theme={theme}
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
