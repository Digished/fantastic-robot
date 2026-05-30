import { supabaseServer } from "@/lib/supabase/server";
import { NavMenu } from "./nav-menu";

/** Renders the global menu only when signed in, wiring in the user's own
 * birthday page slug for the Wishlist / Messages / Gifts links. */
export async function AppNav() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: page } = await supabase
    .from("celebrations")
    .select("slug")
    .eq("creator_id", user.id)
    .eq("is_self", true)
    .eq("event_type", "birthday")
    .limit(1)
    .maybeSingle();

  return <NavMenu slug={page?.slug ?? null} />;
}
