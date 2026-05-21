import type { IntroContent } from "@/lib/openai/generate-intro";

const EVENT_EMOJI: Record<string, string> = {
  birthday: "🎂", graduation: "🎓", wedding: "💍",
  appreciation: "🙏", farewell: "🌟", baby_shower: "🌙",
  surprise_gift: "🎁", other: "✨",
};

const EVENT_NOUN: Record<string, string> = {
  birthday: "birthday", graduation: "graduation", wedding: "big day",
  appreciation: "day", farewell: "send-off", baby_shower: "baby shower",
  surprise_gift: "surprise", other: "day",
};

// What the "ready" slide should anticipate — the memories that play next,
// tied to the actual occasion rather than a generic "get ready".
function readyHeadline(event: string): string {
  switch (event) {
    case "birthday": return "Your birthday, one moment at a time";
    case "graduation": return "Look how far you've come";
    case "wedding": return "Before the big day begins";
    case "farewell": return "A few moments before you go";
    case "baby_shower": return "While we wait for the little one";
    case "surprise_gift": return "Surprise — this one's for you";
    case "appreciation": return "A few things worth pausing on";
    default: return "Take a moment, this is for you";
  }
}

/**
 * A sensible, editable opening deck built purely from the draft — no AI call.
 * Used so the slideshow editor is never empty (and always matches the preview),
 * even before the creator generates AI copy. The creator can then tweak each
 * line or hit "Generate" to replace it with personalised AI copy.
 */
export function buildDefaultIntro(params: {
  recipientName: string;
  eventType: string;
  celebrationTitle: string;
  tagline: string | null;
  celebrantDescription: string | null;
}): IntroContent {
  const event = params.eventType || "birthday";
  const emoji = EVENT_EMOJI[event] ?? "✨";
  const noun = EVENT_NOUN[event] ?? "day";
  const title =
    params.celebrationTitle?.trim() ||
    `A celebration of ${params.recipientName.split(" ")[0] || "you"}`;

  const desc = params.celebrantDescription?.trim() ?? "";
  const aboutLines = desc
    ? desc
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, 3)
        .map((s) => (s.length > 70 ? `${s.slice(0, 67).trimEnd()}…` : s))
    : [];

  return {
    welcome: {
      emoji,
      subtext: "Press play — this whole thing was made for you.",
    },
    occasion: {
      title,
      subtext: `Today is all about you and this ${noun}.`,
      emoji,
    },
    together: {
      headline: "Here's to you",
      subtext: params.tagline?.trim() || "A moment to celebrate everything you are.",
    },
    ...(aboutLines.length
      ? { about: { headline: "A few things worth saying", lines: aboutLines } }
      : {}),
    ready: {
      headline: readyHeadline(event),
      subtext: "Tap through, and take your time.",
    },
    final: {
      headline: "With love",
      subtext: "Today, and every day after.",
      emoji,
    },
  };
}
