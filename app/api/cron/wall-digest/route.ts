import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { wallDigestEmailHtml } from "@/lib/email/digest-template";
import { daysUntilBirthday } from "@/lib/friends";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

// The day's window in Africa/Lagos (UTC+1, no DST). We send the digest at the
// end of the Lagos day, summarising what landed since local midnight.
const LAGOS_OFFSET_MS = 60 * 60 * 1000;

// End-of-day digest: tell each celebrant how many messages and gifts landed on
// their sealed birthday page today — counts only, never content or amounts.
// Triggered by Vercel Cron with `Authorization: Bearer CRON_SECRET`.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.cronSecret()}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const admin = supabaseAdmin();
  const now = new Date();

  // Start of "today" in Lagos, expressed as a UTC instant.
  const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS);
  const startUtc = new Date(
    Date.UTC(lagosNow.getUTCFullYear(), lagosNow.getUTCMonth(), lagosNow.getUTCDate()) - LAGOS_OFFSET_MS,
  );
  const startIso = startUtc.toISOString();
  const digestDate = startIso.slice(0, 10);

  // Active sealed birthday pages (still counting toward the next birthday).
  const { data: pages } = await admin
    .from("celebrations")
    .select("id, slug, recipient_name, creator_id, current_cycle, claimable_at, is_sealed, is_self")
    .eq("is_self", true)
    .eq("event_type", "birthday")
    .gt("claimable_at", startIso);

  let sent = 0;
  for (const page of pages ?? []) {
    // Count today's messages and paid gifts for the current cycle.
    const [{ count: msgCount }, { count: giftCount }] = await Promise.all([
      admin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("celebration_id", page.id)
        .eq("cycle", page.current_cycle)
        .is("deleted_at", null)
        .gte("created_at", startIso),
      admin
        .from("contributions")
        .select("id", { count: "exact", head: true })
        .eq("celebration_id", page.id)
        .eq("cycle", page.current_cycle)
        .eq("status", "paid")
        .gte("paid_at", startIso),
    ]);
    const messages = msgCount ?? 0;
    const gifts = giftCount ?? 0;
    if (messages === 0 && gifts === 0) continue;

    // Idempotency: claim the send first so a re-run can't double-email.
    const { error: logErr } = await admin
      .from("wall_digest_log")
      .insert({ celebration_id: page.id, digest_date: digestDate });
    if (logErr) continue; // already sent today

    const { data: owner } = await admin
      .from("users")
      .select("email, display_name, date_of_birth")
      .eq("id", page.creator_id)
      .maybeSingle();
    if (!owner?.email) continue;

    const firstName =
      owner.display_name?.trim().split(" ")[0] ||
      page.recipient_name.split(" ")[0] ||
      "there";
    const daysUntil = owner.date_of_birth ? (daysUntilBirthday(owner.date_of_birth, now) ?? 0) : 0;

    try {
      await sendEmail({
        to: owner.email,
        subject: `🎁 ${messages + gifts} new ${messages + gifts === 1 ? "surprise" : "surprises"} on your page today`,
        html: wallDigestEmailHtml({
          firstName,
          messageCount: messages,
          giftCount: gifts,
          daysUntil,
          pageUrl: `${env.appUrl()}/c/${page.slug}`,
        }),
      });
      sent += 1;
    } catch {
      // Roll back the claim so the next run can retry.
      await admin
        .from("wall_digest_log")
        .delete()
        .eq("celebration_id", page.id)
        .eq("digest_date", digestDate);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
