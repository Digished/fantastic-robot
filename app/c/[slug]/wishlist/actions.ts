"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { wishlistSchema } from "@/lib/validation/schemas";

export type WishlistState = { error?: string; ok?: boolean };

export async function saveWishlist(slug: string, itemsJson: string): Promise<WishlistState> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  let parsedJson: unknown;
  try { parsedJson = JSON.parse(itemsJson); } catch { return { error: "Invalid wishlist." }; }
  const parsed = wishlistSchema.safeParse(parsedJson);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const admin = supabaseAdmin();
  const { data: page } = await admin
    .from("celebrations")
    .select("id, creator_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!page || page.creator_id !== user.id) return { error: "Not allowed." };

  const clean = parsed.data
    .map((w) => {
      const url = (w.url ?? "").trim();
      const normalized = url && !/^https?:\/\//i.test(url) ? `https://${url}` : url;
      return { title: w.title.trim(), url: normalized || undefined };
    })
    .filter((w) => w.title.length > 0);

  const { error } = await admin.from("celebrations").update({ wishlist: clean }).eq("id", page.id);
  if (error) return { error: error.message };

  revalidatePath(`/c/${slug}/wishlist`);
  revalidatePath(`/c/${slug}`);
  return { ok: true };
}
