import Image from "next/image";
import { Section } from "@/components/organisation/cards";
import { assembly } from "@/components/organisation/directory";

// Draft copy, still to be approved.
const intro = "The CSA’s legislature. It makes the laws the rest of the CSA works under.";

export const metadata = { title: "Continental Assembly", description: intro };

// The Legislature's page, which is also the Continental Assembly's page. Its header splits into
// text on the left and a photo of an assembly hall on the right.
export default function LegislaturePage() {
  return (
    <main className="text-ink">
      <header className="bg-white px-4 pb-24 pt-32 sm:px-6 lg:pb-32 lg:pt-40">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-2">
          <div>
            <Image
              src="/images/emblems/continental-assembly.png"
              alt=""
              width={96}
              height={96}
              preload
              className="size-20"
            />
            <p className="mt-10 text-sm font-medium uppercase tracking-[0.18em] text-ink/50">The Legislature</p>
            <h1 className="mt-4 text-5xl font-medium tracking-tight sm:text-7xl">Continental Assembly</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/60">{intro}</p>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl lg:aspect-[4/5]">
            <Image
              src="/images/assembly-auditorium.jpg"
              alt=""
              fill
              preload
              sizes="(min-width: 1024px) 600px, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </header>

      <Section id="duties" title="What the Assembly does" tone="grey">
        <ol className="grid gap-3 md:grid-cols-3">
          {assembly.duties.map((duty, i) => (
            <li key={duty} className="rounded-3xl bg-white p-8 ring-1 ring-ink/5">
              <span className="text-sm text-ink/50">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-6 text-lg leading-relaxed">{duty}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="leadership" title="Leadership">
        <p className="max-w-2xl text-lg leading-relaxed text-ink/60">
          The Assembly’s leadership has not been named yet.
        </p>
        <p className="mt-8 text-sm text-ink/50">Website</p>
        <p className="mt-1 text-[15px]">{assembly.website}</p>
      </Section>
    </main>
  );
}
