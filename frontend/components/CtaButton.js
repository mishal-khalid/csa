"use client";

import { useState } from "react";
import Link from "next/link";
import FlyingArrow from "./navbar/FlyingArrow";

// hover behaviour is for mice only; touch and pen go through click
const isMouse = (e) => e.pointerType === "mouse";

// The site's main button: an arrow chip and a label in a glass pill. On hover a fill grows up from
// the bottom (black on light glass, white over a photo), the label rolls up to a copy in the opposite
// colour and the arrow flies through. Inside the nav it also follows the nav's `scrolled:` state
// (collapsing to the chip) and `photo:` state (smoky glass); elsewhere those never apply.
// className must set the display (e.g. "flex"), so callers can hide it at some sizes.
// With `newTab` it's a plain link that opens href in a new tab (e.g. a PDF in the browser's viewer).
// Addresses outside the site (e.g. mailto:) are plain links too. Without an href it's a submit
// button (e.g. for a form).
export default function CtaButton({ href, label, className = "flex", onPointerEnter, newTab = false }) {
  const [arrowFlights, setArrowFlights] = useState(0);
  const Tag = !href ? "button" : newTab || !href.startsWith("/") ? "a" : Link;

  return (
    <Tag
      href={href}
      type={href ? undefined : "submit"}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noopener noreferrer" : undefined}
      onPointerEnter={(e) => {
        if (!isMouse(e)) return;
        onPointerEnter?.(e);
        setArrowFlights((n) => n + 1);
      }}
      onPointerLeave={(e) => isMouse(e) && setArrowFlights((n) => n + 1)}
      className={`group/cta relative isolate h-12 w-fit shrink-0 items-center overflow-hidden rounded-full bg-white/70 p-1.5 pr-5 text-ink ring-1 ring-black/5 transition-all duration-700 ease-soft scrolled:pr-1.5 photo:bg-white/10 photo:text-white photo:ring-white/20 ${className}`}
    >
      {/* the fill: a circle centred on the bottom edge that scales up on hover, and fades fast on leave */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-full -z-10 aspect-square w-[250%] -translate-1/2 scale-0 rounded-full bg-ink opacity-0 [transition:opacity_150ms,scale_0s_150ms] group-hover/cta:scale-100 group-hover/cta:opacity-100 group-hover/cta:[transition:scale_500ms_var(--ease-soft)] group-focus-visible/cta:scale-100 group-focus-visible/cta:opacity-100 group-focus-visible/cta:[transition:scale_500ms_var(--ease-soft)] photo:bg-white"
      />
      <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-ink/[0.06] transition-colors duration-300 ease-soft group-hover/cta:bg-white/15 group-hover/cta:text-white photo:bg-white/15 photo:group-hover/cta:bg-ink/[0.06] photo:group-hover/cta:text-ink">
        <FlyingArrow flights={arrowFlights} />
      </span>
      {/* clips sideways only (for the scroll collapse), so the rolling copies are clipped by the pill */}
      <span className="relative ml-3 max-w-32 overflow-x-clip whitespace-nowrap text-[15px] font-medium transition-all duration-700 ease-soft scrolled:ml-0 scrolled:max-w-0 scrolled:opacity-0">
        <span className="block transition-transform duration-500 ease-soft group-hover/cta:-translate-y-[180%] group-focus-visible/cta:-translate-y-[180%]">
          {label}
          {newTab && <span className="sr-only"> (opens in a new tab)</span>}
        </span>
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 block translate-y-[180%] text-white transition-transform duration-500 ease-soft group-hover/cta:translate-y-0 group-focus-visible/cta:translate-y-0 photo:text-ink"
        >
          {label}
        </span>
      </span>
    </Tag>
  );
}
