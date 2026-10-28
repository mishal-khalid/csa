import Image from "next/image";
import { BodyGrid, Section } from "@/components/organisation/cards";
import { commissions } from "@/components/organisation/directory";

// Draft copy, still to be approved.
const intro =
  "Three commissions that work at arm’s length from the executive: over the CSA’s people, its courts and its elections.";

export const metadata = { title: "Independent commissions", description: intro };

// The commissions' page. Its header is an off-white band with the three commissions' emblems in a row.
export default function CommissionsPage() {
  return (
    <main className="text-ink">
      <header className="bg-neutral-50 px-4 pb-24 pt-36 text-center sm:px-6 lg:pb-32 lg:pt-44">
        <div className="flex items-center justify-center gap-6 sm:gap-10">
          {commissions.map(({ name, emblem }) => (
            <Image
              key={name}
              src={emblem.src}
              alt=""
              width={emblem.width * 1.5}
              height={96}
              preload
              className="h-16 w-auto sm:h-24"
            />
          ))}
        </div>
        <h1 className="mt-12 text-5xl font-medium tracking-tight sm:text-7xl">Independent commissions</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink/60">{intro}</p>
      </header>

      <Section id="the-commissions" title="The commissions">
        <BodyGrid items={commissions} />
      </Section>
    </main>
  );
}
