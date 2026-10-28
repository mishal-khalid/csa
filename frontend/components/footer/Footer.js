import Image from "next/image";
import Link from "next/link";
import { address, contacts, generalEmail } from "@/components/contact-details";
import { groupHref } from "@/components/organisation/groups";
import { leaderHref } from "@/components/leadership/people";
import { types } from "@/components/gazette/documents";

const cta = {
  heading: "Questions for the CSA?",
  text: "The Director’s Office answers general enquiries.",
  label: "Contact us",
  href: "/contact",
};

// A directory of the site: each page heads a column (the heading opens it), with the main places on
// that page listed under it.
const columns = [
  {
    title: "Organisation",
    href: "/organisation",
    links: [
      { label: "The Executive", href: groupHref("exec") },
      { label: "The Legislature", href: groupHref("legislature") },
      { label: "The Judiciary", href: groupHref("judiciary") },
      { label: "Commissions", href: groupHref("commissions") },
      { label: "Uniformed services", href: groupHref("services") },
    ],
  },
  {
    title: "Leadership",
    href: "/leadership",
    links: [
      { label: "The Director", href: leaderHref("enzo-hernandez") },
      { label: "The Deputy Director", href: leaderHref("jana-mohamed") },
      { label: "The Cabinet", href: "/leadership#cabinet" },
      { label: "Senior Counsel", href: "/leadership#senior-counsel" },
      { label: "Heads of bodies", href: "/leadership#heads" },
    ],
  },
  {
    title: "Gazette",
    href: "/gazette",
    links: [
      { label: "All documents", href: "/gazette" },
      ...types.map(({ id, label }) => ({ label, href: `/gazette#${id}` })),
    ],
  },
  {
    title: "Careers",
    href: "/careers",
    links: [
      { label: "Ways to serve", href: "/careers#paths" },
      { label: "Recruitment", href: "/careers#recruitment" },
      { label: "Cadets and volunteers", href: "/careers#cadets" },
    ],
  },
  {
    title: "Contact",
    href: "/contact",
    links: [
      { label: "Headquarters", href: "/contact" },
      { label: "Send a message", href: "/contact#message" },
      { label: generalEmail, href: `mailto:${generalEmail}` },
    ],
  },
];

// The black footer. On the landing page (withCard) a contact card straddles its top edge: the card
// sits in the white strip above the footer and the black block is pulled up behind it by half the
// card's height. Every page leaves a wide gap between its content and the footer.
export default function Footer({ withCard = false }) {
  return (
    <footer className={withCard ? "bg-white pt-24 lg:pt-32" : "mt-32 lg:mt-48"}>
      {withCard && (
        <div className="px-4 sm:px-6">
          <div className="relative isolate z-10 mx-auto flex min-h-[26rem] max-w-[1200px] flex-col overflow-hidden rounded-3xl bg-ink text-white ring-1 ring-white/10">
            {/* dark red glow rising from the bottom-left corner */}
            <span
              aria-hidden="true"
              className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_100%,rgb(107_15_26/0.65),transparent_55%)]"
            />

            <div className="flex flex-col justify-center p-8 sm:p-12 lg:min-h-[26rem] lg:max-w-[34rem] lg:p-16">
              <h2 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                {cta.heading}
              </h2>
              <p className="mt-6 text-lg text-white/60">{cta.text}</p>
              <Link
                href={cta.href}
                className="mt-10 inline-flex h-12 w-fit items-center rounded-lg bg-white px-6 text-[15px] font-medium text-ink transition-colors duration-300 hover:bg-white/85"
              >
                {cta.label}
              </Link>
            </div>

            {/* dotted globe with gold pins on Washington, D.C., New York, The Hague and Malé.
                Below the text on small screens (its bottom cut off by the card), beside it on large ones */}
            <div className="relative -mb-28 w-[340px] self-center sm:w-[420px] lg:absolute lg:right-8 lg:top-12 lg:mb-0 lg:w-[440px] xl:w-[500px]">
              <Image
                src="/images/globe-dots.svg"
                alt="Globe marking Washington, D.C., New York, The Hague and Malé"
                width={600}
                height={600}
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      )}

      <div
        className={`rounded-t-[40px] bg-ink px-4 pb-10 text-white sm:px-6 ${withCard ? "-mt-52 pt-72" : "pt-24"}`}
      >
        <div className="mx-auto max-w-[1200px]">
          <div className="grid grid-cols-2 gap-12 sm:grid-cols-3 lg:grid-cols-[1.4fr_repeat(5,1fr)] lg:gap-x-8">
            <div className="col-span-2 sm:col-span-3 lg:col-span-1">
              <Image
                src="/brand/CSA_Letterhead_White.svg"
                alt="Continental Security Agency"
                width={3445}
                height={928}
                className="h-12 w-auto"
              />
              <address className="mt-8 not-italic">
                <p className="leading-relaxed text-white/60">
                  {address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </p>
                <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-6">
                  {contacts.map(({ label, value, href }) => (
                    <div key={label}>
                      <dt className="text-sm text-white/50">{label}</dt>
                      <dd className="mt-2">
                        <a href={href} className="hover:text-white/80">
                          {value}
                        </a>
                      </dd>
                    </div>
                  ))}
                </dl>
              </address>
            </div>

            {columns.map(({ title, href, links }) => (
              <div key={title}>
                <h3 className="text-sm text-white/50">
                  <Link href={href} className="transition-colors hover:text-white">
                    {title}
                  </Link>
                </h3>
                <ul className="mt-6 space-y-4">
                  {links.map(({ label, href }) => {
                    // mailto: addresses are plain links; site pages go through Link
                    const Tag = href.startsWith("/") ? Link : "a";
                    return (
                      <li key={label}>
                        <Tag href={href} className="text-[15px] hover:text-white/80">
                          {label}
                        </Tag>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* fixed year: the page is prerendered, so a live year would freeze at build time anyway */}
          <p className="mt-24 text-center text-sm text-white/50">
            © 2026 Continental Security Agency. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
