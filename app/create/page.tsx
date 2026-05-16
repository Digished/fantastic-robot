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
    <main className="min-h-[100dvh] px-5 pt-6 pb-16 max-w-md mx-auto">
      <Link href="/dashboard" className="text-plum/60 text-sm">← Back</Link>
      <h1 className="font-serif text-4xl text-plum mt-6">Create a celebration</h1>
      <p className="text-plum/70 mt-2">A page friends can fill in minutes.</p>
      <CreateForm banks={banks} />
    </main>
  );
}
