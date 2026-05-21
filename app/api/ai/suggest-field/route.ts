import { NextResponse } from "next/server";
import { z } from "zod";
import { openaiClient } from "@/lib/openai/client";

export const runtime = "nodejs";

const schema = z.object({
  field: z.enum(["title", "tagline", "message"]),
  recipientName: z.string().min(1).max(60),
  eventType: z.string().max(60).optional(),
  celebrantDescription: z.string().max(1500).optional(),
  current: z.string().max(400).optional(),
});

const FIELD_BRIEF: Record<z.infer<typeof schema>["field"], string> = {
  title:
    "the page TITLE — a short, evocative headline for the celebration page (2–6 words). Title-case-ish, no quotes, no ending punctuation.",
  tagline:
    "the TAGLINE — a single punchy line shown under the title (max ~10 words). Warm, can use one emoji.",
  message:
    "the NOTE FROM THE ORGANISER — a heartfelt 1–2 sentence message from the person who made the page (under 220 characters).",
};

const SYSTEM = `You write copy for group celebration pages (birthdays, weddings, farewells, etc).
Given who the page is for and what part of the page is being written, return 3 distinct options.
Output ONLY valid JSON: { "suggestions": ["...", "...", "..."] }
Make each option specific to the person, varied in tone, and free of the words "amazing", "special", or "wonderful".`;

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

  const { field, recipientName, eventType, celebrantDescription, current } = parsed.data;
  const firstName = recipientName.split(" ")[0];

  const context = [
    `For: ${firstName} (${recipientName})`,
    eventType ? `Occasion: ${eventType.replace(/_/g, " ")}` : null,
    celebrantDescription ? `About them: "${celebrantDescription}"` : null,
    current ? `Their current draft (improve on it): "${current}"` : null,
    `Write ${FIELD_BRIEF[field]}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.9,
      max_tokens: 320,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: context },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return NextResponse.json({ suggestions: [] });

    const result = JSON.parse(raw) as { suggestions?: string[] };
    const suggestions = Array.isArray(result.suggestions)
      ? result.suggestions.map((s) => String(s).trim()).filter(Boolean).slice(0, 3)
      : [];
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}
