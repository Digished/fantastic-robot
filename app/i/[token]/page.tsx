import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { acceptInviteForUser } from "@/lib/friends";

export const dynamic = "force-dynamic";

// Personal invite link (a user's invite_token) or an emailed friend_invite
// token. Opening it makes you friends instantly (per Phase 2 decision). New
// visitors are routed through signup, which consumes the same token.
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/signup?invite=${encodeURIComponent(token)}`);

  const res = await acceptInviteForUser(user.id, token);
  if (res.error) {
    redirect(`/dashboard/friends?invite_error=${encodeURIComponent(res.error)}`);
  }
  redirect("/dashboard/friends?invited=1");
}
