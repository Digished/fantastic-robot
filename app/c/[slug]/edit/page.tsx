import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { EditForm } from "./form";
import { SelfEditForm } from "./self-form";
import { MessagesManager } from "./messages-manager";
import { isTheme, type Theme } from "@/lib/themes";
import { getEffectiveTracks } from "@/lib/music/server";
import { getBanks } from "@/lib/paystack/banks";
import { findTrack } from "@/lib/music";
import type { IntroContent } from "@/lib/openai/generate-intro";
import type { WishlistItem } from "@/lib/validation/schemas";

export default async function EditPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/c/${slug}/edit`);

  const { data: page } = await supabase
    .from("celebrations")
    .select("id, slug, title, recipient_name, event_type, message_from_creator, tagline, celebrant_description, cover_photo_path, celebration_date, claimable_at, published_at, creator_id, theme, background_music, gallery_images, intro_content, is_self, is_sealed, is_recurring, wishlist, recipient_bank_code, recipient_account_number, recipient_account_name, presentation")
    .eq("slug", slug)
    .maybeSingle();
  if (!page) notFound();
  if (page.creator_id !== user.id) redirect(`/c/${slug}`);

  // Personal pages get a distinct, simpler editor — first-person, wishlist,
  // payout bank, no AI slides. The owner can't peek at the sealed wall here.
  if (page.is_self) {
    const [{ data: profile }, banks, selfTracks] = await Promise.all([
      supabase
        .from("users")
        .select("bank_code, account_number, account_name")
        .eq("id", user.id)
        .maybeSingle(),
      getBanks(),
      getEffectiveTracks(),
    ]);

    // Fetch sealed_theme with error handling (migration may not yet be applied).
    const { data: sealedExtras, error: sealedExtrasError } = await supabaseAdmin()
      .from("celebrations")
      .select("sealed_theme")
      .eq("id", page.id)
      .maybeSingle();
    const initialSealedTheme = !sealedExtrasError
      ? ((sealedExtras as { sealed_theme?: string | null } | null)?.sealed_theme ?? null)
      : null;

    const selfTheme: Theme = isTheme(page.theme) ? page.theme : "ivory";
    const selfMusic = findTrack(page.background_music, selfTracks) ? page.background_music : null;
    return (
      <SelfEditForm
        slug={slug}
        banks={banks}
        tracks={selfTracks}
        initial={{
          title: page.title,
          theme: selfTheme,
          sealedTheme: initialSealedTheme,
          messageFromCreator: page.message_from_creator ?? "",
          isRecurring: !!page.is_recurring,
          backgroundMusic: selfMusic,
          presentation: page.presentation === "book" ? "book" : "reel",
          wishlist: (page.wishlist as WishlistItem[] | null) ?? [],
          bankCode: profile?.bank_code ?? "",
          accountNumber: profile?.account_number ?? "",
          accountName: profile?.account_name ?? "",
        }}
      />
    );
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("id, contributor_name, is_anonymous, body, media_kind, media_path, created_at")
    .eq("celebration_id", page.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const theme: Theme = isTheme(page.theme) ? page.theme : "ivory";
  const [tracks, banks] = await Promise.all([getEffectiveTracks(), getBanks()]);
  // background_music may carry an `#clip=` suffix and/or be an uploaded track
  // that isn't in the library — keep the full stored value if it resolves.
  const savedMusic = findTrack(page.background_music, tracks)
    ? page.background_music
    : null;
  // Date & payout account stay editable for 24h after the page goes live.
  const canEditDateBank =
    !!page.published_at &&
    Date.now() - new Date(page.published_at).getTime() < 24 * 3600 * 1000;

  return (
    <>
      <EditForm
        slug={slug}
        tracks={tracks}
        banks={banks}
        canEditDateBank={canEditDateBank}
        initial={{
          title: page.title,
          messageFromCreator: page.message_from_creator ?? "",
          tagline: page.tagline ?? "",
          celebrantDescription: page.celebrant_description ?? "",
          coverPhotoPath: page.cover_photo_path ?? null,
          theme,
          backgroundMusic: savedMusic,
          recipientName: page.recipient_name,
          eventType: page.event_type,
          celebrationDate: page.celebration_date,
          recipientBankCode: page.recipient_bank_code ?? "",
          recipientAccountNumber: page.recipient_account_number ?? "",
          recipientAccountName: page.recipient_account_name ?? "",
          presentation: page.presentation === "book" ? "book" : "reel",
          introContent: (page.intro_content as IntroContent | null) ?? null,
          galleryImages: (page.gallery_images as { path: string; caption: string; kind?: "image" | "video" }[]) ?? [],
        }}
      />

      <section className="bg-white border-t border-ink/8 py-12">
        <div className="mx-auto w-full max-w-3xl px-5">
          <h2 className="serif text-3xl text-ink">Wall posts</h2>
          <p className="text-ink/55 text-sm mt-1">
            {messages?.length ?? 0} cards · remove anything that doesn&apos;t fit.
          </p>
          <MessagesManager slug={slug} messages={messages ?? []} />
        </div>
      </section>
    </>
  );
}
