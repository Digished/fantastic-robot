"use server";

import { customAlphabet } from "nanoid";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { paystack, PaystackError } from "@/lib/paystack/client";
import { createCelebrationSchema, createSelfCelebrationSchema } from "@/lib/validation/schemas";
import { generateIntroContent } from "@/lib/openai/generate-intro";
import { resolveSavedTrackId } from "@/lib/music/server";
import { buildSelfCelebrationDate } from "@/lib/self-celebration";
import { PAGE_CREATION_FEE_KOBO } from "@/lib/fees";
import { env } from "@/lib/env";

const slugId = customAlphabet("23456789abcdefghjkmnpqrstvwxyz", 10);
const payRef = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 18);

export type CreateState = {
  error?: string;
  authorizationUrl?: string;
  alreadyPaid?: boolean;
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
    introContent: formData.get("introContent") || undefined,
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

  // The client-side editor lets users generate slides on demand and tweak
  // them. If they sent edited slides through, trust those; otherwise fall
  // back to a server-side generation so a page always has a slideshow.
  let introContent: Awaited<ReturnType<typeof generateIntroContent>> = null;
  if (parsed.data.introContent) {
    try {
      introContent = JSON.parse(parsed.data.introContent);
    } catch {
      introContent = null;
    }
  }
  if (!introContent) {
    const firstName = parsed.data.recipientName.split(" ")[0];
    introContent = await generateIntroContent({
      firstName,
      recipientName: parsed.data.recipientName,
      eventType: parsed.data.eventType,
      celebrationDate: parsed.data.celebrationDate,
      celebrationTitle: parsed.data.title,
      celebrantDescription: parsed.data.celebrantDescription ?? null,
    });
  }

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

/**
 * Create a page the user owns themselves — a birthday/self celebration.
 * It's sealed (no one sees the wall or totals until the date), free (no
 * creation fee), pulls the payout bank from the profile, and — for birthdays
 * — renews every year. Redirects to the new page on success.
 */
export async function createSelfCelebration(
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const parsed = createSelfCelebrationSchema.safeParse({
    title: formData.get("title"),
    eventType: formData.get("eventType"),
    theme: formData.get("theme") ?? "ivory",
    date: formData.get("date"),
    backgroundMusic: formData.get("backgroundMusic") || null,
    bankCode: formData.get("bankCode") || undefined,
    accountNumber: formData.get("accountNumber") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const recurring = parsed.data.eventType === "birthday";
  const celebrationDate = buildSelfCelebrationDate(parsed.data.date, recurring);
  if (!celebrationDate) {
    return { error: "Pick a date at least 96 hours from now." };
  }

  const admin = supabaseAdmin();

  // A payout bank is compulsory — there's nowhere to send the gift otherwise.
  // Verify it with Paystack and save it to the profile so it's reused for the
  // claim and any future pages/years.
  const { data: profile } = await supabase
    .from("users")
    .select("display_name, email, bank_code, account_number")
    .eq("id", user.id)
    .maybeSingle();

  let accountName: string;
  try {
    const { data } = await paystack.resolveAccount(
      parsed.data.accountNumber,
      parsed.data.bankCode,
    );
    accountName = data.account_name;
  } catch (err) {
    const msg = err instanceof PaystackError ? err.message : "Could not verify account";
    return { error: `Bank account check failed: ${msg}` };
  }

  const bankChanged =
    profile?.bank_code !== parsed.data.bankCode ||
    profile?.account_number !== parsed.data.accountNumber;
  const { error: bankError } = await admin
    .from("users")
    .update({
      bank_code: parsed.data.bankCode,
      account_number: parsed.data.accountNumber,
      account_name: accountName,
      bank_verified_at: new Date().toISOString(),
      ...(bankChanged ? { paystack_recipient_code: null } : {}),
    })
    .eq("id", user.id);
  if (bankError) return { error: bankError.message };

  const recipientName =
    profile?.display_name?.trim() || profile?.email?.split("@")[0] || "Me";

  const resolvedMusic = await resolveSavedTrackId(parsed.data.backgroundMusic ?? null);
  const slug = slugId();
  const { error } = await admin.from("celebrations").insert({
    slug,
    creator_id: user.id,
    title: parsed.data.title,
    recipient_name: recipientName,
    event_type: parsed.data.eventType,
    theme: parsed.data.theme,
    background_music: resolvedMusic,
    celebration_date: celebrationDate,
    is_self: true,
    is_sealed: true,
    is_recurring: recurring,
    is_paid_for_creation: true, // self pages are free
    gallery_images: [],
  });
  if (error) return { error: error.message };

  redirect(`/c/${slug}`);
}

/**
 * Re-initiate the page-creation payment for an existing unpaid page. Lets a
 * creator who abandoned (or mistakenly hit pay) come back, keep editing, and
 * complete the fee later — without losing the page.
 */
export async function restartCreationPayment(slug: string): Promise<CreateState> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };
  if (!user.email) return { error: "Your account is missing an email." };

  const admin = supabaseAdmin();
  const { data: page } = await admin
    .from("celebrations")
    .select("id, slug, creator_id, is_paid_for_creation, creation_payment_reference")
    .eq("slug", slug)
    .maybeSingle();

  if (!page || page.creator_id !== user.id) return { error: "Page not found." };
  if (page.is_paid_for_creation) return { alreadyPaid: true };

  // Guard against a double charge: if the previous attempt actually went
  // through (webhook just hadn't landed yet), settle it instead of re-billing.
  if (page.creation_payment_reference) {
    try {
      const { data } = await paystack.verifyTransaction(page.creation_payment_reference);
      if (data.status === "success") {
        await admin
          .from("celebrations")
          .update({ is_paid_for_creation: true })
          .eq("id", page.id);
        return { alreadyPaid: true };
      }
    } catch {
      // Couldn't verify — fall through to a fresh transaction.
    }
  }

  const reference = `SPBC-${payRef()}`;
  await admin
    .from("celebrations")
    .update({ creation_payment_reference: reference })
    .eq("id", page.id);

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
      metadata: { kind: "page_creation", slug, creator_id: user.id },
    });
    return { authorizationUrl: data.authorization_url };
  } catch (err) {
    const message = err instanceof PaystackError ? err.message : "Could not start payment";
    return { error: `Payment setup failed: ${message}` };
  }
}
