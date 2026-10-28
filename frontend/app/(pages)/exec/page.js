import Image from "next/image";
import CtaButton from "@/components/CtaButton";
import { BodyGrid, PersonTile, Section } from "@/components/organisation/cards";
import { departments, directorsOffice, justiceOffices } from "@/components/organisation/directory";

// Draft copy, still to be approved.
const intro = "The Director’s Office leads the CSA, and the Cabinet’s twelve departments carry out its work.";

export const metadata = { title: "The Executive", description: intro };

// The Executive's page. Its header is centred on the black CSA insignia.
export default function ExecutivePage() {
  return (
    <main className="text-ink">
      <header className="bg-white px-4 pb-8 pt-36 text-center sm:px-6 lg:pt-44">
        <Image
          src="/brand/CSA_Insignia_Black.svg"
          alt=""
          width={150}
          height={160}
          preload
          className="mx-auto h-36 w-auto sm:h-44"
        />
        <h1 className="mt-10 text-5xl font-medium tracking-tight sm:text-7xl">The Executive</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink/60">{intro}</p>
      </header>

      <Section id="directors-office" title="The Director’s Office">
        <ul className="grid gap-3 md:grid-cols-3">
          {directorsOffice.people.map((person) => (
            <li key={person.name}>
              <PersonTile {...person} />
            </li>
          ))}
        </ul>
        <div className="mt-12 flex justify-center">
          <CtaButton href={directorsOffice.href} label="About the DO" />
        </div>
      </Section>

      <Section id="cabinet" title="The Cabinet" intro="Twelve departments, each led by a member of the Cabinet." tone="grey">
        <BodyGrid items={departments} />
      </Section>

      <Section id="justice-offices" title="Within the Department of Justice">
        <BodyGrid items={justiceOffices} />
      </Section>
    </main>
  );
}
