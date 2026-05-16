import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function CreatePage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/create");

  return (
    <main className="min-h-[100dvh] px-5 pt-10 max-w-md mx-auto">
      <h1 className="font-serif text-4xl text-plum">Create a celebration</h1>
      <p className="text-plum/70 mt-3">
        Coming next — Phase 1. The form will collect celebrant details, the
        event date and the recipient's bank account, then verify the account
        with Paystack before the page goes live.
      </p>
    </main>
  );
}
