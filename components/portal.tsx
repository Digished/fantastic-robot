"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders children into document.body. Needed for full-screen overlays that
 * would otherwise be trapped by an ancestor's containing block — e.g. a
 * sticky header with `backdrop-blur`, whose backdrop-filter makes `fixed`
 * descendants position relative to the header instead of the viewport.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
