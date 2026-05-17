"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Play } from "lucide-react";

type GalleryItem = { path: string; caption: string; kind?: "image" | "video" };

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

export function GalleryStrip({ images, className }: { images: GalleryItem[]; className?: string }) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (images.length === 0) return null;

  function prev(e: React.MouseEvent) {
    e.stopPropagation();
    setLightbox((i) => (i !== null ? Math.max(0, i - 1) : null));
  }
  function next(e: React.MouseEvent) {
    e.stopPropagation();
    setLightbox((i) => (i !== null ? Math.min(images.length - 1, i + 1) : null));
  }

  const current = lightbox !== null ? images[lightbox] : null;

  return (
    <>
      {/* Thumbnail strip */}
      <div className={`flex gap-2 overflow-x-auto no-scrollbar py-0.5 ${className ?? ""}`}>
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setLightbox(i)}
            className="shrink-0 size-16 md:flex-1 md:h-20 rounded-xl md:rounded-2xl overflow-hidden shadow-ring hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label={img.caption || `Gallery item ${i + 1}`}
          >
            {img.kind === "video" ? (
              <div className="size-full bg-ink/80 grid place-items-center">
                <Play className="size-4 fill-current text-white" />
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={publicUrl(img.path)} alt={img.caption || ""} className="size-full object-cover" />
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && current && (
        <div
          className="fixed inset-0 z-[100] bg-black/92 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 size-11 rounded-full bg-white/10 text-white grid place-items-center z-10 hover:bg-white/20 transition"
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            aria-label="Close"
          >
            <X className="size-5" />
          </button>

          {lightbox > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white/10 text-white grid place-items-center z-10 hover:bg-white/20 transition"
              onClick={prev}
              aria-label="Previous"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}

          {lightbox < images.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white/10 text-white grid place-items-center z-10 hover:bg-white/20 transition"
              onClick={next}
              aria-label="Next"
            >
              <ChevronRight className="size-5" />
            </button>
          )}

          <div
            className="max-w-4xl max-h-[85vh] w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {current.kind === "video" ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                src={publicUrl(current.path)}
                className="max-h-[75vh] max-w-full mx-auto rounded-2xl shadow-2xl"
                autoPlay
                controls
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={publicUrl(current.path)}
                alt={current.caption || ""}
                className="max-h-[75vh] max-w-full mx-auto rounded-2xl shadow-2xl object-contain"
              />
            )}
            {current.caption && (
              <p className="mt-4 text-white/75 text-sm italic">{current.caption}</p>
            )}
            <p className="mt-2 text-white/35 text-xs tracking-widest">
              {lightbox + 1} / {images.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
