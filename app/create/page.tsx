import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getBanks } from "@/lib/paystack/banks";
import { getEffectiveTracks } from "@/lib/music/server";
import { CreateForm } from "./form";

export default async function CreatePage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/create");

  const [banks, tracks] = await Promise.all([getBanks(), getEffectiveTracks()]);

  return <CreateForm banks={banks} tracks={tracks} />;
}
