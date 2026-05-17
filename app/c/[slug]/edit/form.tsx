"use client";

import { useActionState, useRef, useState } from "react";
import { editCelebration, type EditState } from "./actions";
import { ThemePicker } from "@/components/theme-picker";
import type { Theme } from "@/lib/themes";
import { X, ImagePlus, Loader2 } from "lucide-react";

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

type GalleryItem = { path: string; caption: string; preview: string };

export function EditForm({
  slug, initial,
}: {
  slug: string;
  initial: {
    title: string;
    messageFromCreator: string;
    tagline: string;
    celebrantDescription: string;
    coverPhotoPath: string | null;
    theme: Theme;
    securityQuestion: string | null;
    recipientName: string;
    galleryImages: { path: string; caption: string }[];
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

  // Gallery images
  const galleryFileRef = useRef<HTMLInputElement>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryItem[]>(
    initial.galleryImages.map((img) => ({ ...img, preview: publicUrl(img.path) })),
  );
  const [uploadingGallery, setUploadingGallery] = useState(false);

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

  async function onGalleryFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 8 * 1024 * 1024) { alert("Image must be under 8 MB."); return; }
    if (galleryImages.length >= 8) { alert("Maximum 8 gallery photos."); return; }
    setUploadingGallery(true);
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const res = await fetch("/api/media/sign-gallery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ext: ["jpg","jpeg","png","webp"].includes(ext) ? ext : "jpg" }),
    });
    const sign = await res.json();
    if (!res.ok) { setUploadingGallery(false); alert(sign.error ?? "Upload failed"); return; }
    const put = await fetch(sign.signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    setUploadingGallery(false);
    if (!put.ok) { alert("Upload failed"); return; }
    const preview = URL.createObjectURL(file);
    setGalleryImages((prev) => [...prev, { path: sign.path, caption: "", preview }]);
  }

  function removeGalleryImage(idx: number) {
    setGalleryImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateCaption(idx: number, caption: string) {
    setGalleryImages((prev) => prev.map((img, i) => i === idx ? { ...img, caption } : img));
  }

  const firstName = initial.recipientName.split(" ")[0];

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

      {/* Gallery images */}
      <div className="space-y-3">
        <div>
          <label className="label">Photo gallery (optional)</label>
          <p className="text-xs text-ink/45 mt-0.5">
            These photos appear as full-screen slides during {firstName}&apos;s opening sequence. Up to 8 photos.
          </p>
        </div>

        {galleryImages.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {galleryImages.map((img, idx) => (
              <div key={idx} className="relative rounded-2xl overflow-hidden shadow-ring bg-ink/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt="" className="w-full aspect-[4/3] object-cover" />
                <button
                  type="button"
                  onClick={() => removeGalleryImage(idx)}
                  className="absolute top-2 right-2 size-6 rounded-full glass-dark text-white grid place-items-center"
                  aria-label="Remove photo"
                >
                  <X className="size-3" />
                </button>
                <input
                  type="text"
                  placeholder="Add a caption…"
                  maxLength={100}
                  value={img.caption}
                  onChange={(e) => updateCaption(idx, e.target.value)}
                  className="w-full px-3 py-2 text-sm text-ink/80 bg-white/80 border-0 focus:outline-none focus:ring-0 placeholder:text-ink/35"
                />
              </div>
            ))}
          </div>
        )}

        <input
          ref={galleryFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onGalleryFile(e.target.files[0])}
        />
        {galleryImages.length < 8 && (
          <button
            type="button"
            onClick={() => galleryFileRef.current?.click()}
            disabled={uploadingGallery}
            className="btn-outline inline-flex text-sm disabled:opacity-50"
          >
            {uploadingGallery
              ? <><Loader2 className="size-4 animate-spin" /> Uploading…</>
              : <><ImagePlus className="size-4" /> Add a photo</>
            }
          </button>
        )}

        <input
          type="hidden"
          name="galleryImages"
          value={JSON.stringify(galleryImages.map(({ path, caption }) => ({ path, caption })))}
        />
      </div>

      <div className="space-y-1.5">
        <label className="label">Page title</label>
        <input className="field" name="title" defaultValue={initial.title} required maxLength={80} />
      </div>

      <div className="space-y-1.5">
        <label className="label">Custom tagline (optional)</label>
        <input
          className="field"
          name="tagline"
          defaultValue={initial.tagline}
          maxLength={140}
          placeholder={`e.g. "We got you, queen ✨" or leave blank to hide`}
        />
        <p className="text-xs text-ink/45">Shown on {firstName}&apos;s cover page. Leave blank to hide.</p>
      </div>

      <div className="space-y-1.5">
        <label className="label">About {firstName}</label>
        <textarea
          className="field min-h-[120px] resize-none"
          name="celebrantDescription"
          defaultValue={initial.celebrantDescription}
          maxLength={1500}
          placeholder={`Tell us about ${firstName} — their personality, what they love, what makes them who they are. This creates a personalised opening when they press Play.`}
        />
      </div>

      <div className="space-y-1.5">
        <label className="label">A note from you</label>
        <textarea className="field min-h-[100px] resize-none" name="messageFromCreator"
          defaultValue={initial.messageFromCreator} maxLength={280}
          placeholder="Tell everyone what this is for…" />
      </div>

      <div className="pt-4 border-t border-ink/10 space-y-3">
        <div>
          <p className="serif text-xl text-ink">Security question <span className="text-ink/40 text-sm font-sans not-italic ml-1">— optional</span></p>
          <p className="text-ink/55 text-xs mt-1">
            Asked before {firstName} can open their page. Leave both fields blank to remove the gate. Leave answer blank to keep the existing one.
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="label">Question</label>
          <input className="field" name="securityQuestion"
            defaultValue={initial.securityQuestion ?? ""} maxLength={140}
            placeholder="What was your childhood nickname? (blank to remove)" />
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
