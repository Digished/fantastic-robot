import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendBlessing, type PlanForSend } from "@/lib/blessings/service";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

// Daily dispatcher: send every weekly blessing that's due. Triggered by a
// scheduled request (Vercel Cron) carrying `Authorization: Bearer CRON_SECRET`.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.cronSecret()}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const admin = supabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);

  // Due, still-scheduled weeks with their plan. We over-fetch and filter the
  // plan state in JS (one query, no inner-join gymnastics).
  const { data: due } = await admin
    .from("blessing_messages")
    .select(
      "id, week_no, title, body, plan:blessing_plans(id, recipient_name, recipient_email, sender_name, redeem_token, weeks_total, status, opted_in)",
    )
    .eq("status", "scheduled")
    .lte("scheduled_for", today)
    .order("scheduled_for", { ascending: true })
    .limit(300);

  let sent = 0;
  let failed = 0;
  for (const row of due ?? []) {
    const plan = row.plan as unknown as (PlanForSend & { status: string; opted_in: boolean }) | null;
    if (!plan || plan.status !== "active" || !plan.opted_in || !plan.recipient_email) continue;
    const ok = await sendBlessing(plan, {
      id: row.id,
      week_no: row.week_no,
      title: row.title,
      body: row.body,
    });
    if (ok) sent += 1;
    else failed += 1;
  }

  return NextResponse.json({ ok: true, sent, failed });
}
