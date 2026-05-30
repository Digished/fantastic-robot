import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { birthdayReminderEmailHtml } from "@/lib/email/friends-template";
import { daysUntilBirthday } from "@/lib/friends";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

// Offsets (days before the birthday) we send a reminder for.
const OFFSETS = [7, 1, 0];

function whenLabel(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

// Daily dispatcher: email people about friends' birthdays at 7/1/0 days out.
// Triggered by Vercel Cron carrying `Authorization: Bearer CRON_SECRET`.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.cronSecret()}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const admin = supabaseAdmin();
  const now = new Date();

  const [{ data: friendships }, { data: users }, { data: pages }] = await Promise.all([
    admin.from("friendships").select("user_id, friend_id"),
    admin.from("users").select("id, email, display_name, username, date_of_birth"),
    admin
      .from("celebrations")
      .select("slug, creator_id")
      .eq("is_self", true)
      .eq("event_type", "birthday"),
  ]);

  type U = { id: string; email: string | null; display_name: string | null; username: string | null; date_of_birth: string | null };
  const userById = new Map<string, U>((users ?? []).map((u) => [u.id as string, u as U]));
  const slugByCreator = new Map<string, string>(
    (pages ?? []).map((p) => [p.creator_id as string, p.slug as string]),
  );
  const nameOf = (u: U) => u.display_name?.trim() || (u.username ? `@${u.username}` : "Your friend");

  let sent = 0;
  for (const f of friendships ?? []) {
    const recipient = userById.get(f.user_id as string);
    const friend = userById.get(f.friend_id as string);
    if (!recipient?.email || !friend?.date_of_birth) continue;

    const days = daysUntilBirthday(friend.date_of_birth, now);
    if (days === null || !OFFSETS.includes(days)) continue;

    const birthdayYear = new Date(now.getTime() + days * 86_400_000).getUTCFullYear();
    const logRow = {
      recipient_id: recipient.id,
      friend_id: friend.id,
      birthday_year: birthdayYear,
      offset_days: days,
    };

    // Claim the send first (unique PK) so we never double-email.
    const { error: logErr } = await admin.from("birthday_reminder_log").insert(logRow);
    if (logErr) continue; // already sent (or a race) — skip

    const slug = slugByCreator.get(friend.id);
    const url = slug ? `${env.appUrl()}/c/${slug}` : `${env.appUrl()}/dashboard/friends`;
    try {
      await sendEmail({
        to: recipient.email,
        subject: `${nameOf(friend)}'s birthday is ${whenLabel(days)}`,
        html: birthdayReminderEmailHtml({ friendName: nameOf(friend), whenLabel: whenLabel(days), url }),
      });
      sent += 1;
    } catch {
      // Roll back the claim so the next run can retry.
      await admin
        .from("birthday_reminder_log")
        .delete()
        .eq("recipient_id", logRow.recipient_id)
        .eq("friend_id", logRow.friend_id)
        .eq("birthday_year", logRow.birthday_year)
        .eq("offset_days", logRow.offset_days);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
