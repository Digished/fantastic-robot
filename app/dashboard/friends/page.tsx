import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import {
  ensureInviteToken,
  getFriendIds,
  getPublicProfiles,
  getUserBirthdayPage,
  daysUntilBirthday,
  turningAge,
  type PublicProfile,
} from "@/lib/friends";
import { FriendsClient, type FriendItem, type RequestItem } from "./friends-client";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/friends");

  const admin = supabaseAdmin();
  const me = user.id;

  const [inviteToken, friendIds, incomingRows, outgoingRows] = await Promise.all([
    ensureInviteToken(me),
    getFriendIds(me),
    admin
      .from("friend_requests")
      .select("id, requester_id")
      .eq("addressee_id", me)
      .eq("status", "pending"),
    admin
      .from("friend_requests")
      .select("id, addressee_id")
      .eq("requester_id", me)
      .eq("status", "pending"),
  ]);

  // Resolve every profile we need in one fetch.
  const incomingIds = (incomingRows.data ?? []).map((r) => r.requester_id as string);
  const outgoingIds = (outgoingRows.data ?? []).map((r) => r.addressee_id as string);
  const profiles = await getPublicProfiles([
    ...new Set([...friendIds, ...incomingIds, ...outgoingIds]),
  ]);
  const byId = new Map<string, PublicProfile>(profiles.map((p) => [p.id, p]));

  // Friends with their birthday page + countdown, soonest first.
  const friendItems: FriendItem[] = (
    await Promise.all(
      friendIds.map(async (id) => {
        const profile = byId.get(id);
        if (!profile) return null;
        const page = profile.dateOfBirth ? await getUserBirthdayPage(id) : null;
        const days = profile.dateOfBirth ? daysUntilBirthday(profile.dateOfBirth) : null;
        const turning = profile.dateOfBirth ? turningAge(profile.dateOfBirth) : null;
        return { profile, slug: page?.slug ?? null, days, turning } as FriendItem;
      }),
    )
  ).filter((x): x is FriendItem => x !== null)
    .sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));

  const incoming: RequestItem[] = (incomingRows.data ?? [])
    .map((r) => {
      const profile = byId.get(r.requester_id as string);
      return profile ? { id: r.id as string, profile } : null;
    })
    .filter((x): x is RequestItem => x !== null);

  const outgoing: RequestItem[] = (outgoingRows.data ?? [])
    .map((r) => {
      const profile = byId.get(r.addressee_id as string);
      return profile ? { id: r.id as string, profile } : null;
    })
    .filter((x): x is RequestItem => x !== null);

  return (
    <main className="min-h-[100dvh] bg-white pb-28" data-theme="ivory">
      <div className="mx-auto max-w-3xl px-5 md:px-10 pt-6">
        <Link href="/dashboard" className="text-ink/55 text-sm hover:text-ink inline-flex items-center gap-1">
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
        <h1 className="serif text-4xl text-ink mt-4">Friends</h1>
        <p className="text-ink/55 mt-2 text-sm">
          Add friends to see their birthday countdowns and never miss the day.
        </p>

        <div className="mt-8">
          <FriendsClient
            inviteUrl={`${env.appUrl()}/i/${inviteToken}`}
            friends={friendItems}
            incoming={incoming}
            outgoing={outgoing}
          />
        </div>
      </div>
    </main>
  );
}
