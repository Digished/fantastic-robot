"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";

type GalleryItem = { path: string; caption: string; kind: "image" | "video" };

export async function addGalleryItem(
  slug: string,
  item: GalleryItem,
): Promise<{ error?: string; ok?: boolean }> {
  const admin = supabaseAdmin();

  const { data: page } = await admin
    .from("celebrations")
    .select("id, status, deadline_at, gallery_images")
    .eq("slug", slug)
    .maybeSingle();

  if (!page) return { error: "not found" };
  if (page.status !== "active" || new Date(page.deadline_at).getTime() < Date.now()) {
    return { error: "closed" };
  }

  const existing = (page.gallery_images as GalleryItem[]) ?? [];
  const { error } = await admin
    .from("celebrations")
    .update({ gallery_images: [...existing, item] })
    .eq("id", page.id);

  if (error) return { error: error.message };

  revalidatePath(`/c/${slug}`);
  revalidatePath(`/c/${slug}/celebrate`);
  return { ok: true };
}
