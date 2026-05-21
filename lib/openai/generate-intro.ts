import { openaiClient } from "./client";

export type IntroChapter = {
  headline: string;
  body: string;
  emoji?: string;
};

// Optional creator-set styling, layered on top of the AI copy. These are not
// produced by the model — they're set in the WYSIWYG editor and stored in the
// same intro_content JSONB.
export type SlideStyleMap = Record<string, { accent?: string }>;

export type IntroContent = {
  welcome: {
    subtext: string;
    emoji: string;
    title?: string; // creator override for the cover headline (defaults to name)
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
  chapters?: IntroChapter[];
  ready: {
    headline: string;
    subtext: string;
  };
  final: {
    headline: string;
    subtext: string;
    emoji?: string;
  };
  slideStyles?: SlideStyleMap;
};

const SYSTEM_PROMPT = `You write short, warm, personalised copy for a digital celebration surprise page.
These are intro slides the recipient reads as a personal welcome experience.
The tone is joyful, sincere, and a little poetic — never corporate or generic.

You will produce a sequence of up to 10 slides total: 5 fixed slides (welcome, occasion, together, about, ready) plus a "final" closing slide, plus up to 4 extra "chapters" that explore unique facets of the recipient drawn from their description.

Output ONLY valid JSON with this exact structure:
{
  "welcome": {
    "subtext": "string (≤90 chars) — a warm opening line about this moment. MUST NOT contain the recipient's name (the slide already greets them).",
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
  "chapters": [
    {
      "headline": "string (≤55 chars) — a small, specific theme drawn from the description (a passion, a quality, a memory)",
      "body": "string (≤140 chars) — one or two sentences expanding the theme, warm and specific",
      "emoji": "string — one fitting emoji"
    }
  ],
  "ready": {
    "headline": "string (≤55 chars) — name what they're about to relive, tied to THIS occasion (e.g. their birthday / graduation / send-off). Never a generic 'get ready to celebrate'.",
    "subtext": "string (≤80 chars) — a warm, personal send-off into the memories that follow"
  },
  "final": {
    "headline": "string (≤55 chars) — the closing statement after every memory has been seen",
    "subtext": "string (≤90 chars) — a quiet, lasting parting thought",
    "emoji": "string — one fitting emoji"
  }
}

Rules:
- The "about" field MUST be included only if a description is provided. Omit it entirely if no description.
- "about.lines" should have 2–3 items drawn from the description — specific details, not generic praise.
- "chapters" should have 0–4 items. Include chapters ONLY if you can draw them from the description (specific passions, qualities, memorable details). Skip if generic.
- Together with the fixed slides, total slide count must stay at or under 10.
- The "final" slide ALWAYS appears — it is the parting statement after the recipient has seen everything.
- The "ready" slide must feel specific to the occasion and to what plays next (their photos and memories). It is NOT a hype line — never write "get ready for the celebration" or anything that asks "what celebration?". Anchor it to the event type and the person.
- Never use the words: wonderful, amazing, truly, really, special, tapestry, symphony, mosaic, kaleidoscope, journey, testament, chapter, narrative (find fresher, more specific words).
- Never reference other people sending messages or friends gathering — keep it between this page and the recipient.
- Avoid heart emojis (❤️, 💕, 💖) and generic party emojis. Choose emojis that feel specific to this person.
- Do NOT repeat the recipient's name anywhere. The slides already display their name separately; repeating it in copy reads awkwardly.
- Use complete sentences with proper grammar and capitalisation.
- Be specific and creative — avoid clichés. Draw from the description to say something only this person would recognise.
- NEVER use placeholder syntax like {name}, {firstName}, or any curly-brace template — write "you" directly instead.
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

function stripName(text: string, firstName: string, fullName: string): string {
  const names = [firstName, ...fullName.split(/\s+/)].filter(Boolean);
  let out = text;
  for (const n of names) {
    if (n.length < 2) continue;
    const re = new RegExp(`(^|[\\s,!.?;:—-])${n}([\\s,!.?;:—-]|$)`, "gi");
    out = out.replace(re, (_, a, b) => (a + b));
  }
  return out.replace(/\s+([,.!?;:])/g, "$1").replace(/\s{2,}/g, " ").replace(/^[\s,]+|[\s,]+$/g, "").trim();
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
      max_tokens: 1100,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage(params) },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw) as IntroContent;

    if (
      !parsed.welcome?.subtext ||
      !parsed.occasion?.title ||
      !parsed.ready?.headline ||
      !parsed.final?.headline
    ) {
      return null;
    }

    // Defense in depth: strip stray name mentions from welcome subtext.
    parsed.welcome.subtext = stripName(parsed.welcome.subtext, params.firstName, params.recipientName);

    // Enforce slide cap: at most 4 chapters, total ≤10 slides.
    if (Array.isArray(parsed.chapters)) {
      parsed.chapters = parsed.chapters
        .filter((c) => c?.headline && c?.body)
        .slice(0, 4);
    }

    return parsed;
  } catch {
    return null;
  }
}
