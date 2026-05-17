import { NextResponse } from "next/server";
import { z } from "zod";
import { openaiClient } from "@/lib/openai/client";

export const runtime = "nodejs";

const schema = z.object({
  draft: z.string().min(2).max(500),
  recipientName: z.string().min(1).max(60).optional(),
});

const SYSTEM = `You help people write heartfelt celebration messages.
Take the draft and make it warmer, more vivid, and personal — keep their voice.
Return ONLY the improved message. No explanation, no quotes around it. Max 3 sentences, under 300 characters.`;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const client = openaiClient();
  if (!client) {
    return NextResponse.json({ error: "Not available" }, { status: 503 });
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.85,
      max_tokens: 160,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: parsed.data.recipientName
            ? `For ${parsed.data.recipientName.split(" ")[0]}: ${parsed.data.draft}`
            : parsed.data.draft,
        },
      ],
    });

    const expanded = response.choices[0]?.message?.content?.trim();
    if (!expanded) return NextResponse.json({ error: "Failed" }, { status: 500 });
    return NextResponse.json({ expanded });
  } catch {
    return NextResponse.json({ error: "Failed to expand" }, { status: 500 });
  }
}
