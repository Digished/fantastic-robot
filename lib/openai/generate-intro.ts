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
These are intro slides the recipient reads before seeing messages from their friends.
The tone is joyful, sincere, and a little poetic — never corporate or generic.

Output ONLY valid JSON with this exact structure:
{
  "welcome": {
    "subtext": "string (≤90 chars) — a warm opening line about them or this moment",
    "emoji": "string — one fitting emoji"
  },
  "occasion": {
    "title": "string (≤70 chars) — a creative name for this occasion, not just the event type",
    "subtext": "string (≤90 chars) — something meaningful about this milestone or moment",
    "emoji": "string — one fitting emoji for the event type"
  },
  "together": {
    "headline": "string (≤60 chars) — about the people who showed up for them",
    "subtext": "string (≤90 chars) — why that matters"
  },
  "about": {
    "headline": "string (≤60 chars) — a poetic description of who they are",
    "lines": ["string (≤70 chars)", "string (≤70 chars)", "string (≤70 chars)"]
  },
  "ready": {
    "headline": "string (≤55 chars) — the moment before they see the messages",
    "subtext": "string (≤80 chars) — warm send-off into the messages"
  }
}

Rules:
- The "about" field MUST be included only if a description is provided. Omit it entirely if no description.
- "about.lines" should have 2–3 items drawn from the description — specific details, not generic praise.
- Never use the words: wonderful, amazing, truly, really, special (find fresher alternatives).
- Do not repeat the recipient's name more than once across all fields.
- Keep everything tight — every word earns its place.`;

function buildUserMessage(params: {
  firstName: string;
  recipientName: string;
  eventType: string;
  celebrationDate: string;
  celebrationTitle: string;
  celebrantDescription: string | null;
  messageCount: number;
}): string {
  const lines = [
    `Recipient first name: ${params.firstName}`,
    `Full name: ${params.recipientName}`,
    `Event type: ${params.eventType.replace(/_/g, " ")}`,
    `Celebration date: ${new Date(params.celebrationDate).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}`,
    `Celebration title: "${params.celebrationTitle}"`,
    `Number of messages from friends: ${params.messageCount}`,
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
  messageCount: number;
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

    // Basic validation — ensure required fields are present
    if (!parsed.welcome?.subtext || !parsed.occasion?.title || !parsed.ready?.headline) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
