import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getBanks } from "@/lib/paystack/banks";
import { getEffectiveTracks } from "@/lib/music/server";
import { rehydrateDraft, type SavedDraft } from "@/lib/draft/draft";
import { CreateForm } from "./form";

export default async function CreatePage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/create");

  const [banks, tracks, draftRow] = await Promise.all([
    getBanks(),
    getEffectiveTracks(),
    supabase
      .from("page_drafts")
      .select("data, updated_at")
      .eq("creator_id", user.id)
      .maybeSingle(),
  ]);

  let initialDraft: SavedDraft | null = null;
  if (draftRow.data?.data) {
    const stored = draftRow.data.data as Omit<SavedDraft, "updatedAt">;
    initialDraft = rehydrateDraft({
      ...stored,
      updatedAt: new Date(draftRow.data.updated_at).getTime(),
    });
  }

  return <CreateForm banks={banks} tracks={tracks} initialDraft={initialDraft} />;
}
