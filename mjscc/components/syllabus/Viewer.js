"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";

// A document shown the way Chrome's own PDF viewer shows one (the user's ask): a dark toolbar with
// the title, the page number and the zoom, over grey with the pages stacked down the middle. There
// is no download or print button, and no PDF behind it: the pages are pictures, which can't be
// dragged out, long-pressed or right-clicked to save, and print as blank. (A screenshot can't be
// stopped.)
//
// Zooming works like a PDF viewer's too: pinch (or a trackpad pinch, or Ctrl/⌘ + scroll) zooms the
// document around the fingers while the toolbar stays put, one finger slides between pages and
// moves around a zoomed one, and a double tap zooms in there (and back out).

// an A4 page's width at 100%, as Chrome shows it, and Chrome's zoom steps (25%–400%)
const ACTUAL_WIDTH = 794;
const STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];
const MIN = STEPS[0];
const MAX = STEPS.at(-1);
const TOOLBAR = 56;
const GUTTER = 16;

const clamp = (z) => Math.min(MAX, Math.max(MIN, z));
// as wide as fits the window, up to 100%
const fitWidth = () => Math.min(1, (window.innerWidth - GUTTER * 2) / ACTUAL_WIDTH);

export default function Viewer({ title, pages, ratio }) {
  const [zoom, setZoom] = useState(null);
  const [current, setCurrent] = useState(1);
  const [typed, setTyped] = useState(null);
  const sheets = useRef([]);
  // The pages scroll in a box of their own under the toolbar: the site runs right to left for the
  // evaluation, and a right-to-left page can't scroll towards the right, where a zoomed page grows.
  const scroller = useRef(null);
  const column = useRef(null);
  const zoomNow = useRef(null);
  // A point on a page that should end up under a point of the window once the zoom has changed
  // ({ page, fx, fy } as fractions of the page, x, y in the window): the fingers' spot, or the top
  // of the window for the toolbar's buttons.
  const anchor = useRef(null);
  // a pinch in progress: the zoom it started from, how far it's scaled, and where
  const gesture = useRef(null);

  const width = Math.round(ACTUAL_WIDTH * (zoom ?? 1));
  const height = Math.round(width * ratio);

  useEffect(() => {
    setZoom(fitWidth());
  }, []);
  useEffect(() => {
    zoomNow.current = zoom;
  }, [zoom]);

  // the page under a point of the window, and where on it
  const spotAt = useCallback((x, y) => {
    let page = 0;
    let nearest = Infinity;
    sheets.current.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const off = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
      if (off < nearest) [nearest, page] = [off, i];
    });
    const r = sheets.current[page].getBoundingClientRect();
    return {
      page: page + 1,
      fx: (x - r.left) / r.width,
      fy: (y - r.top) / r.height,
      x,
      y,
    };
  }, []);

  // scrolls so the anchored spot is back under its point of the window
  const settle = useCallback((spot) => {
    const r = sheets.current[spot.page - 1].getBoundingClientRect();
    const box = scroller.current;
    box.scrollTo({
      left: box.scrollLeft + r.left + spot.fx * r.width - spot.x,
      top: box.scrollTop + r.top + spot.fy * r.height - spot.y,
      behavior: "instant",
    });
  }, []);

  const zoomTo = useCallback((next, spot) => {
    anchor.current = spot;
    setZoom(clamp(next));
  }, []);

  // after a zoom: the pinch's stand-in scaling comes off and the spot goes back under the fingers,
  // both before the screen is drawn
  useLayoutEffect(() => {
    if (column.current) column.current.style.transform = "";
    const spot = anchor.current;
    anchor.current = null;
    if (spot) settle(spot);
  }, [zoom, settle]);

  // --- pinching: while the fingers move, the pages are only scaled on screen (cheap and smooth);
  // when they lift, the real zoom takes over at that size ---

  const pinchStart = useCallback(
    (x, y) => {
      const col = column.current.getBoundingClientRect();
      column.current.style.transformOrigin = `${x - col.left}px ${y - col.top}px`;
      gesture.current = {
        from: zoomNow.current,
        scale: 1,
        start: { x, y },
        at: { x, y },
        spot: spotAt(x, y),
      };
    },
    [spotAt],
  );

  const pinchMove = useCallback((factor, x, y) => {
    const g = gesture.current;
    g.scale = clamp(g.from * factor) / g.from;
    g.at = { x, y };
    column.current.style.transform = `translate(${x - g.start.x}px, ${y - g.start.y}px) scale(${g.scale})`;
  }, []);

  const pinchEnd = useCallback(() => {
    const g = gesture.current;
    gesture.current = null;
    const spot = { ...g.spot, x: g.at.x, y: g.at.y };
    if (Math.abs(g.scale - 1) < 0.005) {
      // fingers moved but didn't pinch: just a move
      column.current.style.transform = "";
      settle(spot);
    } else {
      zoomTo(g.from * g.scale, spot);
    }
  }, [settle, zoomTo]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const two = (t) => ({
      x: (t[0].clientX + t[1].clientX) / 2,
      y: (t[0].clientY + t[1].clientY) / 2,
      d: Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY),
    });
    let pinch = null;
    let tap = null;
    let lastTap = null;

    const start = (e) => {
      if (e.touches.length === 2) {
        pinch = two(e.touches);
        tap = null;
        pinchStart(pinch.x, pinch.y);
      } else if (e.touches.length === 1) {
        tap = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          t: e.timeStamp,
        };
      }
    };
    const move = (e) => {
      if (pinch && e.touches.length === 2) {
        e.preventDefault();
        const now = two(e.touches);
        pinchMove(now.d / pinch.d, now.x, now.y);
      } else if (tap && Math.hypot(e.touches[0].clientX - tap.x, e.touches[0].clientY - tap.y) > 10) {
        tap = null;
      }
    };
    const end = (e) => {
      if (pinch && e.touches.length < 2) {
        pinch = null;
        pinchEnd();
        return;
      }
      if (!tap || e.timeStamp - tap.t > 300) return;
      // a double tap: zoom in there, or back to the window's width
      if (lastTap && e.timeStamp - lastTap.t < 350 && Math.hypot(tap.x - lastTap.x, tap.y - lastTap.y) < 30) {
        const fit = fitWidth();
        zoomTo(zoomNow.current > fit * 1.4 ? fit : fit * 2.5, spotAt(tap.x, tap.y));
        lastTap = null;
      } else {
        lastTap = tap;
      }
      tap = null;
    };

    // a trackpad pinch (which browsers send as Ctrl + scroll) or Ctrl/⌘ + scroll
    let wheel = null;
    let wheelDone = 0;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if (!gesture.current) {
        pinchStart(e.clientX, e.clientY);
        wheel = 1;
      }
      wheel *= Math.exp(-e.deltaY * 0.01);
      pinchMove(wheel, e.clientX, e.clientY);
      clearTimeout(wheelDone);
      wheelDone = setTimeout(() => gesture.current && pinchEnd(), 160);
    };
    // Safari's own pinch would zoom the whole page, toolbar and all
    const noSafariZoom = (e) => e.preventDefault();

    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    window.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("gesturestart", noSafariZoom);
    document.addEventListener("gesturechange", noSafariZoom);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
      window.removeEventListener("wheel", onWheel);
      document.removeEventListener("gesturestart", noSafariZoom);
      document.removeEventListener("gesturechange", noSafariZoom);
      clearTimeout(wheelDone);
    };
  }, [pinchStart, pinchMove, pinchEnd, zoomTo, spotAt]);

  // the page number follows the page that fills the top of the window (14 positions per scroll is cheap)
  useEffect(() => {
    const track = () => {
      const line = TOOLBAR + window.innerHeight * 0.3;
      let page = 1;
      sheets.current.forEach((el, i) => el && el.getBoundingClientRect().top <= line && (page = i + 1));
      setCurrent(page);
    };
    const box = scroller.current;
    box.addEventListener("scroll", track, { passive: true });
    return () => box.removeEventListener("scroll", track);
  }, []);

  // no saving the page or printing it from the keyboard
  useEffect(() => {
    const block = (e) => (e.metaKey || e.ctrlKey) && ["s", "p"].includes(e.key.toLowerCase()) && e.preventDefault();
    window.addEventListener("keydown", block);
    return () => window.removeEventListener("keydown", block);
  }, []);

  // the toolbar's buttons zoom around the top middle of the window
  const zoomAtTop = (next) => zoomTo(next, spotAt(window.innerWidth / 2, TOOLBAR + 1));
  const zoomOut = () => zoomAtTop([...STEPS].reverse().find((s) => s < zoom - 0.001) ?? MIN);
  const zoomIn = () => zoomAtTop(STEPS.find((s) => s > zoom + 0.001) ?? MAX);

  function goTo(n) {
    const page = Math.min(pages.length, Math.max(1, Math.round(n) || current));
    const el = sheets.current[page - 1];
    const box = scroller.current;
    if (el)
      box.scrollTo({
        top: box.scrollTop + el.getBoundingClientRect().top - TOOLBAR - 8,
        behavior: "instant",
      });
    setTyped(null);
  }

  return (
    <div
      dir="ltr"
      data-no-print
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 bg-[#525659] font-[system-ui,sans-serif] select-none"
    >
      <header className="absolute inset-x-0 top-0 z-10 flex h-14 items-center gap-3 bg-[#323639] px-4 text-[14px] text-white shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
        <h1 className="min-w-0 flex-1 truncate text-[15px]">{title}</h1>

        <label className="flex shrink-0 items-center gap-1.5">
          <span className="sr-only">Page</span>
          <input
            inputMode="numeric"
            value={typed ?? current}
            onChange={(e) => setTyped(e.target.value.replace(/\D/g, ""))}
            onFocus={(e) => e.target.select()}
            onBlur={() => setTyped(null)}
            onKeyDown={(e) => e.key === "Enter" && goTo(Number(typed))}
            className="h-7 w-9 rounded-sm bg-[#191b1c] text-center outline-none select-text focus:ring-1 focus:ring-white/40"
          />
          <span className="text-white/80">/ {pages.length}</span>
        </label>

        <span aria-hidden className="h-5 w-px shrink-0 bg-white/20" />

        <div className="flex shrink-0 items-center">
          <ToolButton label="Zoom out" onClick={zoomOut} disabled={!zoom || zoom <= MIN}>
            <path d="M5 12h14" />
          </ToolButton>
          <span className="w-12 text-center tabular-nums">{zoom ? `${Math.round(zoom * 100)}%` : ""}</span>
          <ToolButton label="Zoom in" onClick={zoomIn} disabled={!zoom || zoom >= MAX}>
            <path d="M5 12h14M12 5v14" />
          </ToolButton>
          <ToolButton label="Fit to width" onClick={() => zoomAtTop(fitWidth())} className="max-sm:hidden">
            <path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />
          </ToolButton>
        </div>
      </header>

      <main ref={scroller} className="absolute inset-x-0 top-14 bottom-0 touch-pan-x touch-pan-y overflow-auto overscroll-contain">
        {/* (clipped, so a pinch's stand-in scaling doesn't stretch the scrolling area mid-gesture) */}
        <div className="w-max min-w-full overflow-hidden">
          <div
            ref={column}
            className="flex flex-col items-center gap-2 py-4"
            style={{
              paddingInline: GUTTER,
              visibility: zoom ? "visible" : "hidden",
            }}
          >
            {pages.map((src, i) => (
              <div key={i} ref={(el) => (sheets.current[i] = el)} className="bg-white shadow-[0_2px_6px_rgba(0,0,0,0.45)]" style={{ width, height }}>
                {/* not until the window's been measured, or a phone would start on the desktop size */}
                {zoom && (
                  <Image
                    src={src}
                    alt={`Page ${i + 1}`}
                    width={2400}
                    height={Math.round(2400 * ratio)}
                    sizes={`${width}px`}
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : "auto"}
                    draggable={false}
                    className="pointer-events-none size-full [-webkit-touch-callout:none] [-webkit-user-drag:none]"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function ToolButton({ label, onClick, disabled, className = "", children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid size-9 place-items-center rounded-full hover:bg-white/10 active:bg-white/20 disabled:opacity-40 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}
