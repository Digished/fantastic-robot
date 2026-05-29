"use server";

import { revalidatePath } from "next/cache";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import {
  friendRequestEmailHtml,
  requestAcceptedEmailHtml,
  friendInviteEmailHtml,
} from "@/lib/email/friends-template";
import {
  areFriends,
  createFriendship,
  acceptInviteForUser,
  getPublicProfile,
  getUserBirthdayPage,
  daysUntilBirthday,
  profileName,
  searchUsers,
  type PublicProfile,
} from "@/lib/friends";
import { env } from "@/lib/env";

const inviteToken = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 24);

export type FriendActionState = { error?: string; ok?: boolean };

async function currentUserId(): Promise<string | null> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function emailFor(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin().from("users").select("email").eq("id", userId).maybeSingle();
  return (data?.email as string | undefined) ?? null;
}

/** Search results annotated with relationship + their birthday page (if any). */
export type PersonResult = PublicProfile & {
  relation: "self" | "friend" | "incoming" | "outgoing" | "none";
  slug: string | null;
  days: number | null;
};

export async function searchPeople(query: string): Promise<PersonResult[]> {
  const me = await currentUserId();
  if (!me) return [];
  const profiles = await searchUsers(query, me);
  if (!profiles.length) return [];
  const admin = supabaseAdmin();
  const ids = profiles.map((p) => p.id);
  const [{ data: friends }, { data: reqs }] = await Promise.all([
    admin.from("friendships").select("friend_id").eq("user_id", me).in("friend_id", ids),
    admin
      .from("friend_requests")
      .select("requester_id, addressee_id, status")
      .eq("status", "pending")
      .or(`requester_id.eq.${me},addressee_id.eq.${me}`),
  ]);
  const friendSet = new Set((friends ?? []).map((r) => r.friend_id as string));
  const outgoing = new Set(
    (reqs ?? []).filter((r) => r.requester_id === me).map((r) => r.addressee_id as string),
  );
  const incoming = new Set(
    (reqs ?? []).filter((r) => r.addressee_id === me).map((r) => r.requester_id as string),
  );
  return Promise.all(
    profiles.map(async (p) => {
      const page = p.dateOfBirth ? await getUserBirthdayPage(p.id) : null;
      return {
        ...p,
        relation: friendSet.has(p.id)
          ? "friend"
          : outgoing.has(p.id)
            ? "outgoing"
            : incoming.has(p.id)
              ? "incoming"
              : "none",
        slug: page?.slug ?? null,
        days: p.dateOfBirth ? daysUntilBirthday(p.dateOfBirth) : null,
      } as PersonResult;
    }),
  );
}

export async function sendFriendRequest(targetId: string): Promise<FriendActionState> {
  const me = await currentUserId();
  if (!me) return { error: "Please sign in again." };
  if (targetId === me) return { error: "That's you." };

  const admin = supabaseAdmin();
  if (await areFriends(me, targetId)) return { ok: true };

  // If they already asked us, accept it instead of opening a second request.
  const { data: reverse } = await admin
    .from("friend_requests")
    .select("id")
    .eq("requester_id", targetId)
    .eq("addressee_id", me)
    .eq("status", "pending")
    .maybeSingle();
  if (reverse) {
    await createFriendship(me, targetId);
    revalidatePath("/dashboard/friends");
    return { ok: true };
  }

  const { error } = await admin
    .from("friend_requests")
    .upsert(
      { requester_id: me, addressee_id: targetId, status: "pending", responded_at: null },
      { onConflict: "requester_id,addressee_id" },
    );
  if (error) return { error: error.message };

  // Best-effort notification.
  try {
    const [to, mine] = await Promise.all([emailFor(targetId), getPublicProfile(me)]);
    if (to && mine) {
      await sendEmail({
        to,
        subject: `${profileName(mine)} sent you a friend request`,
        html: friendRequestEmailHtml({
          requesterName: profileName(mine),
          url: `${env.appUrl()}/dashboard/friends`,
        }),
      });
    }
  } catch { /* email is non-blocking */ }

  revalidatePath("/dashboard/friends");
  return { ok: true };
}

export async function respondToRequest(
  requestId: string,
  accept: boolean,
): Promise<FriendActionState> {
  const me = await currentUserId();
  if (!me) return { error: "Please sign in again." };

  const admin = supabaseAdmin();
  const { data: req } = await admin
    .from("friend_requests")
    .select("id, requester_id, addressee_id, status")
    .eq("id", requestId)
    .maybeSingle();
  if (!req || req.addressee_id !== me) return { error: "Request not found." };
  if (req.status !== "pending") return { ok: true };

  if (accept) {
    await createFriendship(req.requester_id as string, me);
    try {
      const [to, mine] = await Promise.all([emailFor(req.requester_id as string), getPublicProfile(me)]);
      if (to && mine) {
        await sendEmail({
          to,
          subject: `${profileName(mine)} accepted your friend request`,
          html: requestAcceptedEmailHtml({
            friendName: profileName(mine),
            url: `${env.appUrl()}/dashboard/friends`,
          }),
        });
      }
    } catch { /* non-blocking */ }
  } else {
    await admin
      .from("friend_requests")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", requestId);
  }

  revalidatePath("/dashboard/friends");
  return { ok: true };
}

export async function cancelRequest(requestId: string): Promise<FriendActionState> {
  const me = await currentUserId();
  if (!me) return { error: "Please sign in again." };
  const admin = supabaseAdmin();
  await admin
    .from("friend_requests")
    .update({ status: "cancelled", responded_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("requester_id", me);
  revalidatePath("/dashboard/friends");
  return { ok: true };
}

export async function unfriend(friendId: string): Promise<FriendActionState> {
  const me = await currentUserId();
  if (!me) return { error: "Please sign in again." };
  const admin = supabaseAdmin();
  await admin
    .from("friendships")
    .delete()
    .or(
      `and(user_id.eq.${me},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${me})`,
    );
  // Clear requests between them so they can reconnect later.
  await admin
    .from("friend_requests")
    .delete()
    .or(
      `and(requester_id.eq.${me},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${me})`,
    );
  revalidatePath("/dashboard/friends");
  return { ok: true };
}

const emailSchema = z.string().email().max(120);

export async function inviteByEmail(email: string): Promise<FriendActionState> {
  const me = await currentUserId();
  if (!me) return { error: "Please sign in again." };
  const parsed = emailSchema.safeParse(email.trim());
  if (!parsed.success) return { error: "Enter a valid email address." };

  const admin = supabaseAdmin();
  const token = inviteToken();
  const { error } = await admin
    .from("friend_invites")
    .insert({ inviter_id: me, email: parsed.data, token });
  if (error) return { error: error.message };

  try {
    const mine = await getPublicProfile(me);
    await sendEmail({
      to: parsed.data,
      subject: `${mine ? profileName(mine) : "A friend"} invited you to Spendbox`,
      html: friendInviteEmailHtml({
        inviterName: mine ? profileName(mine) : "A friend",
        acceptUrl: `${env.appUrl()}/i/${token}`,
      }),
    });
  } catch (e) {
    return { error: e instanceof Error ? `Could not send invite: ${e.message}` : "Could not send invite." };
  }

  revalidatePath("/dashboard/friends");
  return { ok: true };
}

/** Accept an invite token (used by the /i/[token] landing once signed in). */
export async function acceptInvite(token: string): Promise<FriendActionState> {
  const me = await currentUserId();
  if (!me) return { error: "Please sign in again." };
  const res = await acceptInviteForUser(me, token);
  if (res.error) return { error: res.error };
  revalidatePath("/dashboard/friends");
  return { ok: true };
}
