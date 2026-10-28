import Image from "next/image";
import CtaButton from "@/components/CtaButton";
import { BodyGrid, PersonTile, Section } from "@/components/organisation/cards";
import { courts, judicialAdministration, judiciaryLeaders } from "@/components/organisation/directory";

// Draft copy, still to be approved.
const intro =
  "Independent courts, from the Trial Courts to the Supreme Court. No one who holds an executive office may hold a judicial one.";

export const metadata = { title: "The Judiciary", description: intro };

// The Judiciary's page. Its header is a large serif title between two rules, with the emblem beside
// it, then a library photo across the full width.
export default function JudiciaryPage() {
  return (
    <main className="text-ink">
      <header className="bg-white px-4 pt-32 sm:px-6 lg:pt-40">
        <div className="mx-auto max-w-[1200px] border-y border-ink/15 py-12 lg:py-16">
          <div className="flex items-center justify-between gap-8">
            <h1 className="font-serif text-6xl font-semibold leading-none tracking-tight sm:text-8xl lg:text-9xl">
              The Judiciary
            </h1>
            <Image
              src="/images/emblems/judiciary.png"
              alt=""
              width={160}
              height={160}
              preload
              className="hidden size-28 shrink-0 sm:block lg:size-40"
            />
          </div>
          <p className="mt-10 max-w-2xl text-lg leading-relaxed text-ink/60">{intro}</p>
        </div>

        {/* the library photo runs edge to edge under the ruled title */}
        <div className="relative -mx-4 mt-16 aspect-[4/3] sm:-mx-6 sm:aspect-[21/9] lg:mt-20">
          <Image
            src="/images/judiciary-library.jpg"
            alt=""
            fill
            preload
            sizes="100vw"
            className="object-cover"
          />
        </div>
      </header>

      <Section id="leadership" title="Leadership">
        <ul className="grid gap-3 md:grid-cols-2">
          {judiciaryLeaders.map((person) => (
            <li key={person.name}>
              <PersonTile {...person} />
            </li>
          ))}
        </ul>
      </Section>

      <Section id="courts" title="The courts" tone="grey">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courts.map(({ name, text, justices }) => (
            <li key={name} className={`rounded-3xl bg-white p-8 ring-1 ring-ink/5 ${justices ? "lg:row-span-2" : ""}`}>
              <h3 className="text-xl font-medium tracking-tight">{name}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink/60">{text}</p>
              {justices && (
                <>
                  <p className="mt-8 text-sm text-ink/50">Justices</p>
                  <ul className="mt-3 space-y-2 text-[15px]">
                    {justices.map((justice) => (
                      <li key={justice}>{justice}</li>
                    ))}
                  </ul>
                </>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="administration"
        title="Administration"
        intro="The Judiciary runs its own administration, and the Judicial Service Commission manages it independently of the executive."
      >
        <BodyGrid items={[judicialAdministration]} />
        <CtaButton href="/commissions/judicial-service" label="About the JSC" className="mt-12 flex" />
      </Section>
    </main>
  );
}
