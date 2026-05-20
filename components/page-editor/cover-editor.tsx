"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { uploadWithProgress } from "@/lib/upload";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp"];

/**
 * Cover photo editor — IS the cover image on the preview. Tap anywhere to
 * upload (or replace). Shows real upload progress as a bar that fills from
 * the bottom of the image with a percentage centred on top.
 */
export function CoverEditor({
  src,
  onUploaded,
  className = "",
  aspectClass = "aspect-[4/5]",
  emptyLabel = "Add a cover photo",
}: {
  src: string | null;
  onUploaded: (result: { path: string; previewUrl: string }) => void;
  className?: string;
  aspectClass?: string;
  emptyLabel?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  async function onFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 8 * 1024 * 1024) {
      alert("Cover must be under 8 MB.");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    setProgress(0);
    setUploading(true);
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const res = await fetch("/api/media/sign-cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ext: IMAGE_EXTS.includes(ext) ? ext : "jpg" }),
    });
    const sign = await res.json();
    if (!res.ok) {
      setUploading(false);
      setLocalPreview(null);
      alert(sign.error ?? "Upload failed");
      return;
    }
    try {
      await uploadWithProgress({
        url: sign.signedUrl,
        file,
        contentType: file.type,
        onProgress: setProgress,
      });
    } catch (e) {
      setUploading(false);
      setLocalPreview(null);
      alert(e instanceof Error ? e.message : "Upload failed");
      return;
    }
    setProgress(100);
    setUploading(false);
    onUploaded({ path: sign.path, previewUrl: objectUrl });
  }

  const display = localPreview ?? src;

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className={`group relative w-full ${aspectClass} overflow-hidden ${className}`}
        aria-label={display ? "Change cover photo" : emptyLabel}
      >
        {display ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={display}
            alt=""
            className={`size-full object-cover transition ${
              uploading ? "scale-[1.02] blur-[1px]" : ""
            }`}
          />
        ) : (
          <div className="size-full theme-mesh grid place-items-center">
            <div className="flex flex-col items-center text-white/90">
              <ImagePlus className="size-7" />
              <span className="serif text-lg mt-2">{emptyLabel}</span>
            </div>
          </div>
        )}

        {uploading && (
          <>
            <div className="absolute inset-0 bg-ink/30" />
            <div
              className="absolute inset-x-0 bottom-0 bg-white/95 transition-[height] duration-200 ease-out"
              style={{ height: `${progress}%` }}
            />
            <div className="absolute inset-0 grid place-items-center text-white">
              <div className="text-center">
                <p className="serif text-3xl text-white drop-shadow">{progress}%</p>
                <p className="text-xs uppercase tracking-widest mt-1 text-white/80">
                  Uploading
                </p>
              </div>
            </div>
          </>
        )}

        {!uploading && display && (
          <span className="absolute bottom-3 right-3 glass-dark text-white rounded-full px-3 py-1 text-xs opacity-0 group-hover:opacity-100 transition">
            Change cover
          </span>
        )}
      </button>
    </>
  );
}
