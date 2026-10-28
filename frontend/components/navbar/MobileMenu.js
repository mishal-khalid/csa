"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useLenis } from "lenis/react";
import { navItems, cta } from "./nav-data";
import { ArrowIcon, ChevronIcon } from "./icons";

const ease = [0.22, 1, 0.36, 1];

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease } },
};

export default function MobileMenu({ open, onClose }) {
  return (
    <AnimatePresence>{open && <MenuPanel onClose={onClose} />}</AnimatePresence>
  );
}

function MenuPanel({ onClose }) {
  const lenis = useLenis();
  const [openSection, setOpenSection] = useState(null);

  // freeze the page behind the menu, and let Escape close it
  useEffect(() => {
    lenis?.stop();
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    const onKeyDown = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => {
      lenis?.start();
      root.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lenis, onClose]);

  return (
    <motion.div
      id="mobile-menu"
      data-lenis-prevent
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, ease }}
      className="fixed inset-0 z-40 overflow-y-auto bg-white/85 backdrop-blur-2xl lg:hidden"
    >
      <motion.nav
        aria-label="Mobile"
        initial="hidden"
        animate="show"
        variants={list}
        className="flex min-h-full flex-col px-6 pb-8 pt-28"
      >
        <ul>
          {navItems.map((item) => {
            // a plain link, no dropdown (the Gazette)
            if (item.href) {
              return (
                <motion.li key={item.id} variants={fadeUp} className="border-b border-black/[0.06]">
                  <Link href={item.href} onClick={onClose} className="block py-5 text-2xl font-medium text-ink">
                    {item.label}
                  </Link>
                </motion.li>
              );
            }
            const expanded = openSection === item.id;
            return (
              <motion.li key={item.id} variants={fadeUp} className="border-b border-black/[0.06]">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpenSection(expanded ? null : item.id)}
                  className="flex w-full items-center justify-between py-5 text-2xl font-medium text-ink"
                >
                  {item.label}
                  <ChevronIcon
                    className={`size-5 transition-transform duration-300 ease-soft ${
                      expanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease }}
                      className="overflow-hidden"
                    >
                      {item.cards.map((card) => (
                        <li key={card.title}>
                          <Link
                            href={card.href}
                            onClick={onClose}
                            className="block py-2 text-base text-ink/70 first:pt-0 last:pb-5"
                          >
                            {card.title}
                          </Link>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ul>

        <motion.div variants={fadeUp} className="mt-auto pt-10">
          <Link
            href={cta.href}
            onClick={onClose}
            className="flex h-14 items-center justify-center gap-3 rounded-full bg-ink text-base font-medium text-white"
          >
            <span className="grid size-9 place-items-center rounded-full bg-white/15">
              <ArrowIcon className="size-4" />
            </span>
            {cta.label}
          </Link>
        </motion.div>
      </motion.nav>
    </motion.div>
  );
}
