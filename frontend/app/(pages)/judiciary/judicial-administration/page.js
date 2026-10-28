import Image from "next/image";
import Link from "next/link";
import { Section, Silhouette } from "@/components/organisation/cards";

// the deep navy of the Judiciary's emblem
const JUDICIARY_NAVY = "#183058";

// Draft copy, still to be approved.
const intro = "Runs the Judiciary’s administration, separate from the executive.";

export const metadata = { title: "Department of Judicial Administration", description: intro };
const duties = [
  "Runs the day-to-day administration of the courts.",
  "Took over judicial administration from the Department of Justice when the Judiciary was made independent.",
];

// The Department of Judicial Administration. Its header is a navy band in the Judiciary's colour,
// with the emblem on a white disc and a thin gold rule under the title.
// data-nav-surface keeps the nav smoky over the band.
export default function JudicialAdministrationPage() {
  return (
    <main className="text-ink">
      <header
        data-nav-surface="dark"
        style={{ backgroundColor: JUDICIARY_NAVY }}
        className="px-4 pb-20 pt-36 text-white sm:px-6 lg:pb-28 lg:pt-44"
      >
        <div className="mx-auto max-w-[1200px]">
          <Link href="/judiciary" className="text-sm font-medium text-white/60 hover:text-white">
            The Judiciary
          </Link>
          <div className="mt-8 grid size-28 place-items-center rounded-full bg-white sm:size-32">
            <Image src="/images/emblems/judiciary.png" alt="" width={96} height={96} preload className="size-20 sm:size-24" />
          </div>
          <h1 className="mt-10 max-w-3xl text-balance text-5xl font-medium tracking-tight sm:text-7xl">
            Department of Judicial Administration
          </h1>
          <span aria-hidden="true" className="mt-8 block h-px w-24 bg-gold" />
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-white/75">{intro}</p>
        </div>
      </header>

      <Section id="leadership" title="Leadership">
        <div className="flex flex-col gap-8 rounded-3xl bg-[#f4f4f2] p-8 sm:flex-row sm:items-center lg:p-10">
          <Silhouette className="size-32 sm:size-40" />
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-ink/50">Chief Judicial Administrator</p>
            <p className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">Uz. Ahmed Naail Zubair, PhD</p>
          </div>
        </div>
      </Section>

      <Section id="duties" title="What it does" tone="grey">
        <ol className="grid gap-3 md:grid-cols-2">
          {duties.map((duty, i) => (
            <li key={duty} className="rounded-3xl bg-white p-8 ring-1 ring-ink/10">
              <span className="text-sm text-ink/50">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-6 text-lg leading-relaxed">{duty}</p>
            </li>
          ))}
        </ol>
      </Section>
    </main>
  );
}
