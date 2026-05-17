"use client";

import { Mic } from "lucide-react";
import type { MediaKind } from "./types";

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

/** Shared post-reveal content: optional media + body text + signature. */
export function Revealed({
  body, mediaKind, mediaPath, authorName, surface = "dark",
}: {
  body: string | null;
  mediaKind?: MediaKind;
  mediaPath?: string | null;
  authorName: string;
  surface?: "light" | "dark";
}) {
  const ink = surface === "dark" ? "text-white" : "text-ink";
  const sub = surface === "dark" ? "text-white/70" : "text-ink/60";

  return (
    <div className="w-full text-center">
      {mediaKind === "image" && mediaPath && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={publicUrl(mediaPath)} alt="" className="w-full max-h-[55vh] object-contain rounded-2xl shadow-card mb-5" />
      )}
      {mediaKind === "video" && mediaPath && (
        <video src={publicUrl(mediaPath)} controls autoPlay playsInline
               className="w-full max-h-[55vh] rounded-2xl shadow-card mb-5" />
      )}
      {mediaKind === "audio" && mediaPath && (
        <div className="rounded-3xl2 p-5 mb-5"
             style={{ background: surface === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,14,13,0.04)" }}>
          <Mic className={`size-8 mx-auto mb-3 ${surface === "dark" ? "text-white/70" : "text-[var(--accent)]"}`} />
          <audio src={publicUrl(mediaPath)} controls autoPlay className="w-full" />
        </div>
      )}
      {body && (
        <p className={`serif whitespace-pre-wrap ${ink} ${
          body.length < 80 ? "text-3xl leading-tight" : "text-xl leading-snug"
        }`}>{body}</p>
      )}
      <p className={`mt-7 text-[11px] uppercase tracking-[0.3em] ${sub}`}>— {authorName}</p>
    </div>
  );
}
