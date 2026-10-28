import Image from "next/image";
import Link from "next/link";
import { ContactList, PersonGrid, Section, Silhouette } from "@/components/organisation/cards";

// the PGO's own Lacquer Burgundy, from its brand pack; the type and layout stay the CSA site's
const LACQUER_BURGUNDY = "#6B1D33";

// Draft copy, still to be approved.
const intro = "Leads criminal prosecution for the CSA, free of political influence.";

export const metadata = { title: "Prosecutor General’s Office", description: intro };

const prosecution = [{ name: "Hannah Jennings", title: "Deputy Secretary for Justice", note: "Prosecution" }];

// address and contact details from the PGO brand pack
const contact = [
  { label: "Headquarters", value: "M. Mahaldheege, 8th Floor, Malé 20311, Maldives" },
  { label: "Phone", value: "+960 1050001", href: "tel:+9601050001" },
  { label: "Website", value: "pgoffice.gov.csa" },
  { label: "Email", value: "info@pgoffice.gov.csa", href: "mailto:info@pgoffice.gov.csa" },
];

// The Prosecutor General's Office. Its header is a Lacquer Burgundy band with the PGO's reversed
// (light) emblem large on the right, which its guidelines use on burgundy.
// data-nav-surface keeps the nav smoky over the band.
export default function ProsecutorGeneralsOfficePage() {
  return (
    <main className="text-ink">
      <header
        data-nav-surface="dark"
        style={{ backgroundColor: LACQUER_BURGUNDY }}
        className="relative overflow-hidden px-4 pb-20 pt-36 text-white sm:px-6 lg:pb-28 lg:pt-44"
      >
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 md:grid-cols-[1fr_auto]">
          <div>
            <Link href="/exec" className="text-sm font-medium text-white/60 hover:text-white">
              The Executive
            </Link>
            <h1 className="mt-4 max-w-3xl text-balance text-5xl font-medium tracking-tight sm:text-7xl">
              Prosecutor General’s Office
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">{intro}</p>
          </div>
          <Image
            src="/images/emblems/pgo-emblem-reversed.png"
            alt=""
            width={215}
            height={240}
            preload
            className="h-40 w-auto sm:h-56 lg:h-64"
          />
        </div>
      </header>

      <Section id="leadership" title="Leadership">
        <div className="flex flex-col gap-8 rounded-3xl bg-[#f4f4f2] p-8 sm:flex-row sm:items-center lg:p-10">
          <Silhouette className="size-32 sm:size-40" />
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-ink/50">Prosecutor General</p>
            <p className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">Fayé Trammell</p>
            <p className="mt-2 text-[15px] text-ink/60">The Secretary of Justice guards the Office’s independence.</p>
          </div>
        </div>
      </Section>

      <Section id="prosecution" title="Prosecution" tone="grey">
        <PersonGrid people={prosecution} />
      </Section>

      <Section id="contact" title="Contact">
        <ContactList items={contact} />
      </Section>
    </main>
  );
}
