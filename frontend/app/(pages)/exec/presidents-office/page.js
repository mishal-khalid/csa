import Link from "next/link";
import { ContactList, PersonCard, PersonGrid, Section, Silhouette } from "@/components/organisation/cards";

// Draft copy, still to be approved.
const intro = "Leads the Continental Security Agency from Washington, D.C.";

export const metadata = { title: "The President’s Office", description: intro };

const leaders = [
  { name: "UFHMG. Enzo Hernandez, HPhD. MD.", title: "President" },
  {
    name: "UFMG. Jana Mohamed, HPhD. MD.",
    title: "Vice President and Chairwoman of the Cabinet",
  },
];

const communications = [
  { name: "UFMG. Jana Mohamed, HPhD. MD.", title: "Chief Communications Director" },
  { name: "Dr. Amari Marchand", title: "Press Secretary" },
  { name: "Darius Jin", title: "Press Representative" },
];

const advisers = [
  { name: "Chad Rodriguez", title: "Principal Advisor", note: "International Security" },
  { name: "Sameull Wilson", title: "Principal Advisor", note: "National Security" },
  { name: "Edward Garrett", title: "Advisor", note: "Strategic Communications" },
  { name: "David Lunn", title: "Advisor", note: "Foreign Relations" },
];

const contact = [
  { label: "Website", value: "presidency.csa" },
  { label: "General enquiries", value: "info@po.csa", href: "mailto:info@po.csa" },
  { label: "Digital Innovation Committee", value: "digital@po.csa", href: "mailto:digital@po.csa" },
];

// The President's Office. Its header puts the President and Vice President side by side as large
// silhouette cards under the title, on off-white.
export default function PresidentsOfficePage() {
  return (
    <main className="text-ink">
      <header className="bg-neutral-50 px-4 pb-20 pt-36 sm:px-6 lg:pb-28 lg:pt-44">
        <div className="mx-auto max-w-[1200px]">
          <Link href="/exec" className="text-sm font-medium text-ink/50 hover:text-ink">
            The Executive
          </Link>
          <h1 className="mt-4 text-5xl font-medium tracking-tight sm:text-7xl">The President’s Office</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/60">{intro}</p>

          <ul className="mt-14 grid gap-3 md:grid-cols-2">
            {leaders.map(({ name, title }) => (
              <li key={name} className="flex flex-col gap-8 rounded-3xl bg-white p-8 ring-1 ring-ink/5 lg:p-10">
                <Silhouette className="size-32 sm:size-40" />
                <div>
                  <p className="text-3xl font-medium tracking-tight">{name}</p>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink/60">{title}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </header>

      <Section id="chief-of-staff" title="Chief of Staff">
        <div className="md:max-w-md">
          <PersonCard name="Zaha Rasheed" title="Chief of Staff of the CSA and The President’s Office" />
        </div>
      </Section>

      <Section id="communications" title="Communications" tone="grey">
        <PersonGrid people={communications} />
      </Section>

      <Section id="advisers" title="Advisers">
        <PersonGrid people={advisers} />
      </Section>

      <Section id="contact" title="Contact" tone="grey">
        <ContactList items={contact} />
      </Section>
    </main>
  );
}
