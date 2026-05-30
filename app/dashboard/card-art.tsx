// A subtle animated background for dashboard cards: a few blurred blobs that
// gently drift. Pure CSS (keyframe `cardBlob`), and the variant is picked
// deterministically from a seed so it's stable across renders (no hydration
// mismatch) while still varying card-to-card.

type Blob = { left: string; top: string; size: number; color: string; opacity: number; delay: number };

const ACCENT = "var(--accent)";
const VARIANTS: Blob[][] = [
  [
    { left: "-8%", top: "10%", size: 150, color: ACCENT, opacity: 0.45, delay: 0 },
    { left: "55%", top: "-15%", size: 180, color: "#ffffff", opacity: 0.35, delay: 1.4 },
    { left: "35%", top: "55%", size: 130, color: ACCENT, opacity: 0.35, delay: 0.7 },
  ],
  [
    { left: "60%", top: "20%", size: 200, color: ACCENT, opacity: 0.4, delay: 0.3 },
    { left: "-10%", top: "45%", size: 150, color: "#ffffff", opacity: 0.3, delay: 1.1 },
    { left: "20%", top: "-12%", size: 120, color: ACCENT, opacity: 0.3, delay: 1.8 },
  ],
  [
    { left: "10%", top: "-10%", size: 170, color: "#ffffff", opacity: 0.32, delay: 0.5 },
    { left: "65%", top: "55%", size: 160, color: ACCENT, opacity: 0.42, delay: 0 },
    { left: "40%", top: "25%", size: 110, color: ACCENT, opacity: 0.3, delay: 1.3 },
  ],
  [
    { left: "-5%", top: "55%", size: 160, color: ACCENT, opacity: 0.4, delay: 0.9 },
    { left: "50%", top: "5%", size: 190, color: "#ffffff", opacity: 0.34, delay: 0.2 },
    { left: "75%", top: "60%", size: 120, color: ACCENT, opacity: 0.32, delay: 1.6 },
  ],
];

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

export function CardArt({ seed }: { seed: string }) {
  const blobs = VARIANTS[hash(seed) % VARIANTS.length];
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {blobs.map((b, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: b.left,
            top: b.top,
            width: b.size,
            height: b.size,
            background: b.color,
            opacity: b.opacity,
            filter: "blur(34px)",
            animation: `cardBlob ${7 + i * 2}s ease-in-out ${b.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
