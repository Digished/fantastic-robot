import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getBanks } from "@/lib/paystack/banks";
import { CreateForm } from "./form";

export default async function CreatePage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/create");

  const banks = await getBanks();

  return (
    <main className="relative min-h-[100dvh] mesh-warm grain pb-20">
      <div className="relative z-10 px-5 pt-6 max-w-md mx-auto">
        <Link href="/dashboard" className="text-plum/60 text-sm">← Back</Link>
        <h1 className="font-serif text-5xl text-plum mt-6 leading-[0.95]">
          Create<br/>a celebration
        </h1>
        <p className="text-plum/65 mt-3">A page friends can fill in minutes.</p>
        <CreateForm banks={banks} />
      </div>
    </main>
  );
}
