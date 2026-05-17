import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Paystack signs webhooks with HMAC-SHA512 using your SECRET KEY (not a
// separate webhook secret). https://paystack.com/docs/payments/webhooks/
function verify(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha512", env.paystackSecret())
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-paystack-signature");
  if (!verify(raw, sig)) return new NextResponse("invalid signature", { status: 401 });

  const event = JSON.parse(raw) as {
    event: string;
    data: { id?: number; reference?: string; status?: string; amount?: number; transfer_code?: string };
  };

  // Paystack doesn't issue a stable "event id" — synthesise one for dedupe.
  const eventId = `${event.event}:${event.data?.reference ?? event.data?.transfer_code ?? event.data?.id ?? ""}`;
  const admin = supabaseAdmin();

  const { error: dedupeErr } = await admin
    .from("webhook_events")
    .insert({ paystack_event_id: eventId, event_type: event.event, payload: event });
  if (dedupeErr) {
    // Unique violation = replay. Acknowledge so Paystack stops retrying.
    return new NextResponse("ok", { status: 200 });
  }

  try {
    if (event.event === "charge.success") {
      await handleChargeSuccess(event.data);
    } else if (event.event === "transfer.success") {
      await handleTransfer(event.data, "paid");
    } else if (event.event === "transfer.failed" || event.event === "transfer.reversed") {
      await handleTransfer(event.data, "failed");
    }
    await admin.from("webhook_events").update({ processed: true }).eq("paystack_event_id", eventId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    await admin.from("webhook_events").update({ error: msg }).eq("paystack_event_id", eventId);
    return new NextResponse("error", { status: 500 });
  }

  return new NextResponse("ok", { status: 200 });
}

async function handleChargeSuccess(data: {
  id?: number; reference?: string; status?: string; amount?: number;
}) {
  if (data.status !== "success" || !data.reference) return;
  const admin = supabaseAdmin();

  // Page-creation charge — reference is prefixed SPBC-. Activate the page.
  if (data.reference.startsWith("SPBC-")) {
    const { error } = await admin
      .from("celebrations")
      .update({ is_paid_for_creation: true })
      .eq("creation_payment_reference", data.reference)
      .eq("is_paid_for_creation", false);
    if (error) throw error;
    return;
  }

  // Flip pending → paid only if still pending. Trigger bumps totals.
  const { data: updated, error } = await admin
    .from("contributions")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      paystack_transaction_id: data.id ?? null,
    })
    .eq("paystack_reference", data.reference)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) throw error;
  // Row may already be paid (duplicate webhook for the same charge) — that's fine.
  void updated;
}

async function handleTransfer(
  data: { reference?: string; transfer_code?: string; status?: string },
  finalStatus: "paid" | "failed",
) {
  if (!data.reference) return;
  const admin = supabaseAdmin();
  const { data: payout } = await admin
    .from("payouts")
    .update({
      status: finalStatus === "paid" ? "success" : (data.status ?? "failed"),
      completed_at: new Date().toISOString(),
      raw_response: data,
    })
    .eq("paystack_reference", data.reference)
    .select("celebration_id")
    .maybeSingle();

  if (!payout) return;

  await admin
    .from("celebrations")
    .update({
      payout_status: finalStatus,
      payout_completed_at: new Date().toISOString(),
    })
    .eq("id", payout.celebration_id);
}
