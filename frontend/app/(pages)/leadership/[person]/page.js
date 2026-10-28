import Link from "next/link";
import { notFound } from "next/navigation";
import CtaButton from "@/components/CtaButton";
import { Section } from "@/components/organisation/cards";
import { leaderBySlug, leaders } from "@/components/leadership/people";

// Only the Director and Deputy Director have pages of their own; both are prerendered. The address
// is read before rendering so an unknown one gets a real 404 (see the department pages for why
// instant is off).
export const instant = false;

export function generateStaticParams() {
  return leaders.map(({ slug }) => ({ person: slug }));
}

export async function generateMetadata({ params }) {
  const { person } = await params;
  const leader = leaderBySlug(person);
  return { title: leader?.name, description: leader?.line };
}

// A ruled list, one item per row.
function RuledList({ items }) {
  return (
    <ul className="divide-y divide-ink/10 border-y border-ink/10">
      {items.map((item) => (
        <li key={item} className="py-5 text-lg">
          {item}
        </li>
      ))}
    </ul>
  );
}

// A row of small outlined tags.
function Tags({ items }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className="rounded-full px-3 py-1 text-[13px] text-ink/70 ring-1 ring-ink/15">
          {item}
        </li>
      ))}
    </ul>
  );
}

// A leader's page. Its header is editorial: a tall portrait on the left (a silhouette until photos
// exist) and, on the right, the rank written in full above the name, set large in the serif, with
// their designations as tags. Then every post they hold, what they're responsible for, any other
// and previous positions, their education, and a way to their office. Sections a leader has no
// details for are left out; the rest alternate white and off-white.
export default async function LeaderPage({ params }) {
  const { person } = await params;
  const leader = leaderBySlug(person);
  if (!leader) notFound();

  const { rank, name, honorifics, post, line, designations, posts, responsibilities, otherPositions, previousPositions, education } =
    leader;

  const sections = [
    { id: "posts", title: "Posts held", body: <RuledList items={posts} /> },
    {
      id: "responsibilities",
      title: "Responsibilities",
      body: (
        <ol className="grid gap-3 md:grid-cols-2">
          {responsibilities.map((item, i) => (
            <li key={item} className="rounded-3xl bg-white p-8 ring-1 ring-ink/10">
              <span className="text-sm text-ink/50">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-6 text-lg leading-relaxed">{item}</p>
            </li>
          ))}
        </ol>
      ),
    },
    otherPositions && { id: "other-positions", title: "Other positions", body: <RuledList items={otherPositions} /> },
    previousPositions && {
      id: "previously-held",
      title: "Previously held",
      body: (
        <>
          <RuledList items={previousPositions} />
          <p className="mt-6 text-[15px] text-ink/50">Among many others.</p>
        </>
      ),
    },
    education && {
      id: "education",
      title: "Education",
      body: (
        <div className="grid gap-12 lg:grid-cols-[3fr_2fr]">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-ink/50">Doctorates and honours</h3>
            <div className="mt-4">
              <RuledList items={education.degrees} />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-ink/50">Also studied</h3>
            <div className="mt-5">
              <Tags items={education.fields} />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "office",
      title: "The Director’s Office",
      intro: "Washington, D.C.",
      body: <CtaButton href="/exec/directors-office" label="About the DO" />,
    },
  ].filter(Boolean);

  return (
    <main className="text-ink">
      <header className="bg-white px-4 pt-32 sm:px-6 lg:pt-40">
        <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[5fr_7fr] lg:items-end lg:gap-16">
          {/* the portrait, a silhouette until photos exist */}
          <div aria-hidden="true" className="aspect-[4/5] overflow-hidden rounded-3xl bg-[#e9e9e6] text-ink/15">
            <svg viewBox="0 0 64 80" fill="currentColor" className="size-full">
              <circle cx="32" cy="30" r="13" />
              <path d="M4 80c0-17 12.5-30 28-30s28 13 28 30z" />
            </svg>
          </div>

          <div className="pb-2">
            <Link href="/leadership" className="text-sm font-medium text-ink/50 hover:text-ink">
              Leadership
            </Link>
            <p className="mt-8 text-sm font-medium uppercase tracking-[0.14em] text-ink/50">{rank}</p>
            <h1 className="mt-4 font-serif text-6xl font-semibold leading-none tracking-tight sm:text-7xl lg:text-8xl">
              {name}
            </h1>
            <p className="mt-4 text-lg text-ink/60">{honorifics}</p>
            <p className="mt-10 max-w-xl text-2xl font-medium leading-snug tracking-tight">{post}</p>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink/60">{line}</p>
            {designations && (
              <div className="mt-8">
                <Tags items={designations} />
              </div>
            )}
          </div>
        </div>
      </header>

      {sections.map(({ id, title, intro, body }, i) => (
        <Section key={id} id={id} title={title} intro={intro} tone={i % 2 ? "grey" : "white"}>
          {body}
        </Section>
      ))}
    </main>
  );
}
