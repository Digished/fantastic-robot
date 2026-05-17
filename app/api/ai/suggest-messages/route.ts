import { NextResponse } from "next/server";
import { z } from "zod";
import { openaiClient } from "@/lib/openai/client";

export const runtime = "nodejs";

const schema = z.object({
  description: z.string().min(10).max(1500),
  recipientName: z.string().min(1).max(60),
  eventType: z.string(),
});

const SYSTEM = `Write 4 short, warm, personal messages that someone close to this person might write to celebrate them.
Output ONLY valid JSON: { "messages": ["...", "...", "...", "..."] }
Each message is 1–3 sentences. Make them specific to the person described.
Cover different tones: sincere, playful, brief and punchy, poetic.
Do not use the words "amazing", "special", or "wonderful".`;

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

  const { description, recipientName, eventType } = parsed.data;
  const firstName = recipientName.split(" ")[0];

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.9,
      max_tokens: 400,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `For: ${firstName} (${recipientName})\nEvent: ${eventType.replace(/_/g, " ")}\nAbout them: "${description}"`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return NextResponse.json({ messages: [] });

    const result = JSON.parse(raw) as { messages?: string[] };
    return NextResponse.json({ messages: Array.isArray(result.messages) ? result.messages.slice(0, 5) : [] });
  } catch {
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}
