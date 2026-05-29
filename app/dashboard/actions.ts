"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type DeleteState = { error?: string; ok?: boolean };

/**
 * Permanently deletes a celebration the caller created — published or not, for
 * themselves or someone else — along with everything attached to it.
 *
 * Messages, gallery, cycles and blessings clear via ON DELETE CASCADE, but
 * payouts and contributions reference the page with ON DELETE RESTRICT, so we
 * remove those first (deleting contributions also nulls messages.contribution_id).
 * This erases the page's financial records too — there's no undo.
 */
export async function deleteCelebration(slug: string): Promise<DeleteState> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const admin = supabaseAdmin();
  const { data: page } = await admin
    .from("celebrations")
    .select("id, creator_id")
    .eq("slug", slug)
    .maybeSingle();

  if (!page) return { error: "Page not found." };
  if (page.creator_id !== user.id) return { error: "Not your page." };

  // Remove the RESTRICT children before the page itself.
  const { error: payoutErr } = await admin
    .from("payouts")
    .delete()
    .eq("celebration_id", page.id);
  if (payoutErr) return { error: payoutErr.message };

  const { error: contribErr } = await admin
    .from("contributions")
    .delete()
    .eq("celebration_id", page.id);
  if (contribErr) return { error: contribErr.message };

  const { error } = await admin
    .from("celebrations")
    .delete()
    .eq("id", page.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}
