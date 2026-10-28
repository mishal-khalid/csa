"use client";

import { useSyncExternalStore } from "react";
import { ReactLenis } from "lenis/react";
import "lenis/dist/lenis.css";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribe(callback) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

// Inertia (Lenis) scrolling for the whole page, skipped for anyone who prefers reduced motion.
export default function SmoothScroll() {
  const reducedMotion = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true,
  );

  if (reducedMotion) return null;
  return <ReactLenis root options={{ lerp: 0.1, anchors: true }} />;
}
