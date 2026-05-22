"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { paystack, PaystackError } from "@/lib/paystack/client";
import type { IntroContent } from "@/lib/openai/generate-intro";
import { THEME_IDS } from "@/lib/themes";
import { editSelfCelebrationSchema } from "@/lib/validation/schemas";
import { resolveSavedTrackId } from "@/lib/music/server";
import { contentWindowOpen } from "@/lib/celebration-windows";

const editSchema = z.object({
  title: z.string().min(2).max(80),
  messageFromCreator: z.string().max(280).optional(),
  tagline: z.string().max(140).optional(),
  celebrantDescription: z.string().max(1500).optional(),
  coverPhotoPath: z.string().optional(),
  theme: z.enum(THEME_IDS).optional(),
  backgroundMusic: z.string().min(1).max(200).nullable().optional(),
  galleryImages: z.string().optional(),
  introContent: z.string().optional(),
});

export type EditState = { error?: string; ok?: boolean };

export async function editCelebration(
  slug: string,
  _prev: EditState,
  formData: FormData,
): Promise<EditState> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const parsed = editSchema.safeParse({
    title: formData.get("title"),
    messageFromCreator: (formData.get("messageFromCreator") as string) || undefined,
    tagline: (formData.get("tagline") as string) || undefined,
    celebrantDescription: (formData.get("celebrantDescription") as string) || undefined,
    coverPhotoPath: (formData.get("coverPhotoPath") as string) || undefined,
    theme: (formData.get("theme") as string) || undefined,
    backgroundMusic: (formData.get("backgroundMusic") as string) || null,
    galleryImages: (formData.get("galleryImages") as string) || undefined,
    introContent: (formData.get("introContent") as string) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const admin = supabaseAdmin();
  const { data: page } = await admin
    .from("celebrations")
    .select("id, creator_id, recipient_name, event_type, celebration_date")
    .eq("slug", slug)
    .maybeSingle();
  if (!page || page.creator_id !== user.id) return { error: "Not allowed." };
  if (!contentWindowOpen(page.celebration_date)) {
    return { error: "Page edits close 1 hour before the celebration." };
  }

  // The editor sends edited slides as JSON. Use them verbatim — we no
  // longer overwrite the user's hand-tuned slides with a fresh AI call on
  // every save.
  let introContent: IntroContent | null = null;
  if (parsed.data.introContent) {
    try { introContent = JSON.parse(parsed.data.introContent) as IntroContent; } catch { /* ignore */ }
  }

  let galleryImages: { path: string; caption: string; kind?: "image" | "video" }[] = [];
  try { galleryImages = JSON.parse(parsed.data.galleryImages || "[]"); } catch { /* keep empty */ }

  const resolvedMusic = await resolveSavedTrackId(parsed.data.backgroundMusic ?? null);

  const { error } = await admin
    .from("celebrations")
    .update({
      title: parsed.data.title,
      message_from_creator: parsed.data.messageFromCreator ?? null,
      tagline: parsed.data.tagline ?? null,
      celebrant_description: parsed.data.celebrantDescription ?? null,
      gallery_images: galleryImages,
      background_music: resolvedMusic,
      ...(introContent ? { intro_content: introContent } : {}),
      ...(parsed.data.coverPhotoPath ? { cover_photo_path: parsed.data.coverPhotoPath } : {}),
      ...(parsed.data.theme ? { theme: parsed.data.theme } : {}),
    })
    .eq("id", page.id);
  if (error) return { error: error.message };

  revalidatePath(`/c/${slug}`);
  return { ok: true };
}

export type SelfEditState = { error?: string; ok?: boolean };

export async function editSelfCelebration(
  slug: string,
  _prev: SelfEditState,
  formData: FormData,
): Promise<SelfEditState> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  let wishlist: unknown = [];
  try { wishlist = JSON.parse((formData.get("wishlist") as string) || "[]"); } catch { /* keep empty */ }

  const parsed = editSelfCelebrationSchema.safeParse({
    title: formData.get("title"),
    theme: (formData.get("theme") as string) || undefined,
    messageFromCreator: (formData.get("messageFromCreator") as string) || undefined,
    isRecurring: formData.get("isRecurring") === "on",
    isSealed: formData.get("isSealed") === "on",
    wishlist,
    bankCode: (formData.get("bankCode") as string) || undefined,
    accountNumber: (formData.get("accountNumber") as string) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const admin = supabaseAdmin();
  const { data: page } = await admin
    .from("celebrations")
    .select("id, creator_id, is_self")
    .eq("slug", slug)
    .maybeSingle();
  if (!page || page.creator_id !== user.id) return { error: "Not allowed." };
  if (!page.is_self) return { error: "Not a personal page." };

  // Drop blank links so an empty url field doesn't render a dead anchor.
  const cleanWishlist = parsed.data.wishlist
    .map((w) => ({ title: w.title.trim(), url: w.url?.trim() || undefined }))
    .filter((w) => w.title.length > 0);

  const { error } = await admin
    .from("celebrations")
    .update({
      title: parsed.data.title,
      message_from_creator: parsed.data.messageFromCreator ?? null,
      is_recurring: parsed.data.isRecurring,
      is_sealed: parsed.data.isSealed,
      wishlist: cleanWishlist,
      ...(parsed.data.theme ? { theme: parsed.data.theme } : {}),
    })
    .eq("id", page.id);
  if (error) return { error: error.message };

  // Payout bank lives on the profile and is reused across pages/years. Only
  // re-verify with Paystack when it actually changes.
  if (parsed.data.bankCode && parsed.data.accountNumber) {
    const { data: current } = await admin
      .from("users")
      .select("bank_code, account_number")
      .eq("id", user.id)
      .maybeSingle();
    const changed =
      current?.bank_code !== parsed.data.bankCode ||
      current?.account_number !== parsed.data.accountNumber;
    if (changed) {
      try {
        const { data } = await paystack.resolveAccount(
          parsed.data.accountNumber,
          parsed.data.bankCode,
        );
        await admin
          .from("users")
          .update({
            bank_code: parsed.data.bankCode,
            account_number: parsed.data.accountNumber,
            account_name: data.account_name,
            bank_verified_at: new Date().toISOString(),
            paystack_recipient_code: null,
          })
          .eq("id", user.id);
      } catch (err) {
        const msg = err instanceof PaystackError ? err.message : "Could not verify account";
        return { error: `Bank check failed: ${msg}` };
      }
    }
  }

  revalidatePath(`/c/${slug}`);
  revalidatePath(`/c/${slug}/edit`);
  return { ok: true };
}

export async function deleteMessageFromEdit(slug: string, messageId: string) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const admin = supabaseAdmin();
  const { data: page } = await admin
    .from("celebrations")
    .select("id, creator_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!page || page.creator_id !== user.id) return { error: "Not allowed." };

  const { error } = await admin
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("celebration_id", page.id);
  if (error) return { error: error.message };

  revalidatePath(`/c/${slug}/edit`);
  revalidatePath(`/c/${slug}`);
  return { ok: true };
}
