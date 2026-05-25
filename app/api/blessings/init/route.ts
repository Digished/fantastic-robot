import { NextResponse } from "next/server";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { paystack, PaystackError } from "@/lib/paystack/client";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BLESSINGS_FEE_KOBO } from "@/lib/fees";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const ref = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 18);
const token = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 24);

const schema = z
  .object({
    slug: z.string().min(6),
    tone: z.enum(["prayer", "affirmation", "scripture"]).default("prayer"),
    senderName: z.string().max(60).optional(),
    recipientEmail: z.string().email(),
    recipientEmailConfirm: z.string().email(),
  })
  .refine(
    (d) =>
      d.recipientEmail.trim().toLowerCase() === d.recipientEmailConfirm.trim().toLowerCase(),
    { message: "The two email addresses don't match.", path: ["recipientEmailConfirm"] },
  );

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const supa = await supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: cel } = await admin
    .from("celebrations")
    .select("id, slug, recipient_name, creator_id")
    .eq("slug", parsed.data.slug)
    .maybeSingle();
  if (!cel) return NextResponse.json({ error: "Page not found" }, { status: 404 });
  if (cel.creator_id !== user.id) {
    return NextResponse.json({ error: "Only the page creator can do this" }, { status: 403 });
  }

  // One paid gift per page — it's a keepsake, not a subscription. If it's
  // already been bought, don't let a second payment start.
  const { data: existingPaid } = await admin
    .from("blessing_plans")
    .select("id, status")
    .eq("celebration_id", cel.id)
    .in("status", ["awaiting_redemption", "active", "completed"])
    .maybeSingle();
  if (existingPaid) {
    return NextResponse.json(
      {
        error: "This page already has 52 Weeks of Blessings — it's been paid for and saved as a gift.",
        alreadyPaid: true,
      },
      { status: 409 },
    );
  }

  const reference = `SPB-BLESS-${ref()}`;
  const redeemToken = token();

  const { error: insertErr } = await admin.from("blessing_plans").insert({
    celebration_id: cel.id,
    creator_id: cel.creator_id,
    recipient_name: cel.recipient_name,
    sender_name: parsed.data.senderName || null,
    tone: parsed.data.tone,
    status: "pending_payment",
    amount_kobo: BLESSINGS_FEE_KOBO.toString(),
    paystack_reference: reference,
    // Recipient's address is captured here so the gift starts the moment payment
    // settles — no claim step. redeem_token now serves only as the unsubscribe key.
    recipient_email: parsed.data.recipientEmail.trim().toLowerCase(),
    opted_in: true,
    redeem_token: redeemToken,
  });
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  try {
    const { data } = await paystack.initTransaction({
      email: user.email,
      amount: Number(BLESSINGS_FEE_KOBO),
      reference,
      callback_url: `${env.appUrl()}/blessings/done?ref=${reference}`,
      metadata: { kind: "blessings", celebration_id: cel.id, slug: cel.slug },
    });
    return NextResponse.json({ authorization_url: data.authorization_url, reference });
  } catch (err) {
    await admin.from("blessing_plans").delete().eq("paystack_reference", reference);
    const message = err instanceof PaystackError ? err.message : "Could not start payment";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
