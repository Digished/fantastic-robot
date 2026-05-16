import { NextResponse } from "next/server";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { paystack, PaystackError } from "@/lib/paystack/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { computeCharge, MIN_CONTRIBUTION_KOBO } from "@/lib/fees";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const ref = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 18);

const schema = z.object({
  slug: z.string().min(6),
  amountKobo: z.string().regex(/^\d+$/),
  contributorName: z.string().min(1).max(60),
  contributorEmail: z.string().email(),
  contributorPhone: z.string().max(24).optional(),
  isAnonymous: z.boolean().default(false),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const amountKobo = BigInt(parsed.data.amountKobo);
  if (amountKobo < MIN_CONTRIBUTION_KOBO) {
    return NextResponse.json({ error: "₦500 minimum" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: page } = await admin
    .from("celebrations")
    .select("id, slug, status, deadline_at, title")
    .eq("slug", parsed.data.slug)
    .maybeSingle();
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
  if (page.status !== "active" || new Date(page.deadline_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Contributions are closed" }, { status: 409 });
  }

  const { platformFee, grossCharge, netToPool } = computeCharge(amountKobo);
  const reference = `SPB-${ref()}`;
  const idempotencyKey = reference;

  const { error: insertErr } = await admin.from("contributions").insert({
    celebration_id: page.id,
    contributor_name: parsed.data.contributorName,
    contributor_email: parsed.data.contributorEmail,
    contributor_phone: parsed.data.contributorPhone ?? null,
    is_anonymous: parsed.data.isAnonymous,
    amount_gross_kobo: grossCharge.toString(),
    platform_fee_kobo: platformFee.toString(),
    amount_net_kobo: netToPool.toString(),
    paystack_reference: reference,
    idempotency_key: idempotencyKey,
    status: "pending",
  });
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  try {
    const { data } = await paystack.initTransaction({
      email: parsed.data.contributorEmail,
      amount: Number(grossCharge),
      reference,
      callback_url: `${env.appUrl()}/c/${page.slug}?paid=1`,
      metadata: {
        celebration_id: page.id,
        slug: page.slug,
        contributor_name: parsed.data.contributorName,
        is_anonymous: parsed.data.isAnonymous,
      },
    });
    return NextResponse.json({ authorization_url: data.authorization_url, reference });
  } catch (err) {
    // Mark this attempt as failed so the row doesn't dangle in pending forever.
    await admin
      .from("contributions")
      .update({ status: "failed" })
      .eq("paystack_reference", reference);
    const message = err instanceof PaystackError ? err.message : "Could not start payment";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
