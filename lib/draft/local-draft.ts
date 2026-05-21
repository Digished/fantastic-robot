import type { PageDraft } from "@/components/page-editor/types";

export type SavedDraft = {
  draft: PageDraft;
  bankCode: string;
  accountNumber: string;
  updatedAt: number;
};

const KEY = "spendbox.create.draft.v1";

function publicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

export function loadLocalDraft(): SavedDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedDraft;
    // Blob URLs from the previous session are dead — rebuild previews from
    // the stored paths so the editor can render uploaded media on resume.
    parsed.draft.coverPreview = publicUrl(parsed.draft.coverPath);
    parsed.draft.gallery = (parsed.draft.gallery ?? []).map((g) => ({
      path: g.path,
      caption: g.caption ?? "",
      kind: g.kind ?? "image",
      preview: publicUrl(g.path) ?? "",
    }));
    return parsed;
  } catch {
    return null;
  }
}

export function saveLocalDraft(value: Omit<SavedDraft, "updatedAt">) {
  if (typeof window === "undefined") return;
  const cleanDraft: PageDraft = {
    ...value.draft,
    coverPreview: null,
    gallery: value.draft.gallery
      .filter((g) => g.path)
      .map((g) => ({ path: g.path, caption: g.caption, kind: g.kind, preview: "" })),
  };
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ ...value, draft: cleanDraft, updatedAt: Date.now() }),
    );
  } catch {
    // Quota exceeded or storage disabled — drop silently.
  }
}

export function clearLocalDraft() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
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
