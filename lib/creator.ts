import { supabaseAdmin } from "@/lib/supabase/admin";

// Resolves a celebration creator to a short, public-safe label.
// RLS hides public.users rows from anon/other-user clients, so we use the
// service-role admin client and only return non-sensitive fields.
export async function getCreatorLabel(creatorId: string): Promise<string | null> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("users")
    .select("display_name, email")
    .eq("id", creatorId)
    .maybeSingle();
  if (!data) return null;
  const name = data.display_name?.trim();
  if (name) return name;
  if (data.email) return data.email.split("@")[0];
  return null;
}

// Label + optional profile picture for the page owner. Same RLS rationale as
// getCreatorLabel — read via the service-role client, return only safe fields.
export async function getCreatorProfile(
  creatorId: string,
): Promise<{ label: string | null; avatarPath: string | null }> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("users")
    .select("display_name, email, avatar_path")
    .eq("id", creatorId)
    .maybeSingle();
  if (!data) return { label: null, avatarPath: null };
  const name = data.display_name?.trim();
  const label = name || (data.email ? data.email.split("@")[0] : null);
  return { label, avatarPath: data.avatar_path ?? null };
}
