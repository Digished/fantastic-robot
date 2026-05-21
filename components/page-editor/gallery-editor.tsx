"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Video, X } from "lucide-react";
import type { GalleryItem } from "./types";

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

/**
 * Gallery panel — manages the user's photos & short videos. Rendered as a
 * grid that matches the look of the wall on the live page. Each tile has an
 * inline caption editor and a remove button.
 */
export function GalleryEditor({
  items,
  setItems,
  recipientFirstName,
  endpoint = "/api/media/sign-gallery",
  endpointBody,
}: {
  items: GalleryItem[];
  setItems: (next: GalleryItem[]) => void;
  recipientFirstName: string;
  endpoint?: string;
  endpointBody?: Record<string, unknown>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFiles(files: FileList) {
    const remaining = 20 - items.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) {
      alert("Maximum 20 gallery items reached.");
      return;
    }
    setBusy(true);
    const acc: GalleryItem[] = [];
    for (const file of toUpload) {
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name} is too large (max 50 MB).`);
        continue;
      }
      const meta = galleryExt(file);
      if (!meta) {
        alert(`${file.name} is not a supported image or video.`);
        continue;
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ext: meta.ext, ...(endpointBody ?? {}) }),
      });
      const sign = await res.json();
      if (!res.ok) {
        alert(sign.error ?? "Upload failed");
        continue;
      }
      const put = await fetch(sign.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) {
        alert("Upload failed");
        continue;
      }
      acc.push({
        path: sign.path,
        caption: "",
        preview: URL.createObjectURL(file),
        kind: meta.kind,
      });
    }
    if (acc.length) setItems([...items, ...acc]);
    setBusy(false);
  }

  function remove(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }
  function updateCaption(idx: number, caption: string) {
    setItems(items.map((img, i) => (i === idx ? { ...img, caption } : img)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-medium text-ink">Photo &amp; video gallery</p>
          <p className="text-xs text-ink/50 mt-0.5">
            Full-screen slides during {recipientFirstName}&apos;s opening · {items.length}/20
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && e.target.files.length > 0 && onFiles(e.target.files)}
        />
        {items.length < 20 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="btn-outline inline-flex text-sm shrink-0 disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <ImagePlus className="size-4" /> Add media
              </>
            )}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full aspect-[16/9] sm:aspect-[16/7] rounded-3xl2 border-2 border-dashed border-ink/15 grid place-items-center text-ink/55 hover:bg-ink/5 transition"
        >
          <div className="flex flex-col items-center">
            <ImagePlus className="size-6" />
            <span className="text-sm mt-2">Tap to add photos &amp; short videos</span>
          </div>
        </button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((img, idx) => (
            <div
              key={`${img.path}-${idx}`}
              className="relative rounded-2xl overflow-hidden shadow-ring bg-ink/5"
            >
              {img.kind === "video" ? (
                <div className="relative w-full aspect-[4/3] bg-ink/80">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    src={`${img.preview}#t=0.1`}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <span className="absolute inset-0 grid place-items-center pointer-events-none">
                    <span className="grid size-9 place-items-center rounded-full bg-black/45 text-white">
                      <Video className="size-4" />
                    </span>
                  </span>
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={img.preview} alt="" className="w-full aspect-[4/3] object-cover" />
              )}
              <button
                type="button"
                onClick={() => remove(idx)}
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
    </div>
  );
}
