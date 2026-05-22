import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SelfCreateForm } from "./form";

export default async function CreateSelfPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/create/me");

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, email, account_name")
    .eq("id", user.id)
    .maybeSingle();

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
          <SelfCreateForm defaultName={name} hasBank={!!profile?.account_name} />
        </div>
      </div>
    </main>
  );
}
