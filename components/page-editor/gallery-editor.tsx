"use client";

import { useRef } from "react";
import { ImagePlus, Video, X } from "lucide-react";
import { uploadWithProgress } from "@/lib/upload";
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

type SetItems = (next: GalleryItem[] | ((prev: GalleryItem[]) => GalleryItem[])) => void;

/**
 * Gallery panel — manages the user's photos & short videos. Uploads run in the
 * background: each picked file is added to the grid immediately and uploads on
 * its own with a real progress bar. Because the items (and their progress) live
 * in the draft, uploads keep going and stay visible even if the creator
 * navigates to another step and back while they finish.
 */
export function GalleryEditor({
  items,
  setItems,
  recipientFirstName,
  endpoint = "/api/media/sign-gallery",
  endpointBody,
}: {
  items: GalleryItem[];
  setItems: SetItems;
  recipientFirstName: string;
  endpoint?: string;
  endpointBody?: Record<string, unknown>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadsRef = useRef<Map<string, AbortController>>(new Map());

  const uploadingCount = items.filter((i) => i.uploading).length;

  function patchItem(id: string, patch: Partial<GalleryItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function dropItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  async function uploadOne(id: string, file: File, ext: string) {
    const controller = new AbortController();
    uploadsRef.current.set(id, controller);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ext, ...(endpointBody ?? {}) }),
      });
      const sign = await res.json();
      if (!res.ok) throw new Error(sign.error ?? "Upload failed");

      await uploadWithProgress({
        url: sign.signedUrl,
        file,
        contentType: file.type,
        signal: controller.signal,
        onProgress: (p) => patchItem(id, { progress: p }),
      });

      patchItem(id, { path: sign.path, uploading: false, progress: 100 });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return; // user removed it
      dropItem(id);
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      uploadsRef.current.delete(id);
    }
  }

  function onFiles(files: FileList) {
    const remaining = 20 - items.length;
    if (remaining <= 0) {
      alert("Maximum 20 gallery items reached.");
      return;
    }
    const placeholders: GalleryItem[] = [];
    const jobs: { id: string; file: File; ext: string }[] = [];

    for (const file of Array.from(files).slice(0, remaining)) {
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name} is too large (max 50 MB).`);
        continue;
      }
      const meta = galleryExt(file);
      if (!meta) {
        alert(`${file.name} is not a supported image or video.`);
        continue;
      }
      const id = crypto.randomUUID();
      placeholders.push({
        id,
        path: "",
        caption: "",
        preview: URL.createObjectURL(file),
        kind: meta.kind,
        uploading: true,
        progress: 0,
      });
      jobs.push({ id, file, ext: meta.ext });
    }

    if (placeholders.length === 0) return;
    // Show every tile right away, then upload each in the background.
    setItems((prev) => [...prev, ...placeholders]);
    jobs.forEach((j) => void uploadOne(j.id, j.file, j.ext));
  }

  // Match by stable id when present (the object identity churns as progress
  // updates land); fall back to reference equality for already-saved items.
  function remove(item: GalleryItem) {
    if (item.id) {
      uploadsRef.current.get(item.id)?.abort();
      uploadsRef.current.delete(item.id);
      setItems((prev) => prev.filter((it) => it.id !== item.id));
    } else {
      setItems((prev) => prev.filter((it) => it !== item));
    }
  }
  function updateCaption(item: GalleryItem, caption: string) {
    setItems((prev) =>
      prev.map((it) =>
        (item.id ? it.id === item.id : it === item) ? { ...it, caption } : it,
      ),
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-medium text-ink">Photo &amp; video gallery</p>
          <p className="text-xs text-ink/50 mt-0.5">
            Full-screen slides during {recipientFirstName}&apos;s opening · {items.length}/20
            {uploadingCount > 0 && (
              <span className="text-[var(--accent)]"> · {uploadingCount} uploading…</span>
            )}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) onFiles(e.target.files);
            e.target.value = ""; // allow re-picking the same file
          }}
        />
        {items.length < 20 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn-outline inline-flex text-sm shrink-0"
          >
            <ImagePlus className="size-4" /> Add media
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
          {items.map((img) => (
            <div
              key={img.id ?? img.path}
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

              {img.uploading && (
                <div className="absolute inset-0 bg-ink/45 grid place-items-center">
                  <div className="w-3/4 text-center text-white">
                    <p className="serif text-2xl drop-shadow">{img.progress ?? 0}%</p>
                    <div className="mt-2 h-1.5 rounded-full bg-white/25 overflow-hidden">
                      <div
                        className="h-full bg-white transition-[width] duration-200 ease-out"
                        style={{ width: `${img.progress ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => remove(img)}
                className="absolute top-2 right-2 size-6 rounded-full glass-dark text-white grid place-items-center z-10"
                aria-label="Remove"
              >
                <X className="size-3" />
              </button>
              <input
                type="text"
                placeholder="Add a caption…"
                maxLength={100}
                disabled={img.uploading}
                value={img.caption}
                onChange={(e) => updateCaption(img, e.target.value)}
                className="w-full px-3 py-2 text-sm text-ink/80 bg-white/80 border-0 focus:outline-none focus:ring-0 placeholder:text-ink/35 disabled:opacity-50"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
