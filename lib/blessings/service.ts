import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { blessingEmailHtml, creatorClaimedEmailHtml } from "@/lib/email/blessing-template";
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

type PaidPlan = {
  id: string;
  celebration_id: string;
  recipient_name: string;
  sender_name: string | null;
  creator_id: string | null;
};

// Flip a paid plan pending_payment → awaiting_redemption and open the 72h
// redeem window. The status guard means only the first caller (webhook or the
// confirmation page) wins the transition; the loser updates 0 rows. On a real
// transition we drop the gift onto the celebration wall exactly once.
export async function activatePaidBlessing(
  match: { reference?: string; id?: string },
): Promise<void> {
  const admin = supabaseAdmin();
  const expires = new Date(Date.now() + 72 * 3600 * 1000).toISOString();

  let q = admin
    .from("blessing_plans")
    .update({ status: "awaiting_redemption", redeem_expires_at: expires })
    .eq("status", "pending_payment");
  q = match.reference ? q.eq("paystack_reference", match.reference) : q.eq("id", match.id!);

  const { data, error } = await q
    .select("id, celebration_id, recipient_name, sender_name, creator_id")
    .maybeSingle();

  // 23505 = the one-paid-per-celebration index rejected this; another plan is
  // already the page's keepsake. Nothing to activate.
  if (error) {
    if ((error as { code?: string }).code === "23505") return;
    throw error;
  }
  if (!data) return; // already transitioned, or no matching pending plan
  await postBlessingGiftCard(data as PaidPlan);
}

// Place the gift on the recipient's wall as a wrapped-gift card they can
// unwrap. On sealed pages it waits with everything else until the day.
async function postBlessingGiftCard(plan: PaidPlan): Promise<void> {
  const admin = supabaseAdmin();
  const { data: cel } = await admin
    .from("celebrations")
    .select("current_cycle")
    .eq("id", plan.celebration_id)
    .maybeSingle();

  const gifter =
    plan.sender_name?.trim() ||
    (plan.creator_id ? await getCreatorLabel(plan.creator_id) : null) ||
    "A loved one";
  const firstName = plan.recipient_name.split(" ")[0] || plan.recipient_name;

  await admin.from("messages").insert({
    celebration_id: plan.celebration_id,
    cycle: cel?.current_cycle ?? 1,
    contributor_name: gifter,
    is_anonymous: false,
    body: `52 Weeks of Blessings for ${firstName} — a short prayer or blessing in your inbox, every week for a year. 🕊️`,
    media_kind: "none",
    interactive_kind: "gift",
    interactive_payload: { source: "blessing", plan_id: plan.id },
  });
}

// Let the creator know their gift has landed — fired when the recipient claims
// it and the weekly sends begin. Best-effort: a delivery hiccup never blocks
// the claim itself.
export async function sendCreatorClaimedEmail(plan: {
  creator_id: string | null;
  recipient_name: string;
  sender_name: string | null;
  weeks_total: number;
  celebration_slug?: string | null;
}): Promise<void> {
  if (!plan.creator_id) return;
  try {
    const admin = supabaseAdmin();
    const { data: creator } = await admin
      .from("users")
      .select("email")
      .eq("id", plan.creator_id)
      .maybeSingle();
    if (!creator?.email) return;

    const firstName = plan.recipient_name.split(" ")[0] || plan.recipient_name;
    const pageUrl = plan.celebration_slug
      ? `${env.appUrl()}/c/${plan.celebration_slug}`
      : `${env.appUrl()}/dashboard`;

    await sendEmail({
      to: creator.email,
      subject: `🕊️ ${firstName} just opened your gift`,
      html: creatorClaimedEmailHtml({
        recipientName: plan.recipient_name,
        senderName: plan.sender_name,
        weeksTotal: plan.weeks_total,
        pageUrl,
      }),
    });
  } catch {
    /* notifying the creator is best-effort — never fail the redemption */
  }
}
