import { customAlphabet } from "nanoid";
import { supabaseAdmin } from "@/lib/supabase/admin";

const newToken = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 24);

// A user's public-safe profile. Cross-user reads go through the service-role
// client and return only these columns — never bank/shipping/email data — the
// same rationale as lib/creator.ts (users RLS only exposes the caller's row).
export type PublicProfile = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarPath: string | null;
  dateOfBirth: string | null;
};

const SAFE_COLS = "id, username, display_name, avatar_path, date_of_birth";

type SafeRow = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_path?: string | null;
  date_of_birth?: string | null;
};

function toProfile(r: SafeRow): PublicProfile {
  return {
    id: r.id,
    username: r.username ?? null,
    displayName: r.display_name ?? null,
    avatarPath: r.avatar_path ?? null,
    dateOfBirth: r.date_of_birth ?? null,
  };
}

/** A friendly name for a profile: display name, else @username, else "A friend". */
export function profileName(p: PublicProfile): string {
  return p.displayName?.trim() || (p.username ? `@${p.username}` : "A friend");
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("friendships")
    .select("user_id")
    .eq("user_id", a)
    .eq("friend_id", b)
    .maybeSingle();
  return !!data;
}

/** Make two users friends (idempotent) and accept any pending request between them. */
export async function createFriendship(a: string, b: string): Promise<void> {
  if (a === b) return;
  const admin = supabaseAdmin();
  await admin
    .from("friendships")
    .upsert(
      [
        { user_id: a, friend_id: b },
        { user_id: b, friend_id: a },
      ],
      { onConflict: "user_id,friend_id", ignoreDuplicates: true },
    );
  await admin
    .from("friend_requests")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .or(
      `and(requester_id.eq.${a},addressee_id.eq.${b}),and(requester_id.eq.${b},addressee_id.eq.${a})`,
    )
    .eq("status", "pending");
}

/** Resolve an invite token (email invite or a user's personal link) and friend them. */
export async function acceptInviteForUser(
  userId: string,
  token: string,
): Promise<{ ok?: true; error?: string; inviterId?: string }> {
  const admin = supabaseAdmin();
  let inviterId: string | null = null;
  const { data: inv } = await admin
    .from("friend_invites")
    .select("id, inviter_id")
    .eq("token", token)
    .maybeSingle();
  if (inv) inviterId = inv.inviter_id as string;
  else {
    const { data: u } = await admin
      .from("users")
      .select("id")
      .eq("invite_token", token)
      .maybeSingle();
    inviterId = (u?.id as string | undefined) ?? null;
  }
  if (!inviterId) return { error: "This invite link is invalid or expired." };
  if (inviterId === userId) return { error: "That's your own invite link." };
  await createFriendship(userId, inviterId);
  if (inv) {
    await admin
      .from("friend_invites")
      .update({ status: "accepted", accepted_by: userId })
      .eq("id", inv.id);
  }
  return { ok: true, inviterId };
}

/** The caller's personal invite token, generating one on first use. */
export async function ensureInviteToken(userId: string): Promise<string> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("users")
    .select("invite_token")
    .eq("id", userId)
    .maybeSingle();
  const existing = (data?.invite_token as string | null | undefined) ?? null;
  if (existing) return existing;
  const token = newToken();
  await admin.from("users").update({ invite_token: token }).eq("id", userId);
  return token;
}

export async function getFriendIds(userId: string): Promise<string[]> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("friendships")
    .select("friend_id")
    .eq("user_id", userId);
  return (data ?? []).map((r) => r.friend_id as string);
}

// A friend plus their birthday page + countdown, for feeds and lists.
export type FriendBirthday = {
  profile: PublicProfile;
  slug: string | null;
  days: number | null;
  turning: number | null;
};
export type RequestPerson = { id: string; profile: PublicProfile };

export async function getFriendsWithBirthdays(userId: string): Promise<FriendBirthday[]> {
  const profiles = await getPublicProfiles(await getFriendIds(userId));
  const pages = await getBirthdayPagesFor(profiles.map((p) => p.id));
  return profiles
    .map((profile) => {
      const days = profile.dateOfBirth ? daysUntilBirthday(profile.dateOfBirth) : null;
      const turning = profile.dateOfBirth ? turningAge(profile.dateOfBirth) : null;
      return { profile, slug: pages.get(profile.id)?.slug ?? null, days, turning } as FriendBirthday;
    })
    .sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));
}

export async function getIncomingRequests(userId: string): Promise<RequestPerson[]> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("friend_requests")
    .select("id, requester_id")
    .eq("addressee_id", userId)
    .eq("status", "pending");
  const profiles = await getPublicProfiles((data ?? []).map((r) => r.requester_id as string));
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return (data ?? [])
    .map((r) => {
      const profile = byId.get(r.requester_id as string);
      return profile ? { id: r.id as string, profile } : null;
    })
    .filter((x): x is RequestPerson => x !== null);
}

