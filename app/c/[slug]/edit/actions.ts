"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hashAnswer } from "@/lib/security";
import { generateIntroContent } from "@/lib/openai/generate-intro";

const editSchema = z.object({
  title: z.string().min(2).max(80),
  messageFromCreator: z.string().max(280).optional(),
  tagline: z.string().max(140).optional(),
  celebrantDescription: z.string().max(1500).optional(),
  coverPhotoPath: z.string().optional(),
  theme: z.enum(["ivory", "midnight", "bloom", "sage", "ocean", "dusk"]).optional(),
  securityQuestion: z.string().min(3).max(140).optional(),
  securityAnswer:   z.string().min(1).max(140).optional(),
  securityQuestionRaw: z.string().optional(),
  galleryImages: z.string().optional(),
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

  const securityQuestionRaw = formData.get("securityQuestion") as string;

  const parsed = editSchema.safeParse({
    title: formData.get("title"),
    messageFromCreator: (formData.get("messageFromCreator") as string) || undefined,
    tagline: (formData.get("tagline") as string) || undefined,
    celebrantDescription: (formData.get("celebrantDescription") as string) || undefined,
    coverPhotoPath: (formData.get("coverPhotoPath") as string) || undefined,
    theme: (formData.get("theme") as string) || undefined,
    securityQuestion: securityQuestionRaw || undefined,
    securityAnswer:   (formData.get("securityAnswer") as string) || undefined,
    securityQuestionRaw,
    galleryImages: (formData.get("galleryImages") as string) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const admin = supabaseAdmin();
  const { data: page } = await admin
    .from("celebrations")
    .select("id, creator_id, recipient_name, event_type, celebration_date, contributor_count")
    .eq("slug", slug)
    .maybeSingle();
  if (!page || page.creator_id !== user.id) return { error: "Not allowed." };

  const clearingSecurity = securityQuestionRaw === "";

  // Regenerate intro content whenever title or description changes.
  const firstName = page.recipient_name.split(" ")[0];
  const introContent = await generateIntroContent({
    firstName,
    recipientName: page.recipient_name,
    eventType: page.event_type,
    celebrationDate: page.celebration_date,
    celebrationTitle: parsed.data.title,
    celebrantDescription: parsed.data.celebrantDescription ?? null,
  });

  let galleryImages: { path: string; caption: string }[] = [];
  try { galleryImages = JSON.parse(parsed.data.galleryImages || "[]"); } catch { /* keep empty */ }

  const { error } = await admin
    .from("celebrations")
    .update({
      title: parsed.data.title,
      message_from_creator: parsed.data.messageFromCreator ?? null,
      tagline: parsed.data.tagline ?? null,
      celebrant_description: parsed.data.celebrantDescription ?? null,
      gallery_images: galleryImages,
      ...(introContent ? { intro_content: introContent } : {}),
      ...(parsed.data.coverPhotoPath ? { cover_photo_path: parsed.data.coverPhotoPath } : {}),
      ...(parsed.data.theme ? { theme: parsed.data.theme } : {}),
      ...(clearingSecurity
        ? { security_question: null, security_answer_hash: null }
        : {
            ...(parsed.data.securityQuestion ? { security_question: parsed.data.securityQuestion } : {}),
            ...(parsed.data.securityAnswer ? { security_answer_hash: hashAnswer(parsed.data.securityAnswer) } : {}),
          }),
    })
    .eq("id", page.id);
  if (error) return { error: error.message };

  revalidatePath(`/c/${slug}`);
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
