"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { usePageReady } from "@/components/loader/ready";

// Counts up from 0 to `value` the first time it's in view with the loading screen gone, then stays put.
// The server renders the final value, so the figure reads correctly before (or without) JavaScript;
// it's reset to 0 on mount, while the loading screen still covers the page.
export default function CountUp({ value }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const ready = usePageReady();
  const reduceMotion = useReducedMotion();
  const count = useMotionValue(value);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    if (reduceMotion) {
      count.set(value);
      return;
    }
    if (!inView || !ready) {
      count.set(0);
      return;
    }
    const controls = animate(count, value, { duration: 1.6, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [count, inView, ready, reduceMotion, value]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}
