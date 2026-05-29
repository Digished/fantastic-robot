import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type CelebrationView = {
  page: {
    id: string;
    slug: string;
    title: string;
    recipient_name: string;
    event_type: string;
    celebration_date: string;
    claimable_at: string;
    creator_id: string;
    theme: string | null;
    is_self: boolean;
    is_sealed: boolean;
    current_cycle: number;
    wishlist: { title: string; url?: string }[] | null;
  };
  isCreator: boolean;
  viewCycle: number;
  isCurrent: boolean;
  /** Current-cycle messages & gifts stay hidden until the birthday arrives. */
  sealed: boolean;
  /** Past years available to browse, newest first: { cycle, year }. */
  years: { cycle: number; year: number }[];
};

/**
 * Shared context for the wishlist / messages / gifts sub-pages. Reads the page
 * via the service-role client (so past-cycle content isn't hidden by the
 * sealed-wall RLS) and computes the sealed state in app logic instead.
 */
export async function loadCelebrationView(
  slug: string,
  cycleParam: string | undefined,
): Promise<CelebrationView | null> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = supabaseAdmin();

  const { data: page } = await admin
    .from("celebrations")
    .select(
      "id, slug, title, recipient_name, event_type, celebration_date, claimable_at, creator_id, theme, is_self, is_sealed, current_cycle, wishlist",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!page) return null;

  const isCreator = !!user && user.id === page.creator_id;
  const n = Number(cycleParam);
  const viewCycle =
    Number.isInteger(n) && n >= 1 && n <= page.current_cycle ? n : page.current_cycle;
  const isCurrent = viewCycle === page.current_cycle;
  const sealed =
    isCurrent &&
    (page.is_sealed || page.is_self) &&
    new Date(page.claimable_at).getTime() > Date.now();

  // Past years from the snapshot table; newest first.
  let years: { cycle: number; year: number }[] = [
    { cycle: page.current_cycle, year: new Date(page.celebration_date).getUTCFullYear() },
  ];
  if (page.current_cycle > 1) {
    const { data: past } = await admin
      .from("celebration_cycles")
      .select("cycle, celebration_date")
      .eq("celebration_id", page.id)
      .order("cycle", { ascending: false });
    for (const c of past ?? []) {
      years.push({ cycle: c.cycle as number, year: new Date(c.celebration_date as string).getUTCFullYear() });
    }
  }
  years = years.sort((a, b) => b.cycle - a.cycle);

  return { page: page as CelebrationView["page"], isCreator, viewCycle, isCurrent, sealed, years };
}
