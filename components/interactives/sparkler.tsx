"use client";

import { useEffect, useRef, useState } from "react";
import type { InteractiveProps } from "./types";
import { Revealed } from "./revealed";

const REVEAL_DISTANCE = 1600; // pixels of trail drawn before reveal

export function SparklerInteractive({
  body, mediaKind, mediaPath, authorName, onRevealed, surface = "dark",
}: InteractiveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const totalRef = useRef(0);
  const lastRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const drawingRef = useRef(false);
  const subClass = surface === "dark" ? "text-white/70" : "text-ink/60";

  useEffect(() => {
    const cvs = canvasRef.current; const wrap = wrapperRef.current;
    if (!cvs || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    cvs.width = rect.width * 2; cvs.height = rect.height * 2;
    cvs.style.width = `${rect.width}px`; cvs.style.height = `${rect.height}px`;
    const ctx = cvs.getContext("2d")!;
    ctx.scale(2, 2);

    // Slowly fade the trail so the canvas doesn't accumulate forever.
    let raf = 0;
    function fade() {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.018)";
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(fade);
    }
    raf = requestAnimationFrame(fade);
    return () => cancelAnimationFrame(raf);
  }, []);

  function pt(e: React.PointerEvent) {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function down(e: React.PointerEvent) {
    drawingRef.current = true;
    lastRef.current = { ...pt(e), t: performance.now() };
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!drawingRef.current) return;
    const p = pt(e); const l = lastRef.current!;
    const ctx = canvasRef.current!.getContext("2d")!;
    const dx = p.x - l.x; const dy = p.y - l.y;
    const dist = Math.hypot(dx, dy);
    totalRef.current += dist;

    // Bright trail
    ctx.strokeStyle = "rgba(255, 220, 130, 0.95)";
    ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.shadowColor = "rgba(255, 200, 80, 0.95)"; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.shadowBlur = 0;
    // Sparks
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "rgba(255, 240, 200, 0.9)";
      const a = Math.random() * Math.PI * 2; const r = Math.random() * 6;
      ctx.fillRect(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 1.5, 1.5);
    }

    lastRef.current = { ...p, t: performance.now() };
    if (totalRef.current > REVEAL_DISTANCE && !revealed) {
      setRevealed(true);
      onRevealed?.();
    }
  }
  function up() { drawingRef.current = false; lastRef.current = null; }

  return (
    <div className="w-full flex flex-col items-center px-4 select-none">
      <div ref={wrapperRef} className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden"
           style={{ background: "radial-gradient(circle at center, rgba(0,0,0,0.35), rgba(0,0,0,0.85))" }}>
        {revealed ? (
          <div className="absolute inset-0 grid place-items-center p-5 fade-up">
            <Revealed body={body} mediaKind={mediaKind} mediaPath={mediaPath} authorName={authorName} surface="dark" />
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 touch-none"
            onPointerDown={down} onPointerMove={move}
            onPointerUp={up} onPointerCancel={up}
          />
        )}
      </div>
      <p className={`mt-6 text-sm uppercase tracking-[0.3em] ${subClass}`}>
        {revealed ? "Beautiful" : "Drag to draw"}
      </p>
    </div>
  );
}
