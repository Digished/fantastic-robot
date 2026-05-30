import { supabaseServer } from "@/lib/supabase/server";
import { NavMenu } from "./nav-menu";

/** Renders the global menu only when signed in. The Wishlist/Messages/Gifts
 * links go through /me/<tab> redirects, so no per-page DB lookup is needed. */
export async function AppNav() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return <NavMenu />;
}
