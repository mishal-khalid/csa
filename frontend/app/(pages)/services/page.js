import Image from "next/image";
import { BodyGrid, Section } from "@/components/organisation/cards";
import { services } from "@/components/organisation/directory";

// Draft copy, still to be approved.
const intro = "The armed forces, the cadet corps and law enforcement, under the Executive.";

export const metadata = { title: "Uniformed services", description: intro };

// The services' page. Its header is a black band with rounded bottom corners and the three emblems.
// data-nav-surface tells the nav it's over a dark section.
export default function ServicesPage() {
  return (
    <main className="text-ink">
      <header
        data-nav-surface="dark"
        className="rounded-b-[40px] bg-ink px-4 pb-24 pt-36 text-white sm:px-6 lg:pb-32 lg:pt-44"
      >
        <div className="mx-auto max-w-[1200px]">
          <div className="flex items-center gap-6 sm:gap-8">
            {services.map(({ name, emblem }) => (
              <Image
                key={name}
                src={emblem.src}
                alt=""
                width={emblem.width * 1.5}
                height={96}
                preload
                className="h-16 w-auto sm:h-24"
              />
            ))}
          </div>
          <h1 className="mt-12 text-5xl font-medium tracking-tight sm:text-7xl">Uniformed services</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/60">{intro}</p>
        </div>
      </header>

      <Section id="the-services" title="The services">
        <BodyGrid items={services} />
      </Section>
    </main>
  );
}
