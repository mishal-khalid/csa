"use client";

import { useRef } from "react";

// One card at a time (a question, a drill movement, a command). Dhivehi reads right to left, so the
// next card lies to the left: it slides in from there, and a swipe to the right brings it (only up
// to the first card not yet scored). A swipe to the left goes back, to change a score.
export default function Deck({ index, direction, onBack, onForward, children }) {
  const start = useRef(null);

  const touchStart = (e) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
  };
  const touchEnd = (e) => {
    if (!start.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;
    start.current = null;
    // a clear sideways swipe, not a scroll
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) onBack?.();
    else onForward?.();
  };

  return (
    <div onTouchStart={touchStart} onTouchEnd={touchEnd} className="mt-7 overflow-x-clip">
      <div key={index} className={direction === "back" ? "enter-back" : "enter-next"}>
        {children}
      </div>
    </div>
  );
}
