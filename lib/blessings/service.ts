import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { blessingEmailHtml, creatorGiftStartedEmailHtml } from "@/lib/email/blessing-template";
import { buildBlessingSchedule, type Tone, type WallMessage } from "@/lib/blessings/generate";
import { getCreatorLabel } from "@/lib/creator";
import { env } from "@/lib/env";

export type PlanForSend = {
  id: string;
  recipient_name: string;
  recipient_email: string | null;
  sender_name: string | null;
  redeem_token: string;
  weeks_total: number;
};

export type MessageForSend = {
  id: string;
  week_no: number;
  title: string;
  body: string;
};

// Send one weekly blessing and record the outcome. Marks the message 'sent'
// (with the Resend id) or 'failed'. Completes the plan after its final week.
export async function sendBlessing(plan: PlanForSend, msg: MessageForSend): Promise<boolean> {
  const admin = supabaseAdmin();
  if (!plan.recipient_email) return false;
  try {
    const { id } = await sendEmail({
      to: plan.recipient_email,
      subject:
        msg.week_no === 1
          ? `Your first blessing, ${plan.recipient_name.split(" ")[0]}`
          : msg.title,
      html: blessingEmailHtml({
        recipientName: plan.recipient_name,
        senderName: plan.sender_name,
        weekNo: msg.week_no,
        weeksTotal: plan.weeks_total,
        title: msg.title,
        body: msg.body,
        unsubscribeUrl: `${env.appUrl()}/blessings/unsubscribe/${plan.redeem_token}`,
      }),
    });
    await admin
      .from("blessing_messages")
      .update({ status: "sent", sent_at: new Date().toISOString(), resend_id: id })
      .eq("id", msg.id);
    if (msg.week_no >= plan.weeks_total) {
      await admin.from("blessing_plans").update({ status: "completed" }).eq("id", plan.id);
    }
    return true;
  } catch {
    await admin.from("blessing_messages").update({ status: "failed" }).eq("id", msg.id);
    return false;
  }
}

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

type PaidPlan = {
  id: string;
  celebration_id: string;
  creator_id: string | null;
  recipient_name: string;
  recipient_email: string | null;
  purchaser_email: string | null;
  sender_name: string | null;
  tone: string | null;
  weeks_total: number;
  redeem_token: string;
};

type CelInfo = { event_type: string; slug: string; current_cycle: number } | null;

// A paid blessing goes live the instant payment settles: the recipient's email
// was captured at checkout, so there's no claim step or expiry window. We build
// the year, start the weekly sends (week 1 goes out now), drop the gift on the
// wall, and confirm to the creator.
//
// Called by both the Paystack webhook and the confirmation page; a single
// pending_payment → active transition makes exactly one of them the winner, so
// the year is only ever built and sent once.
export async function activatePaidBlessing(
  match: { reference?: string; id?: string },
): Promise<void> {
  const admin = supabaseAdmin();

  // Claim the plan. Whoever flips it off pending_payment owns the setup below;
  // the loser sees no row and bows out before doing any work (or AI spend).
  const now = new Date();
  let claim = admin
    .from("blessing_plans")
    .update({ status: "active", started_at: now.toISOString() })
    .eq("status", "pending_payment");
  claim = match.reference
    ? claim.eq("paystack_reference", match.reference)
    : claim.eq("id", match.id!);

  const { data: plan, error } = await claim
    .select(
      "id, celebration_id, creator_id, recipient_name, recipient_email, purchaser_email, sender_name, tone, weeks_total, redeem_token",
    )
    .maybeSingle();

  // 23505 = the one-paid-per-celebration index rejected this; another plan is
  // already the page's keepsake. Nothing to activate.
  if (error) {
    if ((error as { code?: string }).code === "23505") return;
    throw error;
  }
  if (!plan) return; // already claimed, or no matching pending plan

  const { data: cel } = await admin
    .from("celebrations")
    .select("event_type, slug, current_cycle")
    .eq("id", plan.celebration_id)
    .maybeSingle();

  await scheduleAndSend(plan as PaidPlan, cel as CelInfo, now);
  await postBlessingGiftCard(plan as PaidPlan, cel?.current_cycle ?? 1);
  await sendGifterStartedEmail({
    to: plan.purchaser_email,
    recipient_name: plan.recipient_name,
    sender_name: plan.sender_name,
    weeks_total: plan.weeks_total,
    celebration_slug: cel?.slug ?? null,
  });
}

