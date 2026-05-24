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
  // Date & payout account — only editable within 24h of publishing.
  celebrationDate: z.string().optional(),
  recipientBankCode: z.string().min(2).max(10).optional(),
  recipientAccountNumber: z.string().regex(/^\d{10}$/, "10 digits").optional(),
});

// How long after publishing a creator can still fix the date / payout account.
const EDIT_WINDOW_MS = 24 * 3600 * 1000;
const LEAD_MS = 96 * 3600 * 1000;

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
    celebrationDate: (formData.get("celebrationDate") as string) || undefined,
    recipientBankCode: (formData.get("recipientBankCode") as string) || undefined,
    recipientAccountNumber: (formData.get("recipientAccountNumber") as string) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const admin = supabaseAdmin();
  const { data: page } = await admin
    .from("celebrations")
    .select("id, creator_id, recipient_name, event_type, celebration_date, published_at, recipient_bank_code, recipient_account_number")
    .eq("slug", slug)
    .maybeSingle();
  if (!page || page.creator_id !== user.id) return { error: "Not allowed." };
  if (!contentWindowOpen(page.celebration_date)) {
    return { error: "Page edits close 1 hour before the celebration." };
  }

  // Date & payout account can only be corrected for a short window after the
  // page goes live, then they're locked for everyone's safety.
  const within24h =
    !!page.published_at && Date.now() - new Date(page.published_at).getTime() < EDIT_WINDOW_MS;
  const dateBankUpdate: Record<string, unknown> = {};

  if (parsed.data.celebrationDate) {
    const d = new Date(parsed.data.celebrationDate);
    const changed =
      Number.isNaN(d.getTime()) ||
      Math.abs(d.getTime() - new Date(page.celebration_date).getTime()) > 60_000;
    if (changed) {
      if (!within24h) return { error: "The date can only be changed within 24 hours of publishing." };
      if (Number.isNaN(d.getTime()) || d.getTime() < Date.now() + LEAD_MS) {
        return { error: "Pick a date at least 96 hours from now." };
      }
      dateBankUpdate.celebration_date = d.toISOString();
    }
  }

  if (parsed.data.recipientBankCode && parsed.data.recipientAccountNumber) {
    const bankChanged =
      parsed.data.recipientBankCode !== page.recipient_bank_code ||
      parsed.data.recipientAccountNumber !== page.recipient_account_number;
    if (bankChanged) {
      if (!within24h) return { error: "Account details can only be changed within 24 hours of publishing." };
      try {
        const { data } = await paystack.resolveAccount(
          parsed.data.recipientAccountNumber,
          parsed.data.recipientBankCode,
        );
        dateBankUpdate.recipient_bank_code = parsed.data.recipientBankCode;
        dateBankUpdate.recipient_account_number = parsed.data.recipientAccountNumber;
        dateBankUpdate.recipient_account_name = data.account_name;
        dateBankUpdate.paystack_recipient_code = null;
      } catch (err) {
        const msg = err instanceof PaystackError ? err.message : "Could not verify account";
        return { error: `Bank account check failed: ${msg}` };
      }
    }
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
      ...dateBankUpdate,
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
    backgroundMusic: formData.get("backgroundMusic") || null,
    wishlist,
    bankCode: (formData.get("bankCode") as string) || undefined,
    accountNumber: (formData.get("accountNumber") as string) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const resolvedMusic = await resolveSavedTrackId(parsed.data.backgroundMusic ?? null);

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
      is_sealed: true, // personal pages are always a surprise
      background_music: resolvedMusic,
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

// ── Custom page link (slug) ────────────────────────────────────────────
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeSlug(raw: string) {
  return raw.trim().toLowerCase();
}
function slugError(s: string): string | null {
  if (s.length < 3 || s.length > 40) return "Use 3–40 characters.";
  if (!SLUG_RE.test(s)) return "Lowercase letters, numbers and single hyphens only.";
  return null;
}

export async function checkSlugAvailable(
  desired: string,
): Promise<{ available?: boolean; error?: string }> {
  const s = normalizeSlug(desired);
  const err = slugError(s);
  if (err) return { error: err };
  const { data } = await supabaseAdmin()
    .from("celebrations")
    .select("id")
    .eq("slug", s)
    .maybeSingle();
  return { available: !data };
}

export async function updateCelebrationSlug(
  currentSlug: string,
  desired: string,
): Promise<{ ok?: boolean; slug?: string; error?: string }> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const s = normalizeSlug(desired);
  const err = slugError(s);
  if (err) return { error: err };

  const admin = supabaseAdmin();
  const { data: page } = await admin
    .from("celebrations")
    .select("id, creator_id, slug")
    .eq("slug", currentSlug)
    .maybeSingle();
  if (!page || page.creator_id !== user.id) return { error: "Not allowed." };
  if (page.slug === s) return { ok: true, slug: s };

  const { data: taken } = await admin
    .from("celebrations")
    .select("id")
    .eq("slug", s)
    .maybeSingle();
  if (taken) return { error: "That link is taken — try another." };

  const { error } = await admin.from("celebrations").update({ slug: s }).eq("id", page.id);
  if (error) {
    return { error: /duplicate|unique/i.test(error.message) ? "That link is taken — try another." : error.message };
  }
  revalidatePath(`/c/${s}`);
  revalidatePath("/dashboard");
  return { ok: true, slug: s };
}

// ── Delete a sealed celebration ────────────────────────────────────────
export async function deleteSealedCelebration(
  slug: string,
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const admin = supabaseAdmin();
  const { data: page } = await admin
    .from("celebrations")
    .select("id, creator_id, is_self, is_sealed, claimable_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!page || page.creator_id !== user.id) return { error: "Not allowed." };

  const sealed =
    (page.is_sealed || page.is_self) && new Date(page.claimable_at).getTime() > Date.now();
  if (!sealed) return { error: "Only a sealed celebration can be deleted here." };

  // Gifts are held in escrow — refuse to delete a page that already has any,
  // so money can never be stranded.
  const { count } = await admin
    .from("contributions")
    .select("id", { head: true, count: "exact" })
    .eq("celebration_id", page.id)
    .eq("status", "paid");
  if ((count ?? 0) > 0) {
    return { error: "This page has gifts already — it can't be deleted." };
  }

  // Clear any unpaid contribution rows first (FK is restrict), then the page —
  // messages and cycles cascade away with it.
  await admin.from("contributions").delete().eq("celebration_id", page.id);
  const { error } = await admin.from("celebrations").delete().eq("id", page.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}
