"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { editCelebration, type EditState } from "./actions";
import { DesignStep } from "@/components/page-editor/design-step";
import type { MusicTrack } from "@/lib/music";
import type { Theme } from "@/lib/themes";
import type { PageDraft } from "@/components/page-editor/types";

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

export function EditForm({
  slug,
  initial,
  tracks,
}: {
  slug: string;
  tracks: MusicTrack[];
  initial: {
    title: string;
    messageFromCreator: string;
    tagline: string;
    celebrantDescription: string;
    coverPhotoPath: string | null;
    theme: Theme;
    backgroundMusic: string | null;
    recipientName: string;
    eventType: string;
    celebrationDate: string;
    galleryImages: { path: string; caption: string; kind?: "image" | "video" }[];
  };
}) {
  const router = useRouter();
  const action = editCelebration.bind(null, slug);
  const [state, dispatch, pending] = useActionState<EditState, FormData>(action, {});

  const [draft, setDraft] = useState<PageDraft>({
    title: initial.title,
    recipientName: initial.recipientName,
    eventType: initial.eventType,
    celebrationDate: initial.celebrationDate,
    messageFromCreator: initial.messageFromCreator,
    tagline: initial.tagline,
    celebrantDescription: initial.celebrantDescription,
    coverPath: initial.coverPhotoPath,
    coverPreview: initial.coverPhotoPath ? publicUrl(initial.coverPhotoPath) : null,
    theme: initial.theme,
    backgroundMusic: initial.backgroundMusic,
    gallery: initial.galleryImages.map((img) => ({
      path: img.path,
      caption: img.caption,
      kind: img.kind ?? "image",
      preview: publicUrl(img.path),
    })),
  });

  function update(patch: Partial<PageDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function save() {
    const fd = new FormData();
    fd.set("title", draft.title);
    fd.set("theme", draft.theme);
    if (draft.backgroundMusic) fd.set("backgroundMusic", draft.backgroundMusic);
    if (draft.messageFromCreator) fd.set("messageFromCreator", draft.messageFromCreator);
    if (draft.tagline) fd.set("tagline", draft.tagline);
    fd.set("celebrantDescription", draft.celebrantDescription);
    if (draft.coverPath) fd.set("coverPhotoPath", draft.coverPath);
    fd.set(
      "galleryImages",
      JSON.stringify(
        draft.gallery.map(({ path, caption, kind }) => ({ path, caption, kind })),
      ),
    );
    dispatch(fd);
  }

  const firstName = draft.recipientName.split(" ")[0] || "them";

  return (
    <DesignStep
      draft={draft}
      update={update}
      tracks={tracks}
      mode="edit"
      onBack={() => router.push(`/c/${slug}`)}
      backLabel="Back to page"
      errorText={state.error ?? null}
      primary={{
        label: state.ok ? "Saved ✓" : "Save changes",
        submittingLabel: "Saving…",
        onClick: save,
        submitting: pending,
      }}
      extrasBelow={
        <div className="rounded-3xl2 bg-white shadow-ring p-5 space-y-3">
          <div>
            <p className="font-medium text-ink">AI brief about {firstName}</p>
            <p className="text-xs text-ink/50 mt-0.5">
              Only you see this. Used to personalise {firstName}&apos;s slideshow opening.
            </p>
          </div>
          <textarea
            className="field min-h-[120px] resize-none"
            value={draft.celebrantDescription}
            onChange={(e) => update({ celebrantDescription: e.target.value })}
            maxLength={1500}
            placeholder={`Tell us about ${firstName} — their personality, what they love, what makes them who they are.`}
          />
          <p className="text-xs text-ink/45">
            {draft.celebrantDescription.length}/1500
          </p>
        </div>
      }
    />
  );
}
