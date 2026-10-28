import Link from "next/link";
import { groupBySlug, groupHref } from "./groups";

const line = "bg-ink/15";

// One clickable box in the chart, opening that group's page.
function ChartBox({ slug }) {
  const { name, chartLabel } = groupBySlug(slug);
  return (
    <Link
      href={groupHref(slug)}
      className="block w-full rounded-2xl bg-white px-5 py-4 text-center ring-1 ring-ink/10 transition-colors duration-300 hover:bg-[#f4f4f2]"
    >
      <span className="block font-medium">{name}</span>
      <span className="mt-1 block text-sm text-ink/55">{chartLabel}</span>
    </Link>
  );
}

// How the groups relate: the CSA splits into three branches, the uniformed services sit under the
// executive, and the commissions stand apart from all three. On small screens it becomes a list.
export default function StructureChart() {
  return (
    <>
      <div className="hidden md:block">
        <div className="flex justify-center">
          <span className="rounded-2xl bg-ink px-6 py-4 font-medium text-white">Continental Security Agency</span>
        </div>
        <span className={`mx-auto block h-8 w-px ${line}`} />

        {/* the bar joins the centres of the three columns, then drops to each branch */}
        <div className="relative grid grid-cols-3">
          <span className={`absolute left-1/6 right-1/6 top-0 h-px ${line}`} />
          {["legislature", "exec", "judiciary"].map((slug) => (
            <div key={slug} className="flex flex-col items-center px-3">
              <span className={`h-8 w-px ${line}`} />
              <ChartBox slug={slug} />
            </div>
          ))}
        </div>

        {/* the uniformed services hang under the executive */}
        <div className="grid grid-cols-3">
          <div className="col-start-2 flex flex-col items-center px-3">
            <span className={`h-8 w-px ${line}`} />
            <ChartBox slug="services" />
          </div>
        </div>

        {/* the commissions stand apart from all three branches */}
        <div className="mt-10 rounded-3xl border border-dashed border-ink/25 p-3">
          <p className="pb-3 pt-1 text-center text-sm text-ink/55">Independent of all three branches</p>
          <ChartBox slug="commissions" />
        </div>
      </div>

      <ul className="space-y-3 md:hidden">
        {["legislature", "exec", "services", "judiciary", "commissions"].map((slug) => (
          <li key={slug} className={slug === "services" ? "ml-6" : undefined}>
            <ChartBox slug={slug} />
          </li>
        ))}
      </ul>
    </>
  );
}
