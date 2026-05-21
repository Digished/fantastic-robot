import type { PageDraft } from "@/components/page-editor/types";

export type SavedDraft = {
  draft: PageDraft;
  bankCode: string;
  accountNumber: string;
  updatedAt: number;
};

function publicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

/** Restore previews/transient fields that aren't stored in the persisted JSON. */
export function rehydrateDraft(raw: SavedDraft): SavedDraft {
  const draft = raw.draft;
  return {
    ...raw,
    draft: {
      ...draft,
      coverPreview: publicUrl(draft.coverPath),
      gallery: (draft.gallery ?? []).map((g) => ({
        path: g.path,
        caption: g.caption ?? "",
        kind: g.kind ?? "image",
        preview: publicUrl(g.path) ?? "",
      })),
    },
  };
}

/** Strip transient fields (blob URLs, in-flight uploads) before persisting. */
export function serializeDraft(value: Omit<SavedDraft, "updatedAt">): SavedDraft {
  return {
    ...value,
    updatedAt: Date.now(),
    draft: {
      ...value.draft,
      coverPreview: null,
      gallery: value.draft.gallery
        .filter((g) => g.path)
        .map((g) => ({ path: g.path, caption: g.caption, kind: g.kind, preview: "" })),
    },
  };
}

export function isDraftPristine(
  draft: PageDraft,
  bankCode: string,
  accountNumber: string,
): boolean {
  return (
    !draft.title.trim() &&
    !draft.recipientName.trim() &&
    !draft.celebrantDescription.trim() &&
    !draft.celebrationDate &&
    !draft.messageFromCreator.trim() &&
    !draft.tagline.trim() &&
    !draft.coverPath &&
    draft.gallery.length === 0 &&
    !bankCode &&
    !accountNumber
  );
}