// Build the year (real wall notes woven through AI blessings), store the
// schedule, and send week 1 immediately so the gift lands right away.
async function scheduleAndSend(plan: PaidPlan, cel: CelInfo, now: Date): Promise<void> {
  const admin = supabaseAdmin();

  const { data: rows } = await admin
    .from("messages")
    .select("contributor_name, body, is_anonymous")
    .eq("celebration_id", plan.celebration_id)
    .is("deleted_at", null)
    .not("body", "is", null)
    .order("created_at", { ascending: false })
    .limit(30);
  const wallMessages: WallMessage[] = (rows ?? [])
    .filter((r) => !r.is_anonymous && r.body && r.body.trim().length >= 12)
    .map((r) => ({ name: r.contributor_name, body: r.body!.trim() }));

  const schedule = await buildBlessingSchedule({
    recipientName: plan.recipient_name,
    eventType: cel?.event_type ?? "celebration",
    tone: (plan.tone as Tone) ?? "prayer",
    weeksTotal: plan.weeks_total,
    wallMessages,
  });

  await admin.from("blessing_messages").insert(
    schedule.map((w) => ({
      plan_id: plan.id,
      week_no: w.weekNo,
      source: w.source,
      title: w.title,
      body: w.body,
      scheduled_for: addDays(now, (w.weekNo - 1) * 7),
      status: "scheduled" as const,
    })),
  );

  // Send week 1 now; the daily cron carries the rest (and retries week 1 if
  // this immediate send fails, since it stays 'scheduled' until sent).
  const { data: first } = await admin
    .from("blessing_messages")
    .select("id, week_no, title, body")
    .eq("plan_id", plan.id)
    .eq("week_no", 1)
    .maybeSingle();
  if (first) {
    await sendBlessing(
      {
        id: plan.id,
        recipient_name: plan.recipient_name,
        recipient_email: plan.recipient_email,
        sender_name: plan.sender_name,
        redeem_token: plan.redeem_token,
        weeks_total: plan.weeks_total,
      },
      first,
    );
  }
}

// Place the gift on the recipient's wall as a wrapped-gift card they can
// unwrap. On sealed pages it waits with everything else until the day.
async function postBlessingGiftCard(plan: PaidPlan, cycle: number): Promise<void> {
  const admin = supabaseAdmin();
  const gifter =
    plan.sender_name?.trim() ||
    (plan.creator_id ? await getCreatorLabel(plan.creator_id) : null) ||
    "A loved one";
  const firstName = plan.recipient_name.split(" ")[0] || plan.recipient_name;

  await admin.from("messages").insert({
    celebration_id: plan.celebration_id,
    cycle,
    contributor_name: gifter,
    is_anonymous: false,
    body: `52 Weeks of Blessings for ${firstName} — a short prayer or blessing by email, every week for a year. 🕊️`,
    media_kind: "none",
    interactive_kind: "gift",
    interactive_payload: { source: "blessing", plan_id: plan.id },
  });
}

// Confirm to the gifter that their gift has started and the first blessing is
// on its way. Best-effort: a delivery hiccup never blocks the purchase.
export async function sendGifterStartedEmail(plan: {
  to: string | null;
  recipient_name: string;
  sender_name: string | null;
  weeks_total: number;
  celebration_slug?: string | null;
}): Promise<void> {
  if (!plan.to) return;
  try {
    const firstName = plan.recipient_name.split(" ")[0] || plan.recipient_name;
    const pageUrl = plan.celebration_slug
      ? `${env.appUrl()}/c/${plan.celebration_slug}`
      : `${env.appUrl()}/dashboard`;

    await sendEmail({
      to: plan.to,
      subject: `🕊️ ${firstName}'s year of blessings has begun`,
      html: creatorGiftStartedEmailHtml({
        recipientName: plan.recipient_name,
        senderName: plan.sender_name,
        weeksTotal: plan.weeks_total,
        pageUrl,
      }),
    });
  } catch {
    /* confirming to the gifter is best-effort — never fail the purchase */
  }
}
