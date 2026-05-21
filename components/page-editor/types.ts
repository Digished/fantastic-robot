import type { Theme } from "@/lib/themes";
import type { IntroContent } from "@/lib/openai/generate-intro";

export type GalleryItem = {
  path: string;
  caption: string;
  preview: string;
  kind: "image" | "video";
  /** Stable client-side key for in-flight uploads (path is empty until done). */
  id?: string;
  /** True while the file is still uploading in the background. */
  uploading?: boolean;
  /** Upload progress 0–100, shown as a per-tile bar. */
  progress?: number;
};

export type EventType =
  | "birthday" | "graduation" | "wedding" | "appreciation"
  | "farewell" | "baby_shower" | "surprise_gift" | "other";

export const EVENT_OPTIONS: ReadonlyArray<readonly [EventType, string]> = [
  ["birthday", "Birthday"],
  ["graduation", "Graduation"],
  ["wedding", "Wedding"],
  ["appreciation", "Appreciation"],
  ["farewell", "Farewell"],
  ["baby_shower", "Baby shower"],
  ["surprise_gift", "Surprise gift"],
  ["other", "Other"],
];

export function eventLabel(value: string): string {
  const found = EVENT_OPTIONS.find(([v]) => v === value);
  return found ? found[1] : value.replace(/_/g, " ");
}

/** The mutable state behind the WYSIWYG editor. */
export type PageDraft = {
  title: string;
  recipientName: string;
  eventType: string;
  celebrationDate: string;             // datetime-local string
  messageFromCreator: string;
  tagline: string;
  celebrantDescription: string;
  coverPath: string | null;
  coverPreview: string | null;
  theme: Theme;
  backgroundMusic: string | null;
  gallery: GalleryItem[];
  introContent: IntroContent | null;
};

/** Draft updater — accepts a partial patch or a function of the previous draft. */
export type UpdateDraft = (
  patch: Partial<PageDraft> | ((prev: PageDraft) => Partial<PageDraft>),
) => void;

export type { IntroContent } from "@/lib/openai/generate-intro";
