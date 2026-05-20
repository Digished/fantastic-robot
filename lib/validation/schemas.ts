import { z } from "zod";
import { THEME_IDS } from "@/lib/themes";

// Music track ids are validated server-side against the live list of enabled
// tracks (built-in plus admin-uploaded), so this schema just shape-checks
// the value.
const musicTrackId = z.string().min(1).max(80);

export const signupSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(72),
  displayName: z.string().min(1).max(60).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const naijaAccountNumber = z.string().regex(/^\d{10}$/, "10 digits");

export const createCelebrationSchema = z.object({
  title: z.string().min(2).max(80),
  recipientName: z.string().min(1).max(60),
  eventType: z.enum([
    "birthday", "graduation", "wedding", "appreciation",
    "farewell", "baby_shower", "surprise_gift", "other",
  ]),
  theme: z.enum(THEME_IDS).default("ivory"),
  backgroundMusic: musicTrackId.nullable().optional(),
  celebrationDate: z.string().refine(
    (s) => {
      const d = new Date(s);
      return !Number.isNaN(d.getTime()) && d.getTime() > Date.now() + 96 * 3600 * 1000;
    },
    { message: "date must be at least 96 hours from now" },
  ),
  messageFromCreator: z.string().max(280).optional(),
  tagline: z.string().max(140).optional(),
  celebrantDescription: z.string().min(20, "Please tell us a little about the person you're celebrating.").max(1500),
  recipientBankCode: z.string().min(2).max(10),
  recipientAccountNumber: naijaAccountNumber,
  coverPhotoPath: z.string().optional(),
  galleryImages: z.string().optional(),
});

export const messageSchema = z.object({
  body: z.string().max(500).optional(),
  mediaKind: z.enum(["none", "audio", "video", "image"]).default("none"),
  mediaPath: z.string().optional(),
  mediaDurationMs: z.number().int().nonnegative().optional(),
  interactiveKind: z.enum([
    "none","gift","letter","cake","heart",
    "scratch","polaroid","balloons","jar","sparkler","toast",
  ]).default("none"),
  interactivePayload: z.record(z.string(), z.unknown()).optional(),
  contributorName: z.string().min(1).max(60),
  contributorEmail: z.string().email().optional(),
  contributorPhone: z.string().max(24).optional(),
  contributorSessionId: z.string().min(8).max(64).optional(),
  isAnonymous: z.boolean().default(false),
}).refine(
  (m) =>
    (m.body && m.body.length > 0) ||
    m.mediaKind !== "none" ||
    m.interactiveKind !== "none",
  { message: "message must have text, media, or an interactive surprise" },
);

export const editMessageSchema = z.object({
  body: z.string().max(500).optional(),
  contributorSessionId: z.string().min(8).max(64),
});

export const contributeSchema = z.object({
  amountKobo: z.coerce.bigint().refine((n) => n >= 50_000n, "₦500 minimum"),
  contributorName: z.string().min(1).max(60),
  contributorEmail: z.string().email(),
  contributorPhone: z.string().max(24).optional(),
  isAnonymous: z.boolean().default(false),
});

export type CreateCelebrationInput = z.infer<typeof createCelebrationSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type ContributeInput = z.infer<typeof contributeSchema>;
