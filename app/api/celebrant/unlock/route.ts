import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { answerMatches } from "@/lib/security";
import { setCelebrantUnlocked } from "@/lib/celebrant-unlock";

export const runtime = "nodejs";

const schema = z.object({
  slug: z.string().min(6).max(20),
  answer: z.string().min(1).max(140),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: page } = await admin
    .from("celebrations")
    .select("id, security_answer_hash")
    .eq("slug", parsed.data.slug)
    .maybeSingle();

  if (!page) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!page.security_answer_hash) {
    // No question set — allow through.
    await setCelebrantUnlocked(parsed.data.slug);
    return NextResponse.json({ ok: true });
  }
  if (!answerMatches(parsed.data.answer, page.security_answer_hash)) {
    return NextResponse.json({ error: "That's not quite right." }, { status: 401 });
  }
  await setCelebrantUnlocked(parsed.data.slug);
  return NextResponse.json({ ok: true });
}
