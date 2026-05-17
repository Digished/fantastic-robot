"use server";

import { redirect } from "next/navigation";
import { customAlphabet } from "nanoid";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { paystack, PaystackError } from "@/lib/paystack/client";
import { createCelebrationSchema } from "@/lib/validation/schemas";
import { hashAnswer } from "@/lib/security";
import { generateIntroContent } from "@/lib/openai/generate-intro";

const slugId = customAlphabet("23456789abcdefghjkmnpqrstvwxyz", 10);

export type CreateState = { error?: string };

export async function createCelebration(
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const parsed = createCelebrationSchema.safeParse({
    title: formData.get("title"),
    recipientName: formData.get("recipientName"),
    eventType: formData.get("eventType"),
    theme: formData.get("theme") ?? "ivory",
    celebrationDate: formData.get("celebrationDate"),
    messageFromCreator: formData.get("messageFromCreator") || undefined,
    tagline: formData.get("tagline") || undefined,
    celebrantDescription: formData.get("celebrantDescription") || undefined,
    recipientBankCode: formData.get("recipientBankCode"),
    recipientAccountNumber: formData.get("recipientAccountNumber"),
    coverPhotoPath: formData.get("coverPhotoPath") || undefined,
    securityQuestion: (formData.get("securityQuestion") as string) || undefined,
    securityAnswer:   (formData.get("securityAnswer")   as string) || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Resolve the recipient bank account.
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

  // Generate AI intro slides in parallel with any remaining setup.
  // If OpenAI is unavailable or fails, introContent is null and templates are used.
  const firstName = parsed.data.recipientName.split(" ")[0];
  const introContent = await generateIntroContent({
    firstName,
    recipientName: parsed.data.recipientName,
    eventType: parsed.data.eventType,
    celebrationDate: parsed.data.celebrationDate,
    celebrationTitle: parsed.data.title,
    celebrantDescription: parsed.data.celebrantDescription ?? null,
    messageCount: 0,
  });

  const { error } = await admin.from("celebrations").insert({
    slug,
    creator_id: user.id,
    title: parsed.data.title,
    recipient_name: parsed.data.recipientName,
    event_type: parsed.data.eventType,
    theme: parsed.data.theme,
    celebration_date: parsed.data.celebrationDate,
    message_from_creator: parsed.data.messageFromCreator ?? null,
    tagline: parsed.data.tagline ?? null,
    celebrant_description: parsed.data.celebrantDescription ?? null,
    intro_content: introContent ?? null,
    cover_photo_path: parsed.data.coverPhotoPath ?? null,
    recipient_bank_code: parsed.data.recipientBankCode,
    recipient_account_number: parsed.data.recipientAccountNumber,
    recipient_account_name: accountName,
    security_question:    parsed.data.securityQuestion ?? null,
    security_answer_hash: parsed.data.securityAnswer ? hashAnswer(parsed.data.securityAnswer) : null,
  });

  if (error) return { error: error.message };

  redirect(`/c/${slug}?created=1`);
}
