"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { addGalleryItem } from "@/lib/actions/gallery";

type Status = "idle" | "uploading" | "done" | "error";

const EXT_KIND: Record<string, "image" | "video"> = {
  jpg: "image", jpeg: "image", png: "image", webp: "image",
  mp4: "video", mov: "video", webm: "video",
};

export function GalleryUploadButton({ slug }: { slug: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const kind = EXT_KIND[ext];
    if (!kind) return;

    setStatus("uploading");
    try {
      const res = await fetch("/api/media/sign-gallery-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ext, slug }),
      });
      if (!res.ok) throw new Error();
      const { path, signedUrl } = await res.json();

      await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      const result = await addGalleryItem(slug, { path, caption: "", kind });
      if (result.error) throw new Error(result.error);

      setStatus("done");
      router.refresh();
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
    e.target.value = "";
  }

  return (
    <>
      <input ref={ref} type="file" accept="image/*,video/*" className="hidden" onChange={onChange} />
      <button
        onClick={() => ref.current?.click()}
        disabled={status === "uploading"}
        className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--accent)] hover:opacity-70 transition disabled:opacity-50"
      >
        {status === "uploading" ? (
          <Loader2 className="size-3 animate-spin" />
        ) : status === "done" ? (
          <Check className="size-3" />
        ) : (
          <Camera className="size-3" />
        )}
        {status === "done" ? "Added!" : status === "error" ? "Failed" : "Add photo"}
      </button>
    </>
  );
}
