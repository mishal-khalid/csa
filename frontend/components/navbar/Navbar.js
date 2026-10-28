"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, MotionConfig } from "motion/react";
import NavDropdown from "./NavDropdown";
import MobileMenu from "./MobileMenu";
import CtaButton from "@/components/CtaButton";
import { navItems, cta } from "./nav-data";
import { ChevronIcon, CloseIcon, MenuIcon } from "./icons";

// how far the page scrolls before the nav switches to its expanded state
const SCROLL_THRESHOLD = 50;
// roughly the middle of the bar, from the top of the viewport: the section under this line sets the nav's look
const NAV_MIDLINE = 52;
// grace period so the dropdown survives the pointer briefly leaving the nav
const CLOSE_DELAY = 120;
const DESKTOP = "(min-width: 1024px)";
// pages that open on a dark band: the services' and leadership black bands, the PGO's burgundy,
// the Judicial Administration's navy
const DARK_TOP = ["/services", "/leadership", "/exec/prosecutor-generals-office", "/judiciary/judicial-administration"];

// what each page opens on: a photo (home, Careers, Contact), a dark band (including the coloured band on
// every commission's and service's own page), or light
function topSurface(pathname) {
  if (["/", "/careers", "/contact"].includes(pathname)) return "photo";
  if (DARK_TOP.includes(pathname) || /^\/(commissions|services)\/./.test(pathname)) return "dark";
  return "light";
}

// hover behaviour is for mice only; touch and pen go through click
const isMouse = (e) => e.pointerType === "mouse";

function subscribeToLayout(callback) {
  window.addEventListener("scroll", callback, { passive: true });
  window.addEventListener("resize", callback);
  return () => {
    window.removeEventListener("scroll", callback);
    window.removeEventListener("resize", callback);
  };
}

// Sections say what sits behind the nav with data-nav-surface. Later sections stack over
// earlier ones (the hero stays pinned under them), so the last one crossing the midline wins.
function getSurface() {
  let surface = "light";
  for (const el of document.querySelectorAll("[data-nav-surface]")) {
    const { top, bottom } = el.getBoundingClientRect();
    if (top <= NAV_MIDLINE && bottom > NAV_MIDLINE) surface = el.dataset.navSurface;
  }
  return surface;
}

