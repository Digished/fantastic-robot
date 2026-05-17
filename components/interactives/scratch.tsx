"use client";

import { useEffect, useRef, useState } from "react";
import type { InteractiveProps } from "./types";
import { Revealed } from "./revealed";

const REVEAL_THRESHOLD = 0.42;

export function ScratchInteractive({
  body, mediaKind, mediaPath, authorName, onRevealed, surface = "dark",
}: InteractiveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const subClass = surface === "dark" ? "text-white/70" : "text-ink/60";

  useEffect(() => {
    const cvs = canvasRef.current;
    const wrap = wrapperRef.current;
    if (!cvs || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    cvs.width = rect.width * 2; cvs.height = rect.height * 2;
    cvs.style.width = `${rect.width}px`; cvs.style.height = `${rect.height}px`;
    const ctx = cvs.getContext("2d")!;
    ctx.scale(2, 2);
    const g = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    g.addColorStop(0, "#C0C0C0"); g.addColorStop(0.5, "#9E9E9E"); g.addColorStop(1, "#C0C0C0");
    ctx.fillStyle = g; ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.font = "600 14px system-ui"; ctx.fillStyle = "#5b5b5b"; ctx.textAlign = "center";
    ctx.fillText("SCRATCH TO REVEAL", rect.width / 2, rect.height / 2);
  }, []);

  function pt(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function checkReveal() {
    const cvs = canvasRef.current; if (!cvs) return;
    const ctx = cvs.getContext("2d")!;
    const { width, height } = cvs;
    const img = ctx.getImageData(0, 0, width, height).data;
    let clear = 0;
    for (let i = 3; i < img.length; i += 4 * 32) { // sample 1/32 alpha bytes
      if (img[i] < 32) clear++;
    }
    const ratio = clear / (img.length / (4 * 32));
    if (ratio > REVEAL_THRESHOLD) { setRevealed(true); onRevealed?.(); }
  }

  function down(e: React.PointerEvent) {
    drawingRef.current = true; lastRef.current = pt(e);
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pt(e); const l = lastRef.current!;
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = 36; ctx.lineCap = "round"; ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    lastRef.current = p;
  }
  function up() {
    drawingRef.current = false; lastRef.current = null;
    if (!revealed) checkReveal();
  }

  return (
    <div className="w-full flex flex-col items-center px-4 select-none">
      <div ref={wrapperRef} className="relative w-72 h-72 rounded-2xl shadow-card overflow-hidden bg-white">
        <div className="absolute inset-0 p-4 grid place-items-center">
          <Revealed body={body} mediaKind={mediaKind} mediaPath={mediaPath} authorName={authorName} surface="light" />
        </div>
        {!revealed && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 touch-none"
            onPointerDown={down} onPointerMove={move}
            onPointerUp={up} onPointerCancel={up}
          />
        )}
      </div>
      <p className={`mt-6 text-sm uppercase tracking-[0.3em] ${subClass}`}>
        {revealed ? "Revealed" : "Scratch with your finger"}
      </p>
    </div>
  );
}
