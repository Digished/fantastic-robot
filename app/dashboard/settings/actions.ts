"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export type ProfileState = { error?: string; ok?: boolean };

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const raw = (formData.get("displayName") as string | null)?.trim() ?? "";
  if (raw.length > 60) return { error: "Name is too long (max 60 chars)." };
  // Empty string means "use email prefix" — store as null.
  const displayName = raw.length === 0 ? null : raw;

  const { error } = await supabase
    .from("users")
    .update({ display_name: displayName })
    .eq("id", user.id);
  if (error) return { error: error.message };

  // The creator label is rendered on every public celebration page. Bust the
  // dashboard cache; individual pages are dynamic so they'll refetch on view.
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}
