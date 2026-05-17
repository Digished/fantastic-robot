"use client";

// A handful of subtle sparkle motes drifting upward. Pure CSS, ~0 bundle cost.
export function Sparkles({ count = 8 }: { count?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const left = (i * 37) % 95 + 2;
        const size = 6 + (i % 3) * 4;
        const delay = (i * 0.7) % 4;
        const dur = 4 + (i % 3);
        return (
          <span
            key={i}
            className="sparkle"
            style={{
              left: `${left}%`,
              bottom: 0,
              width: size,
              height: size,
              background: "white",
              borderRadius: 999,
              filter: "blur(0.4px)",
              boxShadow: "0 0 8px rgba(255,255,255,.7)",
              animationDelay: `${delay}s`,
              animationDuration: `${dur}s`,
            }}
          />
        );
      })}
    </div>
  );
}
