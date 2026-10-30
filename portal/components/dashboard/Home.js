"use client";

import { useState } from "react";
import Image from "next/image";
import { initials, roleLabel, useAccount } from "@/lib/session";
import { OutIcon } from "./icons";
import { Bar } from "./skeletons";

const SITE = process.env.NEXT_PUBLIC_SITE_URL;

// Until the portal has more tabs, the quick links go to the main site's pages, each with a photo.
const quickLinks = [
  { label: "The CSA Gazette", line: "Frameworks, circulars and mandates", href: `${SITE}/gazette`, photo: "/images/portal-gazette.jpg" },
  { label: "Organisation", line: "How the CSA is structured", href: `${SITE}/organisation`, photo: "/images/portal-organisation.jpg" },
  { label: "Leadership", line: "The Director, the Cabinet and the heads of bodies", href: `${SITE}/leadership`, photo: "/images/portal-leadership.jpg" },
  { label: "Contact", line: "Write to The Director's Office", href: `${SITE}/contact`, photo: "/images/portal-contact.jpg" },
];

// A quick link's photo: a pulsing grey block until it has loaded, then it fades in. It eases in a
// little on hover.
function Photo({ src }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <span className="relative block aspect-[4/3] overflow-hidden rounded-[18px]">
      {!loaded && <Bar className="absolute inset-0 rounded-none" />}
      <Image
        src={src}
        alt=""
        fill
        sizes="(min-width: 1024px) 240px, (min-width: 640px) 45vw, 100vw"
        onLoad={() => setLoaded(true)}
        className={`object-cover transition-[opacity,scale] duration-700 ease-soft group-hover:scale-[1.04] ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </span>
  );
}

// the greeting for the time of day where the visitor is
function greeting(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// The Home tab: a greeting, the account's details, and quick links.
export default function Home() {
  const account = useAccount();
  const now = new Date();
  const firstName = account.name.split(/\s+/)[0];

  const details = [
    ["Name", account.name],
    ["Username", account.username],
    ["Email", account.email],
    ["Role", roleLabel(account.role)],
  ];

  return (
    <div className="space-y-12">
      <header>
        <p className="text-sm text-ink/50">{today.format(now)}</p>
        <h1 className="mt-2 font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          {greeting(now.getHours())}, {firstName}
        </h1>
      </header>

      <section aria-labelledby="account-heading" className="rounded-[28px] bg-white p-6 ring-1 ring-black/5 sm:p-8">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-ink text-lg font-medium text-white">
            {initials(account.name)}
          </span>
          <div className="min-w-0">
            <h2 id="account-heading" className="text-sm font-medium text-ink/50">
              Your account
            </h2>
            <p className="truncate text-xl font-medium">{account.name}</p>
          </div>
        </div>
        <dl className="mt-8 grid gap-x-8 gap-y-5 border-t border-ink/10 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {details.map(([term, value]) => (
            <div key={term} className="min-w-0">
              <dt className="text-[13px] text-ink/50">{term}</dt>
              <dd className="mt-1 truncate text-[15px]">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="links-heading">
        <h2 id="links-heading" className="text-sm font-medium text-ink/50">
          Quick links
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map(({ label, line, href, photo }) => (
            <li key={href}>
              <a
                href={href}
                className="group flex h-full flex-col rounded-[24px] bg-white p-2 ring-1 ring-black/5 transition-shadow duration-300 hover:ring-black/15"
              >
                <Photo src={photo} />
                <span className="flex items-start justify-between gap-3 px-3 pb-3 pt-4">
                  <span>
                    <span className="block text-[15px] font-medium">{label}</span>
                    <span className="mt-1 block text-[13px] leading-5 text-ink/50">{line}</span>
                  </span>
                  <OutIcon className="size-5 shrink-0 text-ink/30 transition-colors duration-300 group-hover:text-ink" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
