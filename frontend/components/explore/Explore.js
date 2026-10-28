import Link from "next/link";

const heading = "Explore the CSA";
const statement = "Find your way around.";

// Draft tile copy, still to be approved.
const organisation = {
  title: "Organisation",
  text: "How the CSA fits together: its branches, departments, commissions and services.",
  href: "/organisation",
};
const careers = {
  title: "Careers",
  text: "Work for the CSA: in its service, as a Federal Agent, or in the Executive Service.",
  href: "/careers",
};
const leadership = {
  title: "Leadership",
  text: "The Director, the Deputy Director and the Cabinet.",
  href: "/leadership",
};
const gazette = {
  title: "The Gazette",
  text: "Every framework, circular and mandate, published in the open.",
  href: "/gazette",
};

// The leadership cluster: the Director and Deputy Director large, then Cabinet secretaries in
// department order, then a chip for the rest of the Cabinet. size is px; x and y place the chip's
// top-left corner inside the 256 by 192 cluster.
const chips = [
  { initials: "EH", tone: "lead", size: 88, x: 84, y: 0 },
  { initials: "JM", tone: "lead", size: 72, x: 150, y: 104 },
  { initials: "DL", tone: "cabinet", size: 52, x: 22, y: 26 },
  { initials: "ZM", tone: "cabinet", size: 44, x: 190, y: 14 },
  { initials: "LV", tone: "cabinet", size: 48, x: 28, y: 104 },
  { initials: "HA", tone: "cabinet", size: 40, x: 96, y: 112 },
  { initials: "GA", tone: "cabinet", size: 36, x: 0, y: 72 },
  { initials: "+7", tone: "more", size: 36, x: 214, y: 66 },
];

const toneClasses = {
  lead: "bg-gold text-ink text-xl",
  cabinet: "bg-white/10 text-white ring-1 ring-white/15 text-sm",
  more: "bg-maroon text-cream text-xs",
};

const greyTile =
  "flex flex-col justify-end rounded-3xl bg-[#f4f4f2] p-8 transition-colors duration-300 hover:bg-[#ececea]";

function TileText({ title, text, muted = "text-ink/60" }) {
  return (
    <>
      <h3 className="text-2xl font-medium tracking-tight">{title}</h3>
      <p className={`mt-2 max-w-sm text-[15px] leading-relaxed ${muted}`}>{text}</p>
    </>
  );
}

// A bento of ways into the site: a dark red statement tile, then a tile for each main page.
// Four columns on desktop: statement, Organisation, Careers on top; Leadership and the Gazette below.
export default function Explore() {
  return (
    <section className="bg-white px-4 py-24 text-ink sm:px-6 lg:py-48">
      <div className="mx-auto max-w-[1200px]">
        <h2 className="text-center text-4xl font-medium tracking-tight sm:text-5xl">{heading}</h2>

        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:auto-rows-[18rem] lg:grid-cols-4">
          <div className="flex min-h-56 items-center rounded-3xl bg-maroon p-8 text-cream sm:col-span-2">
            <p className="max-w-sm text-5xl font-semibold leading-[1.05] tracking-tight">{statement}</p>
          </div>

          <Link href={organisation.href} className={`${greyTile} min-h-56`}>
            <TileText {...organisation} />
          </Link>
          <Link href={careers.href} className={`${greyTile} min-h-56`}>
            <TileText {...careers} />
          </Link>

          <Link
            href={leadership.href}
            className="flex min-h-72 flex-col justify-between gap-8 rounded-3xl bg-ink p-8 text-white transition-colors duration-300 hover:bg-ink/90 sm:col-span-2 md:flex-row md:items-center"
          >
            <div>
              <TileText {...leadership} muted="text-white/60" />
            </div>
            <div aria-hidden="true" className="relative h-48 w-64 shrink-0 self-center">
              {chips.map(({ initials, tone, size, x, y }) => (
                <span
                  key={initials}
                  className={`absolute grid place-items-center rounded-full font-medium ${toneClasses[tone]}`}
                  style={{ width: size, height: size, left: x, top: y }}
                >
                  {initials}
                </span>
              ))}
            </div>
          </Link>

          <Link href={gazette.href} className={`${greyTile} min-h-56 sm:col-span-2`}>
            <TileText {...gazette} />
          </Link>
        </div>
      </div>
    </section>
  );
}
