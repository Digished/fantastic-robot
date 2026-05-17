import { NextResponse } from "next/server";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { paystack, PaystackError } from "@/lib/paystack/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const ref = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 18);

const schema = z.object({ slug: z.string().min(6) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const admin = supabaseAdmin();

  // Atomically claim the payout: only move pending → processing.
  const { data: page, error: claimErr } = await admin
    .from("celebrations")
    .update({ payout_status: "processing", payout_claimed_at: new Date().toISOString() })
    .eq("slug", parsed.data.slug)
    .eq("payout_status", "pending")
    .lte("claimable_at", new Date().toISOString())
    .gt("total_raised_kobo", 0)
    .select(
      "id, slug, recipient_name, recipient_bank_code, recipient_account_number, recipient_account_name, paystack_recipient_code, total_raised_kobo, title",
    )
    .maybeSingle();
  if (claimErr) return NextResponse.json({ error: claimErr.message }, { status: 500 });
  if (!page) return NextResponse.json({ error: "Already claimed or not yet available" }, { status: 409 });

  try {
    // Lazily create the Paystack transfer recipient.
    let recipientCode = page.paystack_recipient_code;
    if (!recipientCode) {
      const { data } = await paystack.createTransferRecipient({
        name: page.recipient_account_name,
        account_number: page.recipient_account_number,
        bank_code: page.recipient_bank_code,
      });
      recipientCode = data.recipient_code;
      await admin
        .from("celebrations")
        .update({ paystack_recipient_code: recipientCode })
        .eq("id", page.id);
    }

    const reference = `SPB-PAYOUT-${ref()}`;
    const { data: transfer } = await paystack.initiateTransfer({
      amount: Number(page.total_raised_kobo),
      recipient: recipientCode,
      reference,
      reason: `Spendbox gift — ${page.title}`,
      idempotencyKey: page.id,
    });

    await admin.from("payouts").insert({
      celebration_id: page.id,
      amount_kobo: page.total_raised_kobo,
      paystack_transfer_code: transfer.transfer_code,
      paystack_reference: reference,
      status: transfer.status,
    });

    await admin
      .from("celebrations")
      .update({ paystack_transfer_code: transfer.transfer_code })
      .eq("id", page.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Roll the page back so the recipient can try again.
    await admin
      .from("celebrations")
      .update({ payout_status: "pending", payout_claimed_at: null })
      .eq("id", page.id);
    const message = err instanceof PaystackError ? err.message : "Transfer failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
