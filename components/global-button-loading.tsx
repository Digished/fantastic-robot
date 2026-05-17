"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Global "loading" affordance for every <button> and <a> on the platform.
//
// On click we add `.btn-is-loading` to the target. CSS draws a spinner over
// the button so the user gets instant feedback that *something* is happening.
// The class is cleared:
//   • when the URL changes (navigation completed), or
//   • when the same element is clicked again (handles toggle buttons), or
//   • after a 6s safety timeout (so a broken handler never permanently
//     "stickies" the button).
//
// Buttons can opt out with data-no-loading="true" — useful for inert toggles
// (volume, pause, theme swatch, file inputs that open a picker, etc).
export function GlobalButtonLoading() {
  const pathname = usePathname();
  const search = useSearchParams();

  // Clear all loading states on every successful navigation.
  useEffect(() => {
    document.querySelectorAll(".btn-is-loading").forEach((el) => {
      el.classList.remove("btn-is-loading");
    });
  }, [pathname, search]);

  useEffect(() => {
    const timers = new Map<Element, number>();

    function clear(el: Element) {
      el.classList.remove("btn-is-loading");
      const t = timers.get(el);
      if (t) { window.clearTimeout(t); timers.delete(el); }
    }

    function onClick(e: MouseEvent) {
      const path = e.composedPath();
      let el: HTMLElement | null = null;
      for (const node of path) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.tagName === "BUTTON" || (node.tagName === "A" && node.hasAttribute("href"))) {
          el = node;
          break;
        }
      }
      if (!el) return;

      // Skip opt-outs and modifier-key navigations (cmd-click etc → new tab).
      if (el.dataset.noLoading === "true") return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (el.tagName === "BUTTON" && (el as HTMLButtonElement).disabled) return;
      if (el.tagName === "A") {
        const a = el as HTMLAnchorElement;
        if (a.target === "_blank" || a.hasAttribute("download")) return;
      }

      // Toggle off if already loading (e.g. pause button pressed again).
      if (el.classList.contains("btn-is-loading")) { clear(el); return; }

      // Submit buttons and navigation links may wait on the server / a route
      // change, so give them more headroom. Plain onClick toggles should clear
      // fast — assume their handler is synchronous-ish.
      const isLink = el.tagName === "A";
      const isSubmit = el.tagName === "BUTTON" && (el as HTMLButtonElement).type === "submit";
      const timeoutMs = isLink || isSubmit ? 6000 : 1800;

      el.classList.add("btn-is-loading");
      const t = window.setTimeout(() => clear(el!), timeoutMs);
      timers.set(el, t);
    }

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return null;
}
