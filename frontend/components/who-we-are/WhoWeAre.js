import EmblemMarquee from "./EmblemMarquee";
import { CommissionsIcon, DepartmentsIcon, ServicesIcon } from "./icons";

const heading = "Built on public trust";
const intro = "Each body has a clear remit, a named leader and a public record in the CSA Gazette.";

const cards = [
  {
    Icon: DepartmentsIcon,
    title: "Departments",
    text: "Each department leads one area of public life and is accountable for every decision it makes.",
  },
  {
    Icon: CommissionsIcon,
    title: "Independent commissions",
    text: "Commissions work at arm’s length from the executive, so oversight stays impartial.",
  },
  {
    Icon: ServicesIcon,
    title: "Uniformed services",
    text: "Disciplined services that protect the public, held to the same law as everyone else.",
  },
];

// The first section after the hero: a white sheet ruled into a grid, with the heading on top,
// a card for each kind of body, then the emblems of the independent bodies.
export default function WhoWeAre() {
  return (
    <section className="bg-white px-4 pb-24 pt-28 text-ink sm:px-6 lg:pb-48 lg:pt-36">
      <div className="mx-auto max-w-[1200px] border-x border-ink/10">
        <div className="px-6 py-14 sm:px-12 lg:py-20">
          <h2 className="max-w-3xl text-balance text-4xl font-medium tracking-tight sm:text-5xl">
            {heading}
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/60">{intro}</p>
        </div>

        <ul className="grid divide-y divide-ink/10 border-y border-ink/10 md:grid-cols-3 md:divide-x md:divide-y-0">
          {cards.map(({ Icon, title, text }) => (
            <li key={title} className="px-6 py-10 sm:px-12 sm:py-12">
              <span className="grid size-11 place-items-center rounded-xl bg-gold/10 text-gold ring-1 ring-gold/20">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-8 text-xl font-medium">{title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-ink/55">{text}</p>
            </li>
          ))}
        </ul>

        <div className="border-b border-ink/10">
          <EmblemMarquee />
        </div>
      </div>
    </section>
  );
}