export async function getOutgoingRequests(userId: string): Promise<RequestPerson[]> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("friend_requests")
    .select("id, addressee_id")
    .eq("requester_id", userId)
    .eq("status", "pending");
  const profiles = await getPublicProfiles((data ?? []).map((r) => r.addressee_id as string));
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return (data ?? [])
    .map((r) => {
      const profile = byId.get(r.addressee_id as string);
      return profile ? { id: r.id as string, profile } : null;
    })
    .filter((x): x is RequestPerson => x !== null);
}

export async function getPublicProfiles(ids: string[]): Promise<PublicProfile[]> {
  if (!ids.length) return [];
  const admin = supabaseAdmin();
  const { data } = await admin.from("users").select(SAFE_COLS).in("id", ids);
  return ((data as SafeRow[] | null) ?? []).map(toProfile);
}

export async function getPublicProfile(id: string): Promise<PublicProfile | null> {
  const admin = supabaseAdmin();
  const { data } = await admin.from("users").select(SAFE_COLS).eq("id", id).maybeSingle();
  return data ? toProfile(data as SafeRow) : null;
}

/** The slug + meta of a user's own birthday page, if they have one. */
export async function getUserBirthdayPage(userId: string): Promise<{
  slug: string;
  celebration_date: string;
  theme: string | null;
  cover_photo_path: string | null;
} | null> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("celebrations")
    .select("slug, celebration_date, theme, cover_photo_path")
    .eq("creator_id", userId)
    .eq("is_self", true)
    .eq("event_type", "birthday")
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/** Birthday pages for many users in one query (creator_id → slug + date). */
export async function getBirthdayPagesFor(
  ids: string[],
): Promise<Map<string, { slug: string; celebration_date: string }>> {
  const map = new Map<string, { slug: string; celebration_date: string }>();
  if (!ids.length) return map;
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("celebrations")
    .select("creator_id, slug, celebration_date")
    .eq("is_self", true)
    .eq("event_type", "birthday")
    .in("creator_id", ids);
  for (const r of data ?? []) {
    if (!map.has(r.creator_id as string)) {
      map.set(r.creator_id as string, {
        slug: r.slug as string,
        celebration_date: r.celebration_date as string,
      });
    }
  }
  return map;
}

/** Find people to add — by @username / display name (contains) or exact email. */
export async function searchUsers(query: string, excludeId: string): Promise<PublicProfile[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const admin = supabaseAdmin();
  // Strip PostgREST wildcards so user input can't broaden the match.
  const like = q.replace(/[%,]/g, "");
  const { data } = await admin
    .from("users")
    .select(SAFE_COLS)
    .or(`username.ilike.%${like}%,display_name.ilike.%${like}%`)
    .neq("id", excludeId)
    .limit(20);
  const rows = ((data as SafeRow[] | null) ?? []).slice();
  // Exact email match only (case-insensitive) so emails can't be enumerated.
  if (q.includes("@")) {
    const { data: byEmail } = await admin
      .from("users")
      .select(SAFE_COLS)
      .ilike("email", q)
      .neq("id", excludeId)
      .limit(5);
    for (const r of (byEmail as SafeRow[] | null) ?? []) {
      if (!rows.some((x) => x.id === r.id)) rows.push(r);
    }
  }
  return rows.map(toProfile);
}

/**
 * Whole days until a person's next birthday (0 on the day). Ignores the year in
 * the DOB and the 96h create rule — this is for feed ordering and reminders.
 */
export function daysUntilBirthday(dateOfBirth: string, now: Date = new Date()): number | null {
  const [, m, d] = dateOfBirth.split("-").map(Number);
  if (!m || !d) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  let next = Date.UTC(now.getUTCFullYear(), m - 1, d);
  if (next < today) next = Date.UTC(now.getUTCFullYear() + 1, m - 1, d);
  return Math.round((next - today) / 86_400_000);
}

/** The next birthday as an ISO timestamp (9am Africa/Lagos), for countdowns. */
export function nextBirthdayISO(dateOfBirth: string, now: Date = new Date()): string | null {
  const days = daysUntilBirthday(dateOfBirth, now);
  if (days === null) return null;
  const [, m, d] = dateOfBirth.split("-").map(Number);
  const target = new Date(now.getTime() + days * 86_400_000);
  const year = target.getUTCFullYear();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(m)}-${pad(d)}T09:00:00+01:00`;
}

/** The age someone turns on their next birthday, if their birth year is known. */
export function turningAge(dateOfBirth: string, now: Date = new Date()): number | null {
  const birthYear = Number(dateOfBirth.slice(0, 4));
  if (!birthYear) return null;
  const days = daysUntilBirthday(dateOfBirth, now);
  if (days === null) return null;
  const target = new Date(now.getTime() + days * 86_400_000);
  const age = target.getUTCFullYear() - birthYear;
  return age > 0 && age < 130 ? age : null;
}
