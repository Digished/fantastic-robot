import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getBanks } from "@/lib/paystack/banks";
import { getEffectiveTracks } from "@/lib/music/server";
import { CreateForm } from "./form";

export default async function CreatePage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/create");

  const [banks, tracks] = await Promise.all([getBanks(), getEffectiveTracks()]);

  return (
    <main className="min-h-[100dvh] bg-white pb-20">
      <div className="mx-auto w-full max-w-2xl px-5 pt-6">
        <Link href="/dashboard" className="text-ink/55 text-sm">← Back</Link>
        <h1 className="serif text-5xl text-ink mt-6">Create<br/>a celebration</h1>
        <p className="text-ink/65 mt-3">A page friends can fill in minutes.</p>
        <CreateForm banks={banks} tracks={tracks} />
      </div>
    </main>
  );
}
