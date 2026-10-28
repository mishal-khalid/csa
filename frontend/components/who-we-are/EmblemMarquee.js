"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { bodies } from "./bodies";

// drift speed in px per second, and the slower speed while the pointer is over the strip
const SPEED = 40;
const HOVER_SPEED = 16;

// Emblems drift left in an endless loop. Hovering the strip eases the drift down so an emblem
// can be hovered for its name. The list is rendered twice and the track jumps back by one
// list's width each lap, so the loop has no visible seam.
export default function EmblemMarquee() {
  const reduceMotion = useReducedMotion();
  const stripRef = useRef(null);
  const trackRef = useRef(null);
  const inView = useInView(stripRef);
  const x = useMotionValue(0);
  // the speed springs between the two values, so slowing down and speeding up are gradual
  const speed = useSpring(SPEED, { stiffness: 60, damping: 20 });

  useAnimationFrame((_, delta) => {
    if (reduceMotion || !inView) return;
    const lap = trackRef.current.offsetWidth / 2;
    let next = x.get() - (speed.get() * delta) / 1000;
    if (next <= -lap) next += lap;
    x.set(next);
  });

  return (
    <div
      ref={stripRef}
      onPointerEnter={() => speed.set(HOVER_SPEED)}
      onPointerLeave={() => speed.set(SPEED)}
      className="relative overflow-hidden"
    >
      <motion.ul ref={trackRef} aria-label="Independent bodies" style={{ x }} className="flex w-max items-center">
        {[...bodies, ...bodies].map((body, i) => {
          const copy = i >= bodies.length;
          return (
            <li
              key={i}
              aria-hidden={copy || undefined}
              className="group/emblem relative shrink-0 px-7 py-12"
            >
              <Image
                src={body.src}
                alt={copy ? "" : body.name}
                width={body.width}
                height={body.height}
                className="h-16 w-auto"
              />
              {/* the body's full name, shown above the emblem on hover */}
              <span className="pointer-events-none absolute left-1/2 top-2.5 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-full bg-ink px-3 py-1 text-[13px] font-medium text-white opacity-0 transition duration-300 ease-soft group-hover/emblem:translate-y-0 group-hover/emblem:opacity-100">
                {body.name}
              </span>
            </li>
          );
        })}
      </motion.ul>

      {/* frosted glass over the right half: emblems drift out from under it and come into focus */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-1/2 border-l border-ink/10 bg-white/40 backdrop-blur-md"
      />
    </div>
  );
}
