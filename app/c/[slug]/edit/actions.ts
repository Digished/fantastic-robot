"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const editSchema = z.object({
  title: z.string().min(2).max(80),
  messageFromCreator: z.string().max(280).optional(),
  coverPhotoPath: z.string().optional(),
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
    coverPhotoPath: (formData.get("coverPhotoPath") as string) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const admin = supabaseAdmin();
  const { data: page } = await admin
    .from("celebrations")
    .select("id, creator_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!page || page.creator_id !== user.id) return { error: "Not allowed." };

  const { error } = await admin
    .from("celebrations")
    .update({
      title: parsed.data.title,
      message_from_creator: parsed.data.messageFromCreator ?? null,
      ...(parsed.data.coverPhotoPath
        ? { cover_photo_path: parsed.data.coverPhotoPath }
        : {}),
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
