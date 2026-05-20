import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { generateIntroContent } from "@/lib/openai/generate-intro";

export const runtime = "nodejs";

const schema = z.object({
  recipientName: z.string().min(1).max(60),
  eventType: z.string().min(1).max(40),
  celebrationDate: z.string().min(1),
  celebrationTitle: z.string().min(1).max(120),
  celebrantDescription: z.string().min(20).max(1500),
});

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const firstName = parsed.data.recipientName.split(" ")[0];
  const introContent = await generateIntroContent({
    firstName,
    recipientName: parsed.data.recipientName,
    eventType: parsed.data.eventType,
    celebrationDate: parsed.data.celebrationDate,
    celebrationTitle: parsed.data.celebrationTitle,
    celebrantDescription: parsed.data.celebrantDescription,
  });

  if (!introContent) {
    return NextResponse.json(
      { error: "Could not generate slides right now. Try again in a moment." },
      { status: 502 },
    );
  }

  return NextResponse.json({ introContent });
}
