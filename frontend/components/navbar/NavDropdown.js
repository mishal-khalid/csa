"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

const ease = [0.22, 1, 0.36, 1];

// Both rows start together and each one staggers left to right, following the sketch's arrows.
const row = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.06 } },
};
const card = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease } },
};

const cardBase =
  "block h-full rounded-[20px] border border-black/[0.05] bg-white/70 transition-colors duration-300 hover:bg-white";
const titleClass = "text-[15px] font-semibold text-ink";
const textClass = "mt-1 text-[13px] leading-5 text-ink/60";

function Card({ href, onNavigate, className = "", children }) {
  return (
    <motion.div variants={card}>
      <Link href={href} onClick={onNavigate} className={`${cardBase} ${className}`}>
        {children}
      </Link>
    </motion.div>
  );
}

export default function NavDropdown({ item, onNavigate }) {
  const [imageCard, textCard, listCard, mediaCard, noteCard] = item.cards;

  return (
    <div className="absolute inset-x-0 top-full flex justify-center pt-3">
      {/* the glass panel animates itself (not a wrapper) so its backdrop blur stays visible while fading */}
      <motion.div
        id="nav-dropdown"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6, transition: { duration: 0.2 } }}
        transition={{ duration: 0.35, ease }}
        className="w-[min(820px,100%)] rounded-[28px] border border-black/[0.06] bg-white/75 p-3 shadow-[0_24px_60px_-20px_rgba(11,11,12,0.25)] backdrop-blur-xl"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={item.id}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            <motion.div variants={row} className="grid grid-cols-[1.15fr_1fr_1.5fr] gap-3">
              <Card href={imageCard.href} onNavigate={onNavigate} className="flex items-center gap-4 p-3">
                {imageCard.image ? (
                  <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-full">
                    <Image src={imageCard.image} alt="" fill sizes="80px" className="object-cover" />
                  </div>
                ) : imageCard.portrait ? (
                  // a person's silhouette, until portraits exist
                  <div aria-hidden="true" className="h-28 w-20 shrink-0 overflow-hidden rounded-full bg-[#e9e9e6] text-ink/20">
                    <svg viewBox="0 0 40 56" fill="currentColor" className="size-full">
                      <circle cx="20" cy="22" r="8" />
                      <path d="M2 56c0-11 8-19 18-19s18 8 18 19z" />
                    </svg>
                  </div>
                ) : (
                  <div className="placeholder-media h-28 w-20 shrink-0 rounded-full" />
                )}
                <div>
                  <p className={titleClass}>{imageCard.title}</p>
                  <p className={textClass}>{imageCard.text}</p>
                </div>
              </Card>

              <Card href={textCard.href} onNavigate={onNavigate} className="p-4">
                <p className={titleClass}>{textCard.title}</p>
                <p className={textClass}>{textCard.text}</p>
              </Card>

              {/* not a link itself: each item in the list is */}
              <motion.div variants={card} className="h-full rounded-[20px] border border-black/[0.05] bg-white/70 p-4">
                <p className={titleClass}>{listCard.title}</p>
                <ul className="mt-3 grid grid-cols-2 items-start gap-x-4 gap-y-1">
                  {listCard.items.map(({ label, href }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        onClick={onNavigate}
                        className="-mx-2 block rounded-lg px-2 py-1 text-[13px] leading-5 text-ink/60 transition-colors duration-200 hover:bg-ink/[0.04] hover:text-ink"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </motion.div>

            <motion.div variants={row} className="mt-3 grid grid-cols-[1.35fr_1fr] gap-3">
              <Card href={mediaCard.href} onNavigate={onNavigate} className="p-2">
                {mediaCard.image ? (
                  // the photo with a dark fade at the bottom so the white text stays readable
                  <div className="relative isolate flex h-full min-h-36 flex-col justify-end overflow-hidden rounded-[14px] p-4">
                    <Image src={mediaCard.image} alt="" fill sizes="440px" className="-z-10 object-cover" />
                    <span className="absolute inset-0 -z-10 bg-linear-to-t from-ink/75 to-ink/0" />
                    <p className="text-[15px] font-semibold text-white">{mediaCard.title}</p>
                    <p className="mt-1 text-[13px] leading-5 text-white/75">{mediaCard.text}</p>
                  </div>
                ) : (
                  <div className="placeholder-media flex h-full min-h-36 flex-col justify-end rounded-[14px] p-4">
                    <p className={titleClass}>{mediaCard.title}</p>
                    <p className={textClass}>{mediaCard.text}</p>
                  </div>
                )}
              </Card>

              <Card href={noteCard.href} onNavigate={onNavigate} className="p-4">
                <p className={titleClass}>{noteCard.title}</p>
                <p className={textClass}>{noteCard.text}</p>
              </Card>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
