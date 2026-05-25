import { openaiClient } from "@/lib/openai/client";

export type Tone = "prayer" | "affirmation" | "scripture";

export type WallMessage = { name: string; body: string };

export type WeekItem = {
  weekNo: number;
  source: "ai" | "wall";
  title: string;
  body: string;
};

const TONE_BRIEF: Record<Tone, string> = {
  prayer: "short, sincere prayers and blessings — gentle, hopeful, faith-warm without naming a specific denomination",
  affirmation: "warm affirmations and encouragements — grounding, kind, present-tense 'you are' statements",
  scripture: "blessings in the cadence of scripture and proverb — timeless, poetic, reverent",
};

const SYSTEM_PROMPT = `You write a year of weekly blessings for someone being celebrated. Each week the recipient opens a short, uplifting note by email.
Output ONLY valid JSON: { "weeks": [ { "title": string, "body": string }, ... ] }.
Rules:
- Produce exactly the number of weeks requested, in order.
- "title" ≤ 48 chars — a small, fresh heading (not "Week 12", not the recipient's name).
- "body" 220–360 chars — one warm paragraph the reader feels was written for them.
- Vary the angle every week: peace, courage, gratitude, rest, provision, relationships, growth, joy, resilience. Never repeat a week.
- Address the reader as "you". Do NOT use the recipient's name in the body.
- No clichés (journey, blessed beyond measure, tapestry), no emojis, no hashtags, complete sentences.`;

function fallbackWeeks(count: number, tone: Tone): { title: string; body: string }[] {
  const lines = [
    "May this week meet you with quiet strength and a calm, steady heart.",
    "You are carried, even on the days that ask the most of you. Rest is allowed.",
    "Let courage rise in you gently this week, one small brave step at a time.",
    "May good things find their way to you, and may you have open hands to receive them.",
    "You are loved more than you know, and that love is not going anywhere.",
    "Let peace settle over your home and your mind like light through a window.",
    "May your work bear fruit, and may you notice the small wins along the way.",
    "You have come further than you give yourself credit for. Be kind to yourself.",
  ];
  void tone;
  return Array.from({ length: count }, (_, i) => ({
    title: "A blessing for your week",
    body: lines[i % lines.length],
  }));
}

async function generateAiWeeks(params: {
  recipientName: string;
  eventType: string;
  tone: Tone;
  count: number;
}): Promise<{ title: string; body: string }[]> {
  const client = openaiClient();
  if (!client || params.count <= 0) {
    return fallbackWeeks(Math.max(0, params.count), params.tone);
  }
  try {
    const user = [
      `Recipient first name: ${params.recipientName.split(" ")[0]}`,
      `They are being celebrated for: ${params.eventType.replace(/_/g, " ")}`,
      `Style: ${TONE_BRIEF[params.tone]}`,
      `Write exactly ${params.count} distinct weekly blessings.`,
    ].join("\n");
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.9,
      max_tokens: 4000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: user },
      ],
    });
    const raw = res.choices[0]?.message?.content;
    if (!raw) return fallbackWeeks(params.count, params.tone);
    const parsed = JSON.parse(raw) as { weeks?: { title?: string; body?: string }[] };
    const weeks = (parsed.weeks ?? [])
      .filter((w) => w?.title && w?.body)
      .map((w) => ({ title: w.title!.slice(0, 80), body: w.body!.slice(0, 600) }));
    if (weeks.length >= params.count) return weeks.slice(0, params.count);
    // Short response — pad to the full count so the schedule is never thin.
    return [...weeks, ...fallbackWeeks(params.count - weeks.length, params.tone)];
  } catch {
    return fallbackWeeks(params.count, params.tone);
  }
}

// Build the full 52-week schedule, weaving real wall messages across the year
// and filling the remaining weeks with AI-written blessings.
export async function buildBlessingSchedule(params: {
  recipientName: string;
  eventType: string;
  tone: Tone;
  weeksTotal: number;
  wallMessages: WallMessage[];
}): Promise<WeekItem[]> {
  const { weeksTotal } = params;
  // Use at most ~40% of weeks for real notes so blessings still anchor the year.
  const wall = params.wallMessages.slice(0, Math.floor(weeksTotal * 0.4));
  const aiWeeks = await generateAiWeeks({
    recipientName: params.recipientName,
    eventType: params.eventType,
    tone: params.tone,
    count: weeksTotal,
  });

  const items: WeekItem[] = aiWeeks.map((w, idx) => ({
    weekNo: idx + 1,
    source: "ai",
    title: w.title,
    body: w.body,
  }));

  // Spread the wall notes evenly through the year (never week 1 — that opener
  // is always a blessing so the first email reads as a gift, not a forward).
  if (wall.length > 0) {
    const step = Math.max(2, Math.floor(weeksTotal / (wall.length + 1)));
    wall.forEach((m, i) => {
      const weekNo = Math.min(weeksTotal, (i + 1) * step + 1);
      const item = items[weekNo - 1];
      if (item) {
        item.source = "wall";
        item.title = `A note from ${m.name}`;
        item.body = m.body;
      }
    });
  }

  return items;
}
