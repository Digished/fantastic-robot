import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getBanks } from "@/lib/paystack/banks";
import { getEffectiveTracks } from "@/lib/music/server";
import { SelfCreateForm } from "./form";
import type { ShippingAddress } from "@/lib/validation/schemas";

export default async function CreateSelfPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/create/me");

  const [{ data: profile }, banks, tracks] = await Promise.all([
    supabase
      .from("users")
      .select("display_name, email, bank_code, account_number, account_name, shipping_addresses")
      .eq("id", user.id)
      .maybeSingle(),
    getBanks(),
    getEffectiveTracks(),
  ]);

  const name = profile?.display_name?.trim() || profile?.email?.split("@")[0] || "";

  return (
    <main className="min-h-[100dvh] bg-white pb-28">
      <div className="mx-auto max-w-xl px-5 md:px-10 pt-8">
        <h1 className="serif text-4xl text-ink">Your celebration</h1>
        <p className="text-ink/55 mt-2 text-sm">
          A page for the people who love you to leave messages and chip in for a gift —
          kept a complete surprise until the day.
        </p>
        <div className="mt-8">
          <SelfCreateForm
            defaultName={name}
            banks={banks}
            tracks={tracks}
            initialBankCode={profile?.bank_code ?? ""}
            initialAccountNumber={profile?.account_number ?? ""}
            initialAccountName={profile?.account_name ?? ""}
            savedAddresses={(profile?.shipping_addresses as ShippingAddress[]) ?? []}
          />
        </div>
      </div>
    </main>
  );
}
