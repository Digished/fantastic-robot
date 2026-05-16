"use client";

import { useEffect, useRef, useState } from "react";

export function AnimatedNaira({ kobo, className }: { kobo: number; className?: string }) {
  const [n, setN] = useState(0);
  const startRef = useRef<number | null>(null);
  const target = Math.max(0, Math.round(kobo / 100));

  useEffect(() => {
    let raf = 0;
    const dur = 900;
    const startVal = n;
    function tick(ts: number) {
      if (startRef.current == null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(startVal + (target - startVal) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    startRef.current = null;
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return <span className={className}>₦{n.toLocaleString("en-NG")}</span>;
}
