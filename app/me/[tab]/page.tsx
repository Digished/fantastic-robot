import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

const TABS = ["wishlist", "messages", "gifts"];

// Lightweight redirect to the signed-in user's own page sub-route, so the
// global nav doesn't need to look up the slug on every page load.
export default async function MeTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  if (!TABS.includes(tab)) redirect("/dashboard");

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/me/${tab}`);

  const { data: page } = await supabase
    .from("celebrations")
    .select("slug")
    .eq("creator_id", user.id)
    .eq("is_self", true)
    .eq("event_type", "birthday")
    .limit(1)
    .maybeSingle();
  if (!page?.slug) redirect("/create/me");
  redirect(`/c/${page.slug}/${tab}`);
}
