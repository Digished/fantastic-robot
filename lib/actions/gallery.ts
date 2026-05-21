"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { contentWindowOpen } from "@/lib/celebration-windows";

type GalleryItem = { path: string; caption: string; kind: "image" | "video" };

export async function addGalleryItem(
  slug: string,
  item: GalleryItem,
): Promise<{ error?: string; ok?: boolean }> {
  const admin = supabaseAdmin();

  const { data: page } = await admin
    .from("celebrations")
    .select("id, status, celebration_date, gallery_images")
    .eq("slug", slug)
    .maybeSingle();

  if (!page) return { error: "not found" };
  if (page.status !== "active" || !contentWindowOpen(page.celebration_date)) {
    return { error: "closed" };
  }

  const existing = (page.gallery_images as GalleryItem[]) ?? [];
  if (existing.length >= 20) return { error: "Gallery is full (20 items max)" };
  const { error } = await admin
    .from("celebrations")
    .update({ gallery_images: [...existing, item] })
    .eq("id", page.id);

  if (error) return { error: error.message };

  revalidatePath(`/c/${slug}`);
  revalidatePath(`/c/${slug}/celebrate`);
  return { ok: true };
}
