import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildBlessingSchedule, type Tone, type WallMessage } from "@/lib/blessings/generate";
import { sendBlessing, sendCreatorClaimedEmail } from "@/lib/blessings/service";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(10),
  email: z.string().email(),
  consent: z.literal(true),
});

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your email and tick the box to continue." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: plan } = await admin
    .from("blessing_plans")
    .select("id, celebration_id, creator_id, recipient_name, sender_name, tone, weeks_total, status, redeem_expires_at, redeem_token")
    .eq("redeem_token", parsed.data.token)
    .maybeSingle();

  if (!plan) return NextResponse.json({ error: "This link is not valid." }, { status: 404 });
  if (plan.status === "active" || plan.status === "completed") {
    return NextResponse.json({ error: "This gift has already been claimed." }, { status: 409 });
  }
  if (plan.status !== "awaiting_redemption") {
    return NextResponse.json({ error: "This gift is not ready to claim." }, { status: 409 });
  }
  if (plan.redeem_expires_at && new Date(plan.redeem_expires_at).getTime() < Date.now()) {
    await admin.from("blessing_plans").update({ status: "expired" }).eq("id", plan.id);
    return NextResponse.json({ error: "This link has expired." }, { status: 410 });
  }

  // Pull recent wall notes to weave through the year (skip anonymous/empty).
  const { data: rows } = await admin
    .from("messages")
    .select("contributor_name, body, is_anonymous")
    .eq("celebration_id", plan.celebration_id)
    .is("deleted_at", null)
    .not("body", "is", null)
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: cel } = await admin
    .from("celebrations")
    .select("event_type, slug")
    .eq("id", plan.celebration_id)
    .maybeSingle();

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

  const now = new Date();
  const messageRows = schedule.map((w) => ({
    plan_id: plan.id,
    week_no: w.weekNo,
    source: w.source,
    title: w.title,
    body: w.body,
    scheduled_for: addDays(now, (w.weekNo - 1) * 7),
    status: "scheduled" as const,
  }));

  const { error: insertErr } = await admin.from("blessing_messages").insert(messageRows);
  if (insertErr) return NextResponse.json({ error: "Could not set up your blessings." }, { status: 500 });

  await admin
    .from("blessing_plans")
    .update({
      status: "active",
      recipient_email: parsed.data.email,
      opted_in: true,
      started_at: now.toISOString(),
    })
    .eq("id", plan.id);

  // Send week 1 right away so the gift lands the moment it's claimed.
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
        recipient_email: parsed.data.email,
        sender_name: plan.sender_name,
        redeem_token: plan.redeem_token,
        weeks_total: plan.weeks_total,
      },
      first,
    );
  }

  // Tell the creator their gift just landed and the year has begun.
  await sendCreatorClaimedEmail({
    creator_id: plan.creator_id,
    recipient_name: plan.recipient_name,
    sender_name: plan.sender_name,
    weeks_total: plan.weeks_total,
    celebration_slug: cel?.slug ?? null,
  });

  return NextResponse.json({ ok: true });
}
