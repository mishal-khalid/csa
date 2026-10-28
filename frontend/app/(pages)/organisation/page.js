import Image from "next/image";
import StructureChart from "@/components/organisation/StructureChart";
import GroupCards from "@/components/organisation/GroupCards";

// Draft copy, still to be approved.
const intro =
  "How the CSA is organised: three branches, the services under the executive, and the commissions that keep watch independently.";

export const metadata = { title: "Organisation", description: intro };

// The Organisation hub: a heading with a wide photo under it, the structure chart, then a card
// for each of the five groups.
export default function OrganisationPage() {
  return (
    <main className="bg-white text-ink">
      <header className="px-4 pt-36 sm:px-6 lg:pt-44">
        <div className="mx-auto max-w-[1200px]">
          <h1 className="text-5xl font-medium tracking-tight sm:text-7xl">Organisation</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/60">{intro}</p>
          <div className="relative mt-14 aspect-[4/3] overflow-hidden rounded-3xl sm:aspect-[21/9]">
            <Image
              src="/images/organisation-building.jpg"
              alt=""
              fill
              preload
              sizes="(min-width: 1248px) 1200px, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </header>

      <section aria-labelledby="structure" className="mt-24 bg-neutral-50 px-4 py-24 sm:px-6 lg:mt-32 lg:py-32">
        <div className="mx-auto max-w-[1200px]">
          <h2 id="structure" className="text-center text-4xl font-medium tracking-tight sm:text-5xl">
            How it fits together
          </h2>
          <div className="mt-14">
            <StructureChart />
          </div>
        </div>
      </section>

      <section aria-labelledby="groups" className="px-4 py-24 sm:px-6 lg:py-32">
        <div className="mx-auto max-w-[1200px]">
          <h2 id="groups" className="text-center text-4xl font-medium tracking-tight sm:text-5xl">
            The five groups
          </h2>
          <div className="mt-14">
            <GroupCards />
          </div>
        </div>
      </section>
    </main>
  );
}
