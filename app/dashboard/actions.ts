"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type DeleteState = { error?: string; ok?: boolean };

/**
 * Permanently removes an unpublished celebration belonging to the caller.
 * Refuses to touch anything that has been paid for or has received any
 * contributions, so creators can't accidentally nuke real money.
 */
export async function deleteUnpaidCelebration(slug: string): Promise<DeleteState> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const admin = supabaseAdmin();
  const { data: page } = await admin
    .from("celebrations")
    .select("id, creator_id, is_paid_for_creation")
    .eq("slug", slug)
    .maybeSingle();

  if (!page) return { error: "Page not found." };
  if (page.creator_id !== user.id) return { error: "Not your page." };
  if (page.is_paid_for_creation !== false) {
    return { error: "Only unpublished pages can be deleted." };
  }

  // Belt-and-braces: an unpaid page is hidden from the public, so this
  // should always be zero — but if a contribution row ever did get
  // attached, refuse rather than crashing on the FK restrict.
  const { count } = await admin
    .from("contributions")
    .select("id", { head: true, count: "exact" })
    .eq("celebration_id", page.id);
  if ((count ?? 0) > 0) {
    return { error: "This page has contributions and can't be deleted." };
  }

  const { error } = await admin
    .from("celebrations")
    .delete()
    .eq("id", page.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}
