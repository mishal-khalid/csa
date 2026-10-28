"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { setPageReady } from "./ready";

// how long the screen takes to rise over a page, and to lift off one
const RISE_MS = 700;
const LIFT_MS = 900;
// the longest the screen stays up, in case an image never finishes loading
const MAX_WAIT_MS = 30000;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Resolves once every image on the page has loaded (and is decoded, so it shows at once), along
// with the fonts and anything else the browser counts as part of the page. Images further down the
// page normally wait until they're scrolled near; a copy of each is fetched now instead, so it
// comes from the browser's cache when it's needed. (The page's own images aren't touched: React
// may not have taken them over yet.)
function pageLoaded() {
  const images = [...document.images].filter((img) => !img.closest("#page-loader"));
  const windowLoaded = new Promise((resolve) => {
    if (document.readyState === "complete") resolve();
    else window.addEventListener("load", resolve, { once: true });
  });
  return Promise.all([
    windowLoaded,
    document.fonts.ready,
    ...images.map((img) => {
      if (img.loading === "lazy" && !img.complete) {
        const copy = new window.Image();
        copy.sizes = img.sizes;
        copy.srcset = img.srcset;
        copy.src = img.src;
        return copy.decode().catch(() => {});
      }
      const loaded = img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          });
      return loaded.then(() => img.decode().catch(() => {}));
    }),
  ]);
}

// The loading screen's behaviour. `push` opens a page (the router's).
function createLoader(screen, video, push) {
  // covering, rising (over a page being left), lifting, or gone
  let stage = screen.style.visibility === "hidden" ? "gone" : "covering";
  // the still insignia shows instead of the animation
  let still = false;
  // counts the pages the screen has covered, so only the latest one lifts it
  let visit = 0;
  let nextHref = null;

  // the page's own animations wait while the screen covers it (see globals.css and ready.js)
  function setLoading(loading) {
    document.documentElement.toggleAttribute("data-loading", loading);
    setPageReady(!loading);
  }

  // for anyone who prefers reduced motion, and when the video can't play (phones in low power mode
  // block it)
  function showStill() {
    still = true;
    video.pause();
    screen.dataset.still = "";
  }

  function play() {
    if (still) return;
    // an AbortError only means a pause() came first
    video.play().catch((error) => {
      if (error.name !== "AbortError") showStill();
    });
  }

  function playFromStart() {
    video.currentTime = 0;
    play();
  }

  // Slides the screen from one position to another; rejects if interrupted.
  function slide(from, to, duration) {
    screen.getAnimations().forEach((animation) => animation.cancel());
    const reduce = window.matchMedia(REDUCED_MOTION).matches;
    return screen.animate({ transform: [from, to] }, { duration: reduce ? 0 : duration, easing: EASE, fill: "forwards" })
      .finished;
  }

  // Covers the page: at once, or rising from the bottom over the page being left (from wherever
  // the screen is, if it was still lifting off).
  function cover(rise) {
    const from = stage === "gone" ? "translateY(100%)" : getComputedStyle(screen).transform;
    screen.style.visibility = "";
    video.pause();
    video.currentTime = 0;
    const covered = () => {
      stage = "covering";
      setLoading(true);
      playFromStart();
    };
    if (!rise) {
      screen.getAnimations().forEach((animation) => animation.cancel());
      covered();
      return Promise.resolve();
    }
    stage = "rising";
    return slide(from, "translateY(0)", RISE_MS).then(covered);
  }

  // Lifts the screen off the top, the insignia held where it got to; the page's animations start as
  // it goes.
  function lift() {
    stage = "lifting";
    video.pause();
    setLoading(false);
    slide("translateY(0)", "translateY(-100%)", LIFT_MS).then(
      () => {
        stage = "gone";
        screen.style.visibility = "hidden";
      },
      () => {},
    );
  }

  // A page (the first, or a new one) is in place: once its images are in, the screen lifts, wherever
  // the animation has got to. A page that arrived without the screen up (the browser's back and
  // forward buttons) is covered at once, before it shows.
  function arrive() {
    if (stage !== "covering") cover(false);
    const id = ++visit;
    Promise.race([pageLoaded(), wait(MAX_WAIT_MS)]).then(() => {
      if (id === visit) lift();
    });
  }

  // Raises the screen over the page being left, then opens the next page under it.
  function go(href) {
    nextHref = href;
    // already on its way up: it opens the latest link clicked
    if (stage === "rising") return;
    cover(true).then(
      () => {
        const id = visit;
        push(nextHref);
        // in case the page never arrives (the address didn't change after all)
        wait(MAX_WAIT_MS).then(() => {
          if (id === visit && stage === "covering") arrive();
        });
      },
      () => {},
    );
  }

  // A link to another page of the site raises the screen before the page changes. Links within the
  // page (#section), to other sites, or opening a new tab go as usual. This listens before Next's
  // links do, and preventing the click's default stops them navigating themselves.
  const onClick = (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
    if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
    e.preventDefault();
    go(url.pathname + url.search + url.hash);
  };

  // no scrolling the page underneath while the screen is up
  const block = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // the video has been playing by itself since the first paint; this catches it if it couldn't
  if (window.matchMedia(REDUCED_MOTION).matches || video.error) showStill();
  else play();
  video.addEventListener("error", showStill);
  screen.addEventListener("wheel", block, { passive: false });
  screen.addEventListener("touchmove", block, { passive: false });
  window.addEventListener("click", onClick, true);

  return {
    arrive,
    destroy() {
      visit++;
      video.removeEventListener("error", showStill);
      screen.removeEventListener("wheel", block);
      screen.removeEventListener("touchmove", block);
      window.removeEventListener("click", onClick, true);
    },
  };
}

// A white screen with the insignia drawing itself in, on a loop, over every page until all of its
// images have loaded; then it lifts off the top. Clicking
// through to another page raises it from the bottom first. It's in the page from the first paint,
// so nothing shows before it.
export default function PageLoader() {
  const pathname = usePathname();
  const router = useRouter();
  const screenRef = useRef(null);
  const videoRef = useRef(null);
  const loader = useRef(null);

  useLayoutEffect(() => {
    loader.current = createLoader(screenRef.current, videoRef.current, (href) => router.push(href));
    return () => loader.current.destroy();
  }, [router]);

  useLayoutEffect(() => {
    loader.current.arrive();
  }, [pathname]);

  return (
    <div
      ref={screenRef}
      id="page-loader"
      aria-hidden="true"
      className="group fixed inset-0 z-[100] grid place-items-center bg-white"
    >
      {/* the insignia is three quarters of the video's height, so it's about 40% of the screen's */}
      <video
        ref={videoRef}
        src="/loader/insignia.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        className="pointer-events-none size-[min(53svh,88vw)] motion-reduce:hidden group-data-still:hidden"
      />
      {/* the finished insignia, the animation's last frame, for when the animation doesn't play */}
      <Image
        src="/loader/insignia.png"
        alt=""
        width={720}
        height={720}
        className="pointer-events-none hidden size-[min(53svh,88vw)] motion-reduce:block group-data-still:block"
      />
    </div>
  );
}
