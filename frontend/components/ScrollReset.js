"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";

// Opening a new page starts it at the top. Lenis keeps its own record of the scroll position, so
// without this a new page could open as far down as the last one was scrolled. Back and forward
// (the browser's own history) are left alone, so those pages return to where they were, and so are
// links to an anchor on the page (#section).
export default function ScrollReset() {
  const pathname = usePathname();
  const lenis = useLenis();
  const firstRender = useRef(true);
  const fromHistory = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      fromHistory.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    // the first page load keeps whatever the browser restores (e.g. on refresh)
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (fromHistory.current) {
      fromHistory.current = false;
      return;
    }
    if (window.location.hash) return;

    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
    // only a change of page should reset; lenis is read at that moment
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
