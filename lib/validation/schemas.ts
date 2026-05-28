import { z } from "zod";
import { THEME_IDS } from "@/lib/themes";

// Music track ids are validated server-side against the live list of enabled
// tracks (built-in plus admin-uploaded), so this schema just shape-checks
// the value.
// Holds a track id, an `upload:<path>` sentinel, and an optional
// `#clip=<start>-<end>` window — so it needs more room than a bare id.
const musicTrackId = z.string().min(1).max(200);

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
  introContent: z.string().optional(),
});

// A self-owned page: the creator IS the celebrant. The payout bank is
// captured here (compulsory) and saved to their profile, and they can pick a
// celebration song just like the main flow.
export const createSelfCelebrationSchema = z.object({
  title: z.string().min(2).max(80),
  eventType: z.enum([
    "birthday", "graduation", "wedding", "appreciation",
    "farewell", "baby_shower", "surprise_gift", "other",
  ]),
  theme: z.enum(THEME_IDS).default("ivory"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  backgroundMusic: musicTrackId.nullable().optional(),
  bankCode: z.string({ required_error: "Choose your bank" }).min(2, "Choose your bank").max(10),
  accountNumber: naijaAccountNumber,
  avatarPath: z.string().optional(),
  shippingAddress: z.string().optional(),
});

export const profileBankSchema = z.object({
  bankCode: z.string().min(2).max(10),
  accountNumber: naijaAccountNumber,
});

export const shippingAddressSchema = z.object({
  id: z.string().optional(),
  label: z.string().max(40).optional(),
  fullName: z.string().min(1, "Full name is required").max(80),
  line1: z.string().min(1, "Street address is required").max(100),
  line2: z.string().max(100).optional(),
  city: z.string().min(1, "City is required").max(60),
  state: z.string().min(1, "State is required").max(60),
  country: z.string().min(1).max(60).default("Nigeria"),
  phone: z.string().max(24).optional(),
});

export const shippingAddressesSchema = z.array(shippingAddressSchema).max(5);
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

// A wishlist item: a thing the celebrant would love, with an optional link.
export const wishlistItemSchema = z.object({
  title: z.string().min(1).max(120),
  url: z.string().url().max(500).optional().or(z.literal("")),
});
export const wishlistSchema = z.array(wishlistItemSchema).max(20);

// Editing a self-owned page: simpler than the full editor. The celebrant is
// the creator, so labels are first-person and there's no AI brief/slides.
// Self pages are always sealed — the surprise is the whole point.
export const editSelfCelebrationSchema = z.object({
  title: z.string().min(2).max(80),
  theme: z.enum(THEME_IDS).optional(),
  messageFromCreator: z.string().max(280).optional(),
  isRecurring: z.boolean().default(false),
  backgroundMusic: musicTrackId.nullable().optional(),
  presentation: z.enum(["reel", "book"]).optional(),
  wishlist: wishlistSchema.default([]),
  // Payout bank lives on the profile; optional here so they can set it inline.
  bankCode: z.string().min(2).max(10).optional(),
  accountNumber: naijaAccountNumber.optional(),
});

export type WishlistItem = z.infer<typeof wishlistItemSchema>;

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
