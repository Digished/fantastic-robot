import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { getBanks } from "@/lib/paystack/banks";
import { ProfileForm } from "./form";

export default async function SettingsPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/settings");

  const [{ data: profile }, banks] = await Promise.all([
    supabase
      .from("users")
      .select("display_name, email, bank_code, account_number, account_name, avatar_path")
      .eq("id", user.id)
      .maybeSingle(),
    getBanks(),
  ]);

  return (
    <main className="min-h-[100dvh] bg-white pb-28">
      <div className="mx-auto max-w-2xl px-5 md:px-10 pt-6">
        <Link
          href="/dashboard"
          className="text-ink/55 text-sm hover:text-ink inline-flex items-center gap-1"
        >
          <ArrowLeft className="size-4" /> Dashboard
        </Link>

        <h1 className="serif text-4xl text-ink mt-4">Your profile</h1>
        <p className="text-ink/55 mt-2 text-sm">
          Changes here apply to every celebration you&apos;ve made.
        </p>

        <div className="mt-8">
          <ProfileForm
            initialDisplayName={profile?.display_name ?? ""}
            email={profile?.email ?? user.email ?? ""}
            banks={banks}
            initialBankCode={profile?.bank_code ?? ""}
            initialAccountNumber={profile?.account_number ?? ""}
            initialAccountName={profile?.account_name ?? ""}
            initialAvatarPath={profile?.avatar_path ?? null}
          />
        </div>
      </div>
    </main>
  );
}
