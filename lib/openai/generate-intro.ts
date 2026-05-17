import { openaiClient } from "./client";

export type IntroContent = {
  welcome: {
    subtext: string;
    emoji: string;
  };
  occasion: {
    title: string;
    subtext: string;
    emoji: string;
  };
  together: {
    headline: string;
    subtext: string;
  };
  about?: {
    headline: string;
    lines: string[];
  };
  ready: {
    headline: string;
    subtext: string;
  };
};

const SYSTEM_PROMPT = `You write short, warm, personalised copy for a digital celebration surprise page.
These are intro slides the recipient reads as a personal welcome experience.
The tone is joyful, sincere, and a little poetic — never corporate or generic.

Output ONLY valid JSON with this exact structure:
{
  "welcome": {
    "subtext": "string (≤90 chars) — a warm opening line about them or this moment",
    "emoji": "string — one fitting emoji (not ❤️ or 🎉 — pick something fresh and specific)"
  },
  "occasion": {
    "title": "string (≤70 chars) — a creative name for this occasion, not just the event type",
    "subtext": "string (≤90 chars) — something meaningful about this milestone or moment",
    "emoji": "string — one fitting emoji (be creative, avoid generic party emoji)"
  },
  "together": {
    "headline": "string (≤60 chars) — a poetic, warm phrase about this moment or milestone in their life",
    "subtext": "string (≤90 chars) — something meaningful about what this day represents for them personally"
  },
  "about": {
    "headline": "string (≤60 chars) — a poetic, specific description of who they are",
    "lines": ["string (≤70 chars)", "string (≤70 chars)", "string (≤70 chars)"]
  },
  "ready": {
    "headline": "string (≤55 chars) — the anticipation before they dive in",
    "subtext": "string (≤80 chars) — a warm, personal send-off"
  }
}

Rules:
- The "about" field MUST be included only if a description is provided. Omit it entirely if no description.
- "about.lines" should have 2–3 items drawn from the description — specific details, not generic praise.
- Never use the words: wonderful, amazing, truly, really, special, tapestry, symphony, mosaic, kaleidoscope, journey, testament, chapter, narrative (find fresher, more specific words).
- Never reference other people sending messages or friends gathering — keep it between this page and the recipient.
- Avoid heart emojis (❤️, 💕, 💖) and generic party emojis. Choose emojis that feel specific to this person.
- Do not repeat the recipient's name more than once across all fields.
- Use complete sentences with proper grammar and capitalisation.
- Be specific and creative — avoid clichés. Draw from the description to say something only this person would recognise.
- Keep everything tight — every word earns its place.`;

function buildUserMessage(params: {
  firstName: string;
  recipientName: string;
  eventType: string;
  celebrationDate: string;
  celebrationTitle: string;
  celebrantDescription: string | null;
}): string {
  const lines = [
    `Recipient first name: ${params.firstName}`,
    `Full name: ${params.recipientName}`,
    `Event type: ${params.eventType.replace(/_/g, " ")}`,
    `Celebration date: ${new Date(params.celebrationDate).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}`,
    `Celebration title: "${params.celebrationTitle}"`,
  ];
  if (params.celebrantDescription) {
    lines.push(`\nDescription of the celebrant (written by someone who knows them):\n"${params.celebrantDescription}"`);
  }
  return lines.join("\n");
}

export async function generateIntroContent(params: {
  firstName: string;
  recipientName: string;
  eventType: string;
  celebrationDate: string;
  celebrationTitle: string;
  celebrantDescription: string | null;
}): Promise<IntroContent | null> {
  const client = openaiClient();
  if (!client) return null;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.85,
      max_tokens: 600,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage(params) },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw) as IntroContent;

    if (!parsed.welcome?.subtext || !parsed.occasion?.title || !parsed.ready?.headline) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
