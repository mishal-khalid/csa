import Image from "next/image";
import Link from "next/link";
import { ContactList, PersonGrid, Section, Silhouette } from "@/components/organisation/cards";

// Draft copy, still to be approved.
const intro = "Legal counsel of the CSA government, within the Department of Justice.";

export const metadata = { title: "Attorney General’s Office", description: intro };

const board = [
  { name: "Nathan Winslow", title: "Deputy Secretary for Justice", note: "Legal Affairs & Regulations" },
];

const contact = [
  { label: "Website", value: "ag.csa" },
  { label: "Email", value: "info@ag.csa", href: "mailto:info@ag.csa" },
];

// The Attorney General's Office. Its header is a bento of tiles: the black insignia, the title,
// the Attorney General, and the Universal Board of Legal Affairs the Attorney General also leads.
export default function AttorneyGeneralsOfficePage() {
  return (
    <main className="text-ink">
      <header className="bg-white px-4 pb-8 pt-32 sm:px-6 lg:pt-40">
        <div className="mx-auto grid max-w-[1200px] gap-3 lg:grid-cols-3">
          <div className="grid min-h-56 place-items-center rounded-3xl bg-[#f4f4f2] p-8">
            <Image src="/brand/CSA_Insignia_Black.svg" alt="" width={150} height={160} preload className="h-36 w-auto" />
          </div>

          <div className="flex flex-col justify-end rounded-3xl bg-ink p-8 text-white lg:col-span-2 lg:p-10">
            <Link href="/exec" className="text-sm font-medium text-white/50 hover:text-white">
              The Executive
            </Link>
            <h1 className="mt-4 text-5xl font-medium tracking-tight sm:text-6xl">Attorney General’s Office</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/60">{intro}</p>
          </div>

          <div className="flex flex-col gap-8 rounded-3xl p-8 ring-1 ring-ink/10 sm:flex-row sm:items-center lg:col-span-2 lg:p-10">
            <Silhouette className="size-32 sm:size-36" />
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-ink/50">Attorney General</p>
              <p className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">FA. Luz Miranda, AG</p>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-8 rounded-3xl bg-[#f4f4f2] p-8">
            <p className="text-sm text-ink/50">Also led by the Attorney General</p>
            <div>
              <p className="text-2xl font-medium tracking-tight">Universal Board of Legal Affairs</p>
              <p className="mt-2 text-[15px] text-ink/60">New York City</p>
            </div>
          </div>
        </div>
      </header>

      <Section id="board" title="Universal Board of Legal Affairs">
        <PersonGrid people={board} />
      </Section>

      <Section id="contact" title="Contact" tone="grey">
        <ContactList items={contact} />
      </Section>
    </main>
  );
}
