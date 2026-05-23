import { NextResponse } from "next/server";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { paystack, PaystackError } from "@/lib/paystack/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const ref = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 18);

const schema = z.object({
  slug: z.string().min(6),
  // Claim a past year's gift from a renewed recurring page. Omit for the
  // current/live cycle.
  cycle: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const admin = supabaseAdmin();

  // Resolve the page first — it's the source of identity + (non-self) bank.
  const { data: cel } = await admin
    .from("celebrations")
    .select(
      "id, slug, creator_id, is_self, current_cycle, recipient_bank_code, recipient_account_number, recipient_account_name, paystack_recipient_code, title",
    )
    .eq("slug", parsed.data.slug)
    .maybeSingle();
  if (!cel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isPast = typeof parsed.data.cycle === "number" && parsed.data.cycle < cel.current_cycle;
  const nowIso = new Date().toISOString();

  // Atomically move the target (live row or archived cycle) pending → processing.
  let amountKobo: number;
  let claimCycle: number;
  if (isPast) {
    const { data: snap } = await admin
      .from("celebration_cycles")
      .update({ payout_status: "processing" })
      .eq("celebration_id", cel.id)
      .eq("cycle", parsed.data.cycle!)
      .eq("payout_status", "pending")
      .gt("total_raised_kobo", 0)
      .select("total_raised_kobo, cycle")
      .maybeSingle();
    if (!snap) return NextResponse.json({ error: "Already claimed or not available" }, { status: 409 });
    amountKobo = Number(snap.total_raised_kobo);
    claimCycle = snap.cycle;
  } else {
    const { data: live } = await admin
      .from("celebrations")
      .update({ payout_status: "processing", payout_claimed_at: nowIso })
      .eq("id", cel.id)
      .eq("payout_status", "pending")
      .lte("claimable_at", nowIso)
      .gt("total_raised_kobo", 0)
      .select("total_raised_kobo, current_cycle")
      .maybeSingle();
    if (!live) return NextResponse.json({ error: "Already claimed or not yet available" }, { status: 409 });
    amountKobo = Number(live.total_raised_kobo);
    claimCycle = live.current_cycle;
  }

  const rollback = () =>
    isPast
      ? admin
          .from("celebration_cycles")
          .update({ payout_status: "pending" })
          .eq("celebration_id", cel.id)
          .eq("cycle", claimCycle)
      : admin
          .from("celebrations")
          .update({ payout_status: "pending", payout_claimed_at: null })
          .eq("id", cel.id);

  // Resolve destination bank + cached transfer recipient. Self-pages pay to the
  // owner's profile bank; everyone else uses the page's locked bank.
  let recipientCode: string | null = null;
  let bankCode: string | null = null;
  let accountNumber: string | null = null;
  let accountName: string | null = null;

  if (cel.is_self) {
    const { data: owner } = await admin
      .from("users")
      .select("bank_code, account_number, account_name, paystack_recipient_code")
      .eq("id", cel.creator_id)
      .maybeSingle();
    if (!owner?.bank_code || !owner.account_number || !owner.account_name) {
      await rollback();
      return NextResponse.json(
        { error: "Add your payout bank account in settings first." },
        { status: 409 },
      );
    }
    recipientCode = owner.paystack_recipient_code;
    bankCode = owner.bank_code;
    accountNumber = owner.account_number;
    accountName = owner.account_name;
  } else {
    recipientCode = cel.paystack_recipient_code;
    bankCode = cel.recipient_bank_code;
    accountNumber = cel.recipient_account_number;
    accountName = cel.recipient_account_name;
  }

  try {
    if (!recipientCode) {
      const { data } = await paystack.createTransferRecipient({
        name: accountName!,
        account_number: accountNumber!,
        bank_code: bankCode!,
      });
      recipientCode = data.recipient_code;
      if (cel.is_self) {
        await admin.from("users").update({ paystack_recipient_code: recipientCode }).eq("id", cel.creator_id);
      } else {
        await admin.from("celebrations").update({ paystack_recipient_code: recipientCode }).eq("id", cel.id);
      }
    }

    const reference = `SPB-PAYOUT-${ref()}`;
    const { data: transfer } = await paystack.initiateTransfer({
      amount: amountKobo,
      recipient: recipientCode,
      reference,
      reason: `Spendbox gift — ${cel.title}`,
      // Distinct per year so a renewed page can pay out each cycle once.
      idempotencyKey: `${cel.id}:${claimCycle}`,
    });

    await admin.from("payouts").insert({
      celebration_id: cel.id,
      cycle: claimCycle,
      amount_kobo: amountKobo,
      paystack_transfer_code: transfer.transfer_code,
      paystack_reference: reference,
      status: transfer.status,
    });

    // Only the live row tracks the in-flight transfer code.
    if (!isPast) {
      await admin
        .from("celebrations")
        .update({ paystack_transfer_code: transfer.transfer_code })
        .eq("id", cel.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    await rollback();
    const message = err instanceof PaystackError ? err.message : "Transfer failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
