import Link from "next/link";
import { PersonGrid, Section, Silhouette } from "@/components/organisation/cards";
import { cabinet, leaderHref, leaders, otherHeads, seniorCounsel } from "@/components/leadership/people";

export const metadata = {
  title: "Leadership",
  // approved by the user (the page itself has no intro to reuse)
  description:
    "The Enzo–Jana Administration: the Director, the Deputy Director, the Cabinet, the Senior Counsel and the heads of the CSA’s other bodies.",
};

// The Leadership hub, in rank order. Its header is a black band with the Director and Deputy
// Director as large portrait cards (each opening their own page); then the Cabinet, the Senior
// Counsel, and the heads of every other body (each linking to their body's page).
// data-nav-surface keeps the nav smoky over the black band.
export default function LeadershipPage() {
  return (
    <main className="text-ink">
      <header data-nav-surface="dark" className="bg-ink px-4 pb-20 pt-36 text-white sm:px-6 lg:pb-28 lg:pt-44">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/50">The Enzo–Jana Administration</p>
          <h1 className="mt-4 text-5xl font-medium tracking-tight sm:text-7xl">Leadership</h1>

          <ul className="mt-14 grid gap-3 md:grid-cols-2">
            {leaders.map(({ slug, rank, name, honorifics, post }) => (
              <li key={slug}>
                <Link
                  href={leaderHref(slug)}
                  className="flex h-full flex-col gap-8 rounded-3xl bg-white/[0.06] p-8 ring-1 ring-white/10 transition-colors duration-300 hover:bg-white/10 lg:p-10"
                >
                  <Silhouette dark className="size-32 sm:size-40" />
                  <span>
                    <span className="block text-sm font-medium uppercase tracking-[0.14em] text-white/50">{rank}</span>
                    <span className="mt-3 block text-3xl font-medium tracking-tight">
                      {name}, {honorifics}
                    </span>
                    <span className="mt-3 block text-[15px] leading-relaxed text-white/60">{post}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </header>

      <Section id="cabinet" title="The Cabinet" intro="A Secretary for each of the twelve departments.">
        <PersonGrid people={cabinet} />
      </Section>

      <Section id="senior-counsel" title="Senior Counsel" intro="The Immediate Security Team." tone="grey">
        <PersonGrid people={seniorCounsel} />
      </Section>

      <Section id="heads" title="Heads of the other bodies">
        <div className="space-y-12">
          {otherHeads.map(({ group, people }) => (
            <div key={group}>
              <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-ink/50">{group}</h3>
              <div className="mt-4">
                <PersonGrid people={people} />
              </div>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
