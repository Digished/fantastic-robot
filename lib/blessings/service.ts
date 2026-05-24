import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { blessingEmailHtml } from "@/lib/email/blessing-template";
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
