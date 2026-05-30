import { supabaseServer } from "@/lib/supabase/server";
import { NavMenu } from "./nav-menu";

/**
 * Renders the global menu when signed in. Uses getSession() (reads the auth
 * cookie, no network round-trip) so the button is in the initial HTML and
 * doesn't flash in after load.
 */
export async function AppNav() {
  const supabase = await supabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  return <NavMenu />;
}
