import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ensureInviteToken, getFriendsWithBirthdays } from "@/lib/friends";
import { FriendsPanel } from "../friends-panel";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/friends");

  const [friends, inviteToken] = await Promise.all([
    getFriendsWithBirthdays(user.id),
    ensureInviteToken(user.id),
  ]);

  return (
    <main className="min-h-[100dvh] bg-white pb-28" data-theme="ivory">
      <div className="mx-auto max-w-3xl px-5 md:px-10 pt-6">
        <Link href="/dashboard" className="text-ink/55 text-sm hover:text-ink inline-flex items-center gap-1">
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
        <FriendsPanel inviteUrl={`${env.appUrl()}/i/${inviteToken}`} friends={friends} />
      </div>
    </main>
  );
}