export default function Navbar() {
  const pathname = usePathname();
  const scrolled = useSyncExternalStore(
    subscribeToLayout,
    () => window.scrollY > SCROLL_THRESHOLD,
    () => false,
  );
  // the server can't measure, so it goes by what each page opens on
  const surfaceBehind = useSyncExternalStore(
    subscribeToLayout,
    getSurface,
    () => topSurface(pathname),
  );

  const [openId, setOpenId] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const wrapperRef = useRef(null);
  const triggerRefs = useRef({});
  const closeTimer = useRef(null);
  const openedByHover = useRef(false);

  // the full-screen menu is light glass, so the bar matches it while it's open
  const surface = mobileOpen ? "light" : surfaceBehind;

  const open = (id, byHover = false) => {
    clearTimeout(closeTimer.current);
    openedByHover.current = byHover;
    setOpenId(id);
  };
  const close = () => {
    clearTimeout(closeTimer.current);
    setOpenId(null);
  };
  const scheduleClose = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenId(null), CLOSE_DELAY);
  };
  const toggle = (id) => {
    if (openId !== id) return open(id);
    // a click right after hovering keeps the dropdown open instead of flicking it shut
    if (openedByHover.current) openedByHover.current = false;
    else close();
  };

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // while a dropdown is open: Escape closes it (and returns focus), outside taps close it
  useEffect(() => {
    if (!openId) return;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      clearTimeout(closeTimer.current);
      setOpenId(null);
      triggerRefs.current[openId]?.focus();
    };
    const onPointerDown = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpenId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openId]);

  // the full-screen menu is mobile only, so drop it if the window grows to desktop
  useEffect(() => {
    const query = window.matchMedia(DESKTOP);
    const onChange = (e) => e.matches && setMobileOpen(false);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const activeItem = navItems.find((item) => item.id === openId);

  return (
    <MotionConfig reducedMotion="user">
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-4">
        {/* light glass by default; over a photo or dark section (`photo:`) the whole nav turns to smoky glass with white text */}
        <div
          ref={wrapperRef}
          data-scrolled={scrolled}
          data-surface={surface}
          className="pointer-events-auto relative mx-auto w-full max-w-[880px] transition-[max-width] duration-700 ease-soft scrolled:max-w-[1200px]"
          onPointerEnter={(e) => isMouse(e) && clearTimeout(closeTimer.current)}
          onPointerLeave={(e) => isMouse(e) && scheduleClose()}
          onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && close()}
        >
          <nav
            aria-label="Main"
            className="relative flex items-center justify-between rounded-full border border-black/[0.06] bg-white/55 p-2 shadow-[0_1px_2px_rgba(11,11,12,0.04)] backdrop-blur-md transition-all duration-700 ease-soft scrolled:bg-white/75 scrolled:p-3 scrolled:backdrop-blur-xl scrolled:shadow-[0_16px_40px_-16px_rgba(11,11,12,0.22)] photo:border-white/20 photo:bg-ink/25 photo:shadow-none photo:backdrop-blur-xl"
          >
            {/* Logo: insignia on its own, letterhead once scrolled */}
            <Link
              href="/"
              aria-label="Continental Security Agency, home"
              onPointerEnter={(e) => isMouse(e) && scheduleClose()}
              className="flex h-12 shrink-0 items-center rounded-full bg-white/70 px-[7px] ring-1 ring-black/5 transition-all duration-700 ease-soft scrolled:pr-4 photo:bg-white/10 photo:ring-white/20"
            >
              <Image
                src="/brand/CSA_Insignia_Black.svg"
                alt=""
                width={34}
                height={36}
                preload
                className="h-9 w-auto transition-[filter] duration-700 ease-soft photo:brightness-0 photo:invert"
              />
              <span
                className="block w-0 overflow-hidden opacity-0 transition-all duration-700 ease-soft scrolled:ml-1 scrolled:w-24 scrolled:opacity-100"
              >
                <Image
                  src="/brand/CSA_Wordmark_Black.svg"
                  alt=""
                  width={96}
                  height={36}
                  className="h-9 w-24 max-w-none transition-[filter] duration-700 ease-soft photo:brightness-0 photo:invert"
                />
              </span>
            </Link>

            {/* Desktop links */}
            <ul
              className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-6 transition-[gap] duration-700 ease-soft lg:flex scrolled:gap-10"
            >
              {navItems.map((item) => {
                const isOpen = openId === item.id;
                // a plain link, no dropdown (the Gazette): one click straight to its page
                if (item.href) {
                  const current = pathname.startsWith(item.href);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        aria-current={current ? "page" : undefined}
                        onPointerEnter={(e) => isMouse(e) && scheduleClose()}
                        className={`flex items-center rounded-full px-3 py-2 text-[15px] font-medium transition-colors duration-300 ${
                          current
                            ? "text-ink photo:text-white"
                            : "text-ink/70 hover:text-ink photo:text-white/80 photo:hover:text-white"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={item.id}>
                    <button
                      ref={(el) => (triggerRefs.current[item.id] = el)}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls="nav-dropdown"
                      onPointerEnter={(e) => isMouse(e) && open(item.id, true)}
                      onClick={() => toggle(item.id)}
                      className={`group/link flex items-center rounded-full px-3 py-2 text-[15px] font-medium transition-colors duration-300 ${
                        isOpen
                          ? "text-ink photo:text-white"
                          : "text-ink/70 hover:text-ink photo:text-white/80 photo:hover:text-white"
                      }`}
                    >
                      {item.label}
                      <ChevronIcon
                        className={`ml-1 size-3.5 transition-all duration-300 ease-soft ${
                          isOpen
                            ? "translate-y-0 opacity-100"
                            : "-translate-y-0.5 opacity-0 group-hover/link:translate-y-0 group-hover/link:opacity-100 group-focus-visible/link:translate-y-0 group-focus-visible/link:opacity-100"
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Desktop CTA: the site's main button, which collapses to just its arrow chip once scrolled */}
            <CtaButton href={cta.href} label={cta.label} className="hidden lg:flex" onPointerEnter={scheduleClose} />

            {/* Mobile menu button */}
            <button
              type="button"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((v) => !v)}
              className="grid size-12 place-items-center rounded-full bg-white/70 text-ink ring-1 ring-black/5 transition-all duration-700 ease-soft lg:hidden photo:bg-white/10 photo:text-white photo:ring-white/20"
            >
              {mobileOpen ? (
                <CloseIcon className="size-5" />
              ) : (
                <MenuIcon className="size-5" />
              )}
            </button>
          </nav>

          <AnimatePresence>
            {activeItem && (
              <NavDropdown key="dropdown" item={activeItem} onNavigate={close} />
            )}
          </AnimatePresence>
        </div>
      </header>

      <MobileMenu open={mobileOpen} onClose={closeMobile} />
    </MotionConfig>
  );
}
