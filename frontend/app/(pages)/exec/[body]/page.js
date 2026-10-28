import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Section, Silhouette } from "@/components/organisation/cards";
import { departmentBySlug, departments } from "@/components/organisation/departments";

// Department pages: the twelve are prerendered; any other address under /exec is a 404. (The
// Director's Office, AGO and PGO have their own folders, which take priority over this route.)
export function generateStaticParams() {
  return departments.map(({ slug }) => ({ body: slug }));
}

export async function generateMetadata({ params }) {
  const { body } = await params;
  const department = departmentBySlug(body);
  return { title: department?.name, description: department?.line };
}

// The page reads its address before rendering so an unknown address gets a real 404 status
// (dynamicParams isn't available with Cache Components). Every department is prerendered above,
// so navigating to one stays quick; this turns off the dev warning about the blocking read.
export const instant = false;

// One fact in the header: a small label over its value, which can be a link.
function Fact({ label, children }) {
  return (
    <div>
      <dt className="text-sm text-ink/50">{label}</dt>
      <dd className="mt-1 text-[15px]">{children}</dd>
    </div>
  );
}

// titles go by department: "Secretary of State for Defence"; the AG and PG keep their own titles
const leadTitle = (leadPost, portfolio) =>
  leadPost === "Secretary of State" ? `Secretary of State for ${portfolio}` : leadPost;

// A department's page. Every department shares this template: an off-white band with the name very
// large over a huge, faint insignia; then its people in rank order: the Secretary featured, a grid of
// Secretaries of State, a grid of Deputy Secretaries, then the Executive Director. Restricted
// departments stop after the Secretary.
export default async function DepartmentPage({ params }) {
  const { body } = await params;
  const department = departmentBySlug(body);
  if (!department) notFound();

  const { name, head, post, portfolio, line, executiveDirector, domain, policies, restricted } = department;
  const deputies = policies.flatMap((policy) => policy.parts.map((part) => ({ ...part, policy: policy.name })));

  return (
    <main className="text-ink">
      <header className="relative isolate overflow-hidden bg-neutral-50 px-4 pb-20 pt-36 sm:px-6 lg:pb-28 lg:pt-44">
        {/* the insignia as a watermark, bleeding off the right edge */}
        <Image
          src="/brand/CSA_Insignia_Black.svg"
          alt=""
          width={600}
          height={640}
          preload
          className="absolute -right-24 top-1/2 -z-10 h-[130%] w-auto -translate-y-1/2 opacity-[0.05] sm:-right-16"
        />
        <div className="mx-auto max-w-[1200px]">
          <Link href="/exec" className="text-sm font-medium text-ink/50 hover:text-ink">
            The Executive
          </Link>
          <h1 className="mt-4 max-w-3xl text-balance text-5xl font-medium tracking-tight sm:text-7xl">{name}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/60">{line}</p>

          {domain && (
            <dl className="mt-12 flex flex-wrap gap-x-12 gap-y-6">
              <Fact label="Website">{domain}</Fact>
              <Fact label="Email">
                <a href={`mailto:info@${domain}`} className="hover:text-ink/70">
                  info@{domain}
                </a>
              </Fact>
            </dl>
          )}
        </div>
      </header>

      <Section id="leadership" title="Leadership">
        {/* the Secretary, featured on their own */}
        <div className="flex flex-col gap-8 rounded-3xl bg-[#f4f4f2] p-8 sm:flex-row sm:items-center lg:p-10">
          <Silhouette className="size-32 sm:size-40" />
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-ink/50">{post}</p>
            <p className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">{head}</p>
          </div>
        </div>
      </Section>

      {!restricted && (
        <>
          <Section id="secretaries-of-state" title="Secretaries of State" tone="grey">
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {policies.map((policy) => (
                <li key={policy.name} className="flex h-full items-center gap-5 rounded-3xl bg-white p-6 ring-1 ring-ink/5">
                  <Silhouette className="size-16" />
                  <div>
                    <p className="text-lg font-medium tracking-tight">{policy.lead}</p>
                    <p className="mt-1 text-sm text-ink/60">{leadTitle(policy.leadPost, portfolio)}</p>
                    <p className="text-[13px] text-ink/45">{policy.name}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="deputy-secretaries" title="Deputy Secretaries">
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {deputies.map(({ deputy, part, policy }) => (
                <li key={`${policy}-${part}`} className="flex h-full items-center gap-4 rounded-2xl p-5 ring-1 ring-ink/10">
                  <Silhouette className="size-12" />
                  <div>
                    <p className="text-[15px] font-medium">{deputy}</p>
                    <p className="mt-0.5 text-sm text-ink/60">Deputy Secretary for {portfolio}</p>
                    <p className="text-[13px] text-ink/45">{part}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          {/* ranked after the Deputy Secretaries: the head of the department's career service */}
          {executiveDirector && (
            <Section
              id="executive-director"
              title="Executive Director"
              intro="Heads the department’s career service."
              tone="grey"
            >
              <div className="flex w-full items-center gap-4 rounded-2xl bg-white p-5 ring-1 ring-ink/5 sm:max-w-sm">
                <Silhouette className="size-12" />
                <p className="text-[15px] font-medium">{executiveDirector}</p>
              </div>
            </Section>
          )}
        </>
      )}
    </main>
  );
}
