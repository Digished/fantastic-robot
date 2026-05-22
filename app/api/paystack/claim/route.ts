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
      "id, slug, creator_id, is_self, current_cycle, recipient_bank_code, recipient_account_number, recipient_account_name, paystack_recipient_code, total_raised_kobo, title",
    )
    .maybeSingle();
  if (claimErr) return NextResponse.json({ error: claimErr.message }, { status: 500 });
  if (!page) return NextResponse.json({ error: "Already claimed or not yet available" }, { status: 409 });

  const rollback = () =>
    admin
      .from("celebrations")
      .update({ payout_status: "pending", payout_claimed_at: null })
      .eq("id", page.id);

  // Resolve the destination account + cached transfer recipient. Self-pages
  // pay to the owner's profile bank; everyone else uses the page's locked bank.
  let recipientCode: string | null = null;
  let bankCode: string | null = null;
  let accountNumber: string | null = null;
  let accountName: string | null = null;

  if (page.is_self) {
    const { data: owner } = await admin
      .from("users")
      .select("bank_code, account_number, account_name, paystack_recipient_code")
      .eq("id", page.creator_id)
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
    recipientCode = page.paystack_recipient_code;
    bankCode = page.recipient_bank_code;
    accountNumber = page.recipient_account_number;
    accountName = page.recipient_account_name;
  }

  try {
    if (!recipientCode) {
      const { data } = await paystack.createTransferRecipient({
        name: accountName!,
        account_number: accountNumber!,
        bank_code: bankCode!,
      });
      recipientCode = data.recipient_code;
      // Cache on the profile for self-pages (reused every year), else the page.
      if (page.is_self) {
        await admin.from("users").update({ paystack_recipient_code: recipientCode }).eq("id", page.creator_id);
      } else {
        await admin.from("celebrations").update({ paystack_recipient_code: recipientCode }).eq("id", page.id);
      }
    }

    const reference = `SPB-PAYOUT-${ref()}`;
    const { data: transfer } = await paystack.initiateTransfer({
      amount: Number(page.total_raised_kobo),
      recipient: recipientCode,
      reference,
      reason: `Spendbox gift — ${page.title}`,
      // Distinct per year so a renewed page can pay out again.
      idempotencyKey: `${page.id}:${page.current_cycle}`,
    });

    await admin.from("payouts").insert({
      celebration_id: page.id,
      cycle: page.current_cycle,
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
    await rollback();
    const message = err instanceof PaystackError ? err.message : "Transfer failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
