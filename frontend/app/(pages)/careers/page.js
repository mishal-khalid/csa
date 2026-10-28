import Image from "next/image";
import Link from "next/link";
import CtaButton from "@/components/CtaButton";
import { Section } from "@/components/organisation/cards";
import { texts } from "@/components/gazette/texts";
import { blockId } from "@/components/gazette/toc";

// Draft copy, still to be approved. The paths, process and cadet details follow the CSA's documents.
const statement = "Serve the continents.";
const intro = "Careers at the Continental Security Agency.";

export const metadata = { title: "Careers", description: intro };

const paths = [
  {
    name: "Continental Security Service",
    short: "CSS",
    who: "For administrative staff and the CSA’s other employees.",
    text: "The CSA’s civil service, working across The Director’s Office, the departments and the bodies under the CSS Code of Conduct.",
  },
  {
    name: "Federal Agents",
    short: "FA",
    who: "For anyone with an active military title, in the CSA or the Continental Security Corps.",
    text: "Federal Agents serve under the Federal Agent Code of Conduct, with command, evaluation and discipline through the International Commanders Body.",
  },
  {
    name: "Executive Service",
    short: "ES",
    who: "For Executive Officers.",
    text: "The Director and Deputy Director, the Secretaries, Secretaries of State, Deputy Secretaries and their equivalents, under the Executive Officers’ Code of Conduct.",
  },
];

// The recruitment forms are appendices of the Structural Framework of The Director's Office in
// the Gazette; each step links straight to its form there.
const FRAMEWORK = "2026010101";
const formHref = (appendix) =>
  `/g/${FRAMEWORK}#${blockId(texts[FRAMEWORK].findIndex((b) => b.type === "heading" && b.text === appendix))}`;

const steps = [
  {
    title: "Check your eligibility",
    text: "Complete the Recruitment & Eligibility Point Assessment, which scores your education, experience and prior service.",
    form: { label: "Appendix 2 of the Structural Framework", href: formHref("Appendix 2") },
  },
  {
    title: "Apply",
    text: "Fill in the Application Form, with your personal details, contacts and declarations.",
    form: { label: "Appendix 3 of the Structural Framework", href: formHref("Appendix 3") },
  },
  {
    title: "Swear the affidavit",
    text: "Sign the Affidavit of Employment before an authorising officer.",
    form: { label: "Appendix 4 of the Structural Framework", href: formHref("Appendix 4") },
  },
  {
    title: "Appointment",
    text: "The Human Resources Commission handles recruitment, classification and appointments across the CSA, up to and including Executive Officers.",
  },
];

// The Careers page, a single page. Its header is a photo band (curved glass towers) with a short
// statement over it in white; data-nav-surface keeps the nav on smoky glass over the photo. Then the
// three ways to serve, how recruitment works, cadets and volunteers, and a way to contact the HRC.
export default function CareersPage() {
  return (
    <main className="text-ink">
      <header data-nav-surface="photo" className="relative isolate flex min-h-[80svh] items-end overflow-hidden px-4 pb-16 pt-40 text-white sm:px-6 lg:pb-24">
        <Image src="/images/careers-towers.jpg" alt="" fill preload sizes="100vw" className="-z-20 object-cover" />
        {/* darkens the bottom of the photo so the white text stays readable */}
        <span aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-ink/70 via-ink/20 to-transparent" />
        <div className="mx-auto w-full max-w-[1200px]">
          <h1 className="max-w-3xl text-balance text-6xl font-medium leading-[1.02] tracking-tight sm:text-8xl">
            {statement}
          </h1>
          <p className="mt-6 text-xl text-white/80">{intro}</p>
        </div>
      </header>

      <Section id="paths" title="Three ways to serve">
        <ul className="grid gap-3 lg:grid-cols-3">
          {paths.map(({ name, short, who, text }) => (
            <li key={name} className="flex h-full flex-col rounded-3xl bg-[#f4f4f2] p-8">
              <span className="text-sm font-medium tracking-[0.14em] text-ink/45">{short}</span>
              <h3 className="mt-8 text-2xl font-medium tracking-tight">{name}</h3>
              <p className="mt-3 text-[15px] font-medium leading-relaxed">{who}</p>
              <p className="mt-3 text-[15px] leading-relaxed text-ink/60">{text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="recruitment" title="How recruitment works" tone="grey">
        <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ title, text, form }, i) => (
            <li key={title} className="flex h-full flex-col rounded-3xl bg-white p-8 ring-1 ring-ink/10">
              <span className="text-sm text-ink/50">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-6 text-xl font-medium tracking-tight">{title}</h3>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-ink/60">{text}</p>
              {form && (
                <Link href={form.href} className="mt-6 text-sm font-medium underline underline-offset-4 hover:text-ink/70">
                  {form.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </Section>

      <Section id="cadets" title="Cadets and volunteers">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-3xl bg-[#f4f4f2] p-8">
            <h3 className="text-2xl font-medium tracking-tight">Join the Continental Security Corps</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-ink/60">
              The CSA’s cadet corps for school students aged 14 to 18, presented by the Department of Education and led by
              the Department of Defence.
            </p>
            <Link
              href="/services/security-corps"
              className="mt-6 inline-block text-sm font-medium underline underline-offset-4 hover:text-ink/70"
            >
              About the Corps
            </Link>
          </div>
          <div className="rounded-3xl bg-[#f4f4f2] p-8">
            <h3 className="text-2xl font-medium tracking-tight">Volunteer as a CSC Instructor</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-ink/60">
              Alumni and former cadets can return as volunteer instructors, holding warrant officer ranks from Warrant
              Officer Trainee to Executive Warrant Officer of the CSC.
            </p>
          </div>
        </div>
      </Section>

      <Section id="contact" title="Questions about working for the CSA?" intro="The Human Resources Commission can help." tone="grey">
        <CtaButton href="mailto:info@hrc.gov.csa" label="Contact the HRC" />
      </Section>
    </main>
  );
}
