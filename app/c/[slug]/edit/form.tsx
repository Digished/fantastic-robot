"use client";

import { useActionState, useRef, useState } from "react";
import { editCelebration, type EditState } from "./actions";
import { ThemePicker } from "@/components/theme-picker";
import { MusicPicker } from "@/components/music-picker";
import type { MusicTrack } from "@/lib/music";
import type { Theme } from "@/lib/themes";
import { X, ImagePlus, Loader2, Video } from "lucide-react";

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

type GalleryItem = { path: string; caption: string; preview: string; kind: "image" | "video" };

const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp"];
const VIDEO_EXTS = ["mp4", "mov", "webm"];

function galleryExt(file: File): { ext: string; kind: "image" | "video" } | null {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (file.type.startsWith("image/") && IMAGE_EXTS.includes(ext)) return { ext, kind: "image" };
  if (file.type.startsWith("image/")) return { ext: "jpg", kind: "image" };
  if (file.type.startsWith("video/") && VIDEO_EXTS.includes(ext)) return { ext, kind: "video" };
  if (file.type.startsWith("video/")) return { ext: "mp4", kind: "video" };
  return null;
}

export function EditForm({
  slug, initial, tracks,
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
    galleryImages: { path: string; caption: string; kind?: "image" | "video" }[];
  };
}) {
  const action = editCelebration.bind(null, slug);
  const [state, dispatch] = useActionState<EditState, FormData>(action, {});
  const [theme, setTheme] = useState<Theme>(initial.theme);
  const [backgroundMusic, setBackgroundMusic] = useState<string | null>(initial.backgroundMusic);

  const fileRef = useRef<HTMLInputElement>(null);
  const [coverPath, setCoverPath] = useState<string | null>(initial.coverPhotoPath);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    initial.coverPhotoPath ? publicUrl(initial.coverPhotoPath) : null,
  );
  const [uploading, setUploading] = useState(false);

  // Gallery
  const galleryFileRef = useRef<HTMLInputElement>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryItem[]>(
    initial.galleryImages.map((img) => ({
      ...img,
      kind: img.kind ?? "image",
      preview: publicUrl(img.path),
    })),
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
      body: JSON.stringify({ ext: IMAGE_EXTS.includes(ext) ? ext : "jpg" }),
    });
    const sign = await res.json();
    if (!res.ok) { setUploading(false); alert(sign.error ?? "Upload failed"); return; }
    const put = await fetch(sign.signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    setUploading(false);
    if (!put.ok) { alert("Upload failed"); return; }
    setCoverPath(sign.path);
    setCoverPreview(URL.createObjectURL(file));
  }

  async function onGalleryFiles(files: FileList) {
    const remaining = 20 - galleryImages.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) { alert("Maximum 20 gallery items reached."); return; }
    setUploadingGallery(true);
    for (const file of toUpload) {
      if (file.size > 50 * 1024 * 1024) { alert(`${file.name} is too large (max 50 MB).`); continue; }
      const meta = galleryExt(file);
      if (!meta) { alert(`${file.name} is not a supported image or video.`); continue; }
      const res = await fetch("/api/media/sign-gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ext: meta.ext }),
      });
      const sign = await res.json();
      if (!res.ok) { alert(sign.error ?? "Upload failed"); continue; }
      const put = await fetch(sign.signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) { alert("Upload failed"); continue; }
      const preview = URL.createObjectURL(file);
      setGalleryImages((prev) => [...prev, { path: sign.path, caption: "", preview, kind: meta.kind }]);
    }
    setUploadingGallery(false);
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

      <MusicPicker value={backgroundMusic} onChange={setBackgroundMusic} tracks={tracks} />

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

      {/* Gallery */}
      <div className="space-y-3">
        <div>
          <label className="label">Photo &amp; video gallery (optional)</label>
          <p className="text-xs text-ink/45 mt-0.5">
            Full-screen slides during {firstName}&apos;s opening. Add up to 20 photos or short videos ({galleryImages.length}/20).
          </p>
        </div>

        {galleryImages.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {galleryImages.map((img, idx) => (
              <div key={idx} className="relative rounded-2xl overflow-hidden shadow-ring bg-ink/5">
                {img.kind === "video" ? (
                  <div className="w-full aspect-[4/3] bg-ink/80 grid place-items-center">
                    <Video className="size-8 text-white/60" />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.preview} alt="" className="w-full aspect-[4/3] object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => removeGalleryImage(idx)}
                  className="absolute top-2 right-2 size-6 rounded-full glass-dark text-white grid place-items-center"
                  aria-label="Remove"
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
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && e.target.files.length > 0 && onGalleryFiles(e.target.files)}
        />
        {galleryImages.length < 20 && (
          <button
            type="button"
            onClick={() => galleryFileRef.current?.click()}
            disabled={uploadingGallery}
            className="btn-outline inline-flex text-sm disabled:opacity-50"
          >
            {uploadingGallery
              ? <><Loader2 className="size-4 animate-spin" /> Uploading…</>
              : <><ImagePlus className="size-4" /> Add photos / videos</>
            }
          </button>
        )}

        <input
          type="hidden"
          name="galleryImages"
          value={JSON.stringify(galleryImages.map(({ path, caption, kind }) => ({ path, caption, kind })))}
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

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-ink/70">Saved.</p>}

      <button className="btn-accent w-full py-4 shadow-soft">Save changes</button>
    </form>
  );
}
