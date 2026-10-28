import CountUp from "./CountUp";
import { BranchesIcon, GlobeIcon } from "./icons";
import { DepartmentsIcon } from "@/components/who-we-are/icons";

const heading = "The CSA in numbers";

const featured = { Icon: DepartmentsIcon, value: 12, label: "Cabinet departments" };
const others = [
  { Icon: BranchesIcon, value: 3, label: "Branches of government" },
  { Icon: GlobeIcon, value: 2, label: "Nations in the CSA’s scope" },
];

// The CSA's key figures: one big dark red card and two smaller light ones, each over a faint grid.
// Sits on off-white so it reads apart from the white sections either side.
export default function Stats() {
  return (
    <section className="bg-neutral-50 px-4 py-24 text-ink sm:px-6 lg:py-48">
      <div className="mx-auto max-w-[1200px]">
        <h2 className="text-center text-4xl font-medium tracking-tight sm:text-5xl">{heading}</h2>

        <ul className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
          <li className="relative isolate flex min-h-[22rem] flex-col justify-between overflow-hidden rounded-3xl bg-maroon p-8 text-cream sm:col-span-2 lg:col-span-1 lg:min-h-[28rem]">
            <span aria-hidden="true" className="grid-texture absolute inset-0 -z-10 text-cream/[0.07]" />
            <featured.Icon className="size-8" />
            <p className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <span className="text-[9rem] font-light leading-[0.8] tracking-tighter tabular-nums sm:text-[12rem]">
                <CountUp value={featured.value} />
              </span>
              <span className="max-w-40 text-lg leading-snug text-cream/70">{featured.label}</span>
            </p>
          </li>

          {others.map(({ Icon, value, label }) => (
            <li
              key={label}
              className="relative isolate flex min-h-[18rem] flex-col justify-between overflow-hidden rounded-3xl bg-[#f4f4f2] p-8 ring-1 ring-ink/5 lg:min-h-[28rem]"
            >
              <span aria-hidden="true" className="grid-texture absolute inset-0 -z-10 text-ink/[0.05]" />
              <Icon className="size-8 text-maroon" />
              <p>
                <span className="block text-7xl font-medium tracking-tight text-maroon tabular-nums">
                  <CountUp value={value} />
                </span>
                <span className="mt-3 block max-w-40 text-base leading-snug text-ink/70">{label}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
