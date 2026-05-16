"use client";

import { useActionState, useRef, useState } from "react";
import { editCelebration, type EditState } from "./actions";
import { ThemePicker } from "@/components/theme-picker";
import type { Theme } from "@/lib/themes";

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

export function EditForm({
  slug, initial,
}: {
  slug: string;
  initial: {
    title: string;
    messageFromCreator: string;
    coverPhotoPath: string | null;
    theme: Theme;
    securityQuestion: string | null;
  };
}) {
  const action = editCelebration.bind(null, slug);
  const [state, dispatch] = useActionState<EditState, FormData>(action, {});
  const [theme, setTheme] = useState<Theme>(initial.theme);

  const fileRef = useRef<HTMLInputElement>(null);
  const [coverPath, setCoverPath] = useState<string | null>(initial.coverPhotoPath);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    initial.coverPhotoPath ? publicUrl(initial.coverPhotoPath) : null,
  );
  const [uploading, setUploading] = useState(false);

  async function onCover(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 8 * 1024 * 1024) { alert("Cover must be under 8 MB."); return; }
    setUploading(true);
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const res = await fetch("/api/media/sign-cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ext: ["jpg","jpeg","png","webp"].includes(ext) ? ext : "jpg" }),
    });
    const sign = await res.json();
    if (!res.ok) { setUploading(false); alert(sign.error ?? "Upload failed"); return; }
    const put = await fetch(sign.signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    setUploading(false);
    if (!put.ok) { alert("Upload failed"); return; }
    setCoverPath(sign.path);
    setCoverPreview(URL.createObjectURL(file));
  }

  return (
    <form action={dispatch} className="mt-8 space-y-6" data-theme={theme}>
      <div className="relative h-28 rounded-3xl2 overflow-hidden shadow-ring theme-mesh">
        <p className="absolute bottom-3 left-4 text-[11px] uppercase tracking-widest text-ink/60">Preview</p>
      </div>

      <ThemePicker value={theme} onChange={setTheme} />

      <div className="space-y-2">
        <label className="label">Cover photo</label>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => e.target.files?.[0] && onCover(e.target.files[0])} />
        {coverPreview ? (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="relative w-full aspect-[4/3] rounded-3xl2 overflow-hidden shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPreview} alt="" className="size-full object-cover" />
            <span className="absolute bottom-3 right-3 glass-dark text-white rounded-full px-3 py-1 text-xs">
              {uploading ? "Uploading…" : "Change"}
            </span>
          </button>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full aspect-[4/3] rounded-3xl2 border-2 border-dashed border-ink/15 grid place-items-center text-ink/55">
            {uploading ? "Uploading…" : "+ Add a cover photo"}
          </button>
        )}
        {coverPath && <input type="hidden" name="coverPhotoPath" value={coverPath} />}
      </div>

      <div className="space-y-1.5">
        <label className="label">Page title</label>
        <input className="field" name="title" defaultValue={initial.title} required maxLength={80} />
      </div>

      <div className="space-y-1.5">
        <label className="label">A note from you</label>
        <textarea className="field min-h-[100px] resize-none" name="messageFromCreator"
          defaultValue={initial.messageFromCreator} maxLength={280}
          placeholder="Tell everyone what this is for…" />
      </div>

      <div className="pt-4 border-t border-ink/10 space-y-3">
        <div>
          <p className="serif text-xl text-ink">Security question</p>
          <p className="text-ink/55 text-xs mt-1">
            Asked before the celebrant can open their page. Leave answer blank to keep the existing one.
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="label">Question</label>
          <input className="field" name="securityQuestion"
            defaultValue={initial.securityQuestion ?? ""} maxLength={140}
            placeholder="What was your childhood nickname?" />
        </div>
        <div className="space-y-1.5">
          <label className="label">Answer (only if changing)</label>
          <input className="field" name="securityAnswer" maxLength={140}
            placeholder="Leave blank to keep the old answer" />
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-ink/70">Saved.</p>}

      <button className="btn-accent w-full py-4 shadow-soft">Save changes</button>
    </form>
  );
}
