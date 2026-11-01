"use client";

import { useRef, useState } from "react";

// Moving through a part's cards. After a score the chosen square shows for a moment, then the next
// card slides in, or, after the last, `onEnd` runs (the user's pick: the next card comes by itself).
export function useCards({ total, first, isScored, onEnd }) {
  const [index, setIndex] = useState(first);
  const [direction, setDirection] = useState("next");
  const moving = useRef(false);

  return {
    index,
    direction,
    back() {
      if (index === 0) return;
      setDirection("back");
      setIndex(index - 1);
    },
    // only as far as the first card without a score
    forward() {
      if (index + 1 >= total || !isScored(index)) return;
      setDirection("next");
      setIndex(index + 1);
    },
    advance() {
      if (moving.current) return;
      moving.current = true;
      setTimeout(() => {
        moving.current = false;
        if (index + 1 < total) {
          setDirection("next");
          setIndex(index + 1);
        } else {
          onEnd?.();
        }
      }, 280);
    },
  };
}

// the card to start on: the first without a score, or the first if they all have one
export function firstOpen(total, isScored) {
  for (let i = 0; i < total; i++) if (!isScored(i)) return i;
  return 0;
}

// a student's number from the address, or null
export function studentNumber(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 6 ? n : null;
}
