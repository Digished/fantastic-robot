"use client";

import { useEffect, useState } from "react";
import type { InteractiveProps } from "./types";
import { Revealed } from "./revealed";

export function PolaroidInteractive({
  body, mediaKind, mediaPath, authorName, onRevealed, surface = "dark",
}: InteractiveProps) {
  const [stage, setStage] = useState<"idle" | "developing" | "done">("idle");
  const subClass = surface === "dark" ? "text-white/70" : "text-ink/60";

  useEffect(() => {
    if (stage !== "developing") return;
    const t = setTimeout(() => {
      setStage("done");
      onRevealed?.();
    }, 2400);
    return () => clearTimeout(t);
  }, [stage, onRevealed]);

  return (
    <div className="w-full flex flex-col items-center px-4 select-none">
      <button
        onClick={() => { if (stage === "idle") setStage("developing"); }}
        disabled={stage !== "idle"}
        className="relative w-72 bg-white p-3 pb-12 rounded-md shadow-card active:scale-[0.98] transition-transform"
        style={{ transform: "rotate(-1.5deg)" }}
      >
        <div className="relative w-full aspect-square overflow-hidden bg-[#1a1a1a]">
          {stage === "idle" && (
            <div className="absolute inset-0 grid place-items-center text-white/40 text-xs uppercase tracking-widest">
              Tap to develop
            </div>
          )}
          {(stage === "developing" || stage === "done") && (
            <div
              className="absolute inset-0"
              style={{
                animation: "develop 2.4s ease forwards",
              }}
            >
              {/* Content underneath emerges */}
              <div className="absolute inset-0 grid place-items-center p-3">
                {mediaKind === "image" && mediaPath ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={publicUrl(mediaPath)} alt="" className="size-full object-cover" />
                ) : body ? (
                  <p className="serif text-white text-lg leading-snug text-center">{body}</p>
                ) : (
                  <p className="text-white/60 text-xs uppercase tracking-widest">A memory for you</p>
                )}
              </div>
            </div>
          )}
        </div>
        <p className="absolute left-0 right-0 bottom-3 text-center serif text-ink/70 text-sm">
          — {authorName}
        </p>
      </button>

      {stage === "done" && (mediaKind === "video" || mediaKind === "audio" || (body && mediaKind === "image")) && (
        <div className="w-full mt-6 fade-up">
          <Revealed body={mediaKind === "image" ? body : body} mediaKind={mediaKind === "image" ? "none" : mediaKind} mediaPath={mediaKind === "image" ? null : mediaPath} authorName={authorName} surface={surface} />
        </div>
      )}

      <p className={`mt-6 text-sm uppercase tracking-[0.3em] ${subClass}`}>
        {stage === "idle" ? "Tap the photo" : stage === "developing" ? "Developing…" : "There you are"}
      </p>

      <style>{`
        @keyframes develop {
          0%   { filter: brightness(0.2) saturate(0.4) blur(6px); opacity: 0.4; }
          50%  { filter: brightness(0.7) saturate(0.7) blur(3px); opacity: 0.8; }
          100% { filter: brightness(1)   saturate(1)   blur(0px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}
