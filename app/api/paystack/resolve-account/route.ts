import { NextResponse } from "next/server";
import { z } from "zod";
import { paystack, PaystackError } from "@/lib/paystack/client";

export const runtime = "nodejs";

const schema = z.object({
  account_number: z.string().regex(/^\d{10}$/),
  bank_code: z.string().min(2),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    const { data } = await paystack.resolveAccount(
      parsed.data.account_number,
      parsed.data.bank_code,
    );
    return NextResponse.json({ account_name: data.account_name });
  } catch (err) {
    const message = err instanceof PaystackError ? err.message : "Could not resolve account";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
