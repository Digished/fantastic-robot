// Thin wrapper around MediaRecorder with a hard cap so audio/video can't
// exceed our storage budget even if the user keeps the tab open.

export type RecKind = "audio" | "video";

export async function startRecording(kind: RecKind, maxMs: number) {
  const stream = await navigator.mediaDevices.getUserMedia(
    kind === "audio"
      ? { audio: true }
      : {
          audio: true,
          video: { width: { ideal: 720 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
        },
  );

  const mime = preferredMime(kind);
  const bitsPerSecond = kind === "audio" ? 32_000 : 600_000;
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, bitsPerSecond } : { bitsPerSecond });
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const start = performance.now();
  rec.start();
  const stopper = setTimeout(() => rec.state === "recording" && rec.stop(), maxMs);

  return {
    stream,
    rec,
    stop: () =>
      new Promise<{ blob: Blob; durationMs: number; mime: string }>((resolve) => {
        rec.onstop = () => {
          clearTimeout(stopper);
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, { type: rec.mimeType || mime || "" });
          resolve({ blob, durationMs: Math.round(performance.now() - start), mime: rec.mimeType });
        };
        if (rec.state === "recording") rec.stop();
      }),
  };
}

function preferredMime(kind: RecKind): string | undefined {
  const candidates =
    kind === "audio"
      ? ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
      : ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return undefined;
}

export function extFromMime(mime: string): "webm" | "mp4" | "m4a" | "ogg" {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("m4a")) return "m4a";
  return "webm";
}
