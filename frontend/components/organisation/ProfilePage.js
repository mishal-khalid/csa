import Image from "next/image";
import Link from "next/link";
import { Section, Silhouette } from "./cards";

const groupNames = { commissions: "Independent commissions", services: "Uniformed services" };

// One fact in the header: a small label over its value.
function Fact({ label, children }) {
  return (
    <div>
      <dt className="text-sm text-white/60">{label}</dt>
      <dd className="mt-1 text-[15px]">{children}</dd>
    </div>
  );
}

// A grid of people as silhouette cards, each with their seat or title.
function People({ people }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {people.map(([person, seat]) => (
        <li key={person} className="flex h-full items-center gap-5 rounded-3xl bg-white p-6 ring-1 ring-ink/10">
          <Silhouette className="size-16" />
          <div>
            <p className="text-lg font-medium tracking-tight">{person}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink/60">{seat}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

// A commission's or service's page. The header is a band in the body's own emblem colour, with the
// emblem on a white tile (most emblems would vanish on their own colour). Below it: the head,
// featured; the other members (or, for a service, who oversees it from its department); what it
// does; how it's organised. Sections alternate white and off-white. Bodies with no named leader yet
// show the header only. data-nav-surface keeps the nav smoky over the coloured band.
export default function ProfilePage({ profile }) {
  const { group, name, head, post, headNote, colour, emblem, line, members, oversight, duties, organisation, domain, restricted } =
    profile;

  const sections = restricted
    ? []
    : [
        {
          id: "leadership",
          title: "Leadership",
          body: (
            <div className="flex flex-col gap-8 rounded-3xl bg-[#f4f4f2] p-8 sm:flex-row sm:items-center lg:p-10">
              <Silhouette className="size-32 sm:size-40" />
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.14em] text-ink/50">{post}</p>
                <p className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">{head}</p>
                {headNote && <p className="mt-2 text-[15px] text-ink/60">{headNote}</p>}
              </div>
            </div>
          ),
        },
        members?.length && { id: "members", title: "Members", body: <People people={members} /> },
        oversight?.length && {
          id: "oversight",
          title: "Oversight",
          intro: "From the Department of Defence.",
          body: <People people={oversight} />,
        },
        {
          id: "duties",
          title: "What it does",
          body: (
            <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {duties.map((duty, i) => (
                <li key={duty} className="rounded-3xl bg-white p-8 ring-1 ring-ink/10">
                  <span className="text-sm text-ink/50">{String(i + 1).padStart(2, "0")}</span>
                  <p className="mt-6 text-lg leading-relaxed">{duty}</p>
                </li>
              ))}
            </ol>
          ),
        },
        {
          id: "organisation",
          title: "How it’s organised",
          body: (
            <dl className="divide-y divide-ink/10 border-y border-ink/10">
              {organisation.map(([label, text]) => (
                <div key={label} className="grid gap-2 py-6 md:grid-cols-[1fr_2fr] md:gap-12">
                  <dt className="text-lg font-medium tracking-tight">{label}</dt>
                  <dd className="text-[15px] leading-relaxed text-ink/60">{text}</dd>
                </div>
              ))}
            </dl>
          ),
        },
      ].filter(Boolean);

  return (
    <main className="text-ink">
      <header
        data-nav-surface="dark"
        style={{ backgroundColor: colour }}
        className="px-4 pb-20 pt-36 text-white sm:px-6 lg:pb-28 lg:pt-44"
      >
        <div className="mx-auto max-w-[1200px]">
          <Link href={`/${group}`} className="text-sm font-medium text-white/60 hover:text-white">
            {groupNames[group]}
          </Link>
          <div className="mt-8 w-fit rounded-3xl bg-white p-5">
            <Image
              src={emblem.src}
              alt=""
              width={emblem.width * 1.5}
              height={96}
              preload
              className="h-20 w-auto sm:h-24"
            />
          </div>
          <h1 className="mt-10 max-w-3xl text-balance text-5xl font-medium tracking-tight sm:text-7xl">{name}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">{line}</p>

          <dl className="mt-12 flex flex-wrap gap-x-12 gap-y-6">
            {/* the head has their own featured card below, unless there's no leader yet */}
            {restricted && <Fact label={post}>To be announced</Fact>}
            {domain && (
              <>
                <Fact label="Website">{domain}</Fact>
                <Fact label="Email">
                  <a href={`mailto:info@${domain}`} className="hover:text-white/80">
                    info@{domain}
                  </a>
                </Fact>
              </>
            )}
          </dl>
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
