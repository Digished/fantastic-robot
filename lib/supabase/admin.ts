import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Service-role client — use ONLY in server-only modules (route handlers,
// server actions, never imported into a client component).
export function supabaseAdmin() {
  return createClient(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
