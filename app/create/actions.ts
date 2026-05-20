"use server";

import { customAlphabet } from "nanoid";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { paystack, PaystackError } from "@/lib/paystack/client";
import { createCelebrationSchema } from "@/lib/validation/schemas";
import { generateIntroContent } from "@/lib/openai/generate-intro";
import { resolveSavedTrackId } from "@/lib/music/server";
import { PAGE_CREATION_FEE_KOBO } from "@/lib/fees";
import { env } from "@/lib/env";

const slugId = customAlphabet("23456789abcdefghjkmnpqrstvwxyz", 10);
const payRef = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 18);

export type CreateState = {
  error?: string;
  authorizationUrl?: string;
};

export async function createCelebration(
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };
  if (!user.email) return { error: "Your account is missing an email." };

  const parsed = createCelebrationSchema.safeParse({
    title: formData.get("title"),
    recipientName: formData.get("recipientName"),
    eventType: formData.get("eventType"),
    theme: formData.get("theme") ?? "ivory",
    backgroundMusic: formData.get("backgroundMusic") || null,
    celebrationDate: formData.get("celebrationDate"),
    messageFromCreator: formData.get("messageFromCreator") || undefined,
    tagline: formData.get("tagline") || undefined,
    celebrantDescription: (formData.get("celebrantDescription") as string) ?? "",
    recipientBankCode: formData.get("recipientBankCode"),
    recipientAccountNumber: formData.get("recipientAccountNumber"),
    coverPhotoPath: formData.get("coverPhotoPath") || undefined,
    galleryImages: formData.get("galleryImages") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  let accountName: string;
  try {
    const { data } = await paystack.resolveAccount(
      parsed.data.recipientAccountNumber,
      parsed.data.recipientBankCode,
    );
    accountName = data.account_name;
  } catch (err) {
    const msg = err instanceof PaystackError ? err.message : "Could not verify account";
    return { error: `Bank account check failed: ${msg}` };
  }

  const slug = slugId();
  const admin = supabaseAdmin();

  const firstName = parsed.data.recipientName.split(" ")[0];
  const introContent = await generateIntroContent({
    firstName,
    recipientName: parsed.data.recipientName,
    eventType: parsed.data.eventType,
    celebrationDate: parsed.data.celebrationDate,
    celebrationTitle: parsed.data.title,
    celebrantDescription: parsed.data.celebrantDescription ?? null,
  });

  let galleryImages: { path: string; caption: string; kind?: "image" | "video" }[] = [];
  try { galleryImages = JSON.parse(parsed.data.galleryImages ?? "[]"); } catch { /* keep empty */ }

  const resolvedMusic = await resolveSavedTrackId(parsed.data.backgroundMusic ?? null);
  const reference = `SPBC-${payRef()}`;

  const { error } = await admin.from("celebrations").insert({
    slug,
    creator_id: user.id,
    title: parsed.data.title,
    recipient_name: parsed.data.recipientName,
    event_type: parsed.data.eventType,
    theme: parsed.data.theme,
    background_music: resolvedMusic,
    celebration_date: parsed.data.celebrationDate,
    message_from_creator: parsed.data.messageFromCreator ?? null,
    tagline: parsed.data.tagline ?? null,
    celebrant_description: parsed.data.celebrantDescription ?? null,
    intro_content: introContent ?? null,
    cover_photo_path: parsed.data.coverPhotoPath ?? null,
    gallery_images: galleryImages,
    recipient_bank_code: parsed.data.recipientBankCode,
    recipient_account_number: parsed.data.recipientAccountNumber,
    recipient_account_name: accountName,
    is_paid_for_creation: false,
    creation_payment_reference: reference,
  });

  if (error) return { error: error.message };

  // Resolve the public origin from the actual request rather than env so
  // Paystack always redirects back to the host the user came from. Falling
  // back to env.appUrl() (which defaults to localhost) was sending people
  // to a non-existent URL after payment.
  const h = await headers();
  const forwardedHost = h.get("x-forwarded-host") ?? h.get("host");
  const forwardedProto = h.get("x-forwarded-proto") ?? "https";
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : env.appUrl();

  try {
    const { data } = await paystack.initTransaction({
      email: user.email,
      amount: Number(PAGE_CREATION_FEE_KOBO),
      reference,
      callback_url: `${origin}/c/${slug}/post-payment`,
      metadata: {
        kind: "page_creation",
        slug,
        creator_id: user.id,
      },
    });
    return { authorizationUrl: data.authorization_url };
  } catch (err) {
    // Roll back the unpublished row so the slug doesn't dangle.
    await admin.from("celebrations").delete().eq("slug", slug).eq("is_paid_for_creation", false);
    const message = err instanceof PaystackError ? err.message : "Could not start payment";
    return { error: `Payment setup failed: ${message}` };
  }
}
