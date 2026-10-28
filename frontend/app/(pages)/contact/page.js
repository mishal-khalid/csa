import Image from "next/image";
import { Section } from "@/components/organisation/cards";
import MessageForm from "@/components/contact/MessageForm";
import { address, contacts } from "@/components/contact-details";

const intro = "Write to The Director’s Office about anything to do with the CSA.";

export const metadata = { title: "Contact", description: intro };

// The Contact page. Its header is the building photo across the full width with the title over it
// in white (data-nav-surface keeps the nav on smoky glass there), and a white card overlapping the
// photo's bottom edge with the headquarters' address, hotline, phone and email. Then a message form.
export default function ContactPage() {
  return (
    <main className="text-ink">
      <header data-nav-surface="photo" className="relative isolate flex min-h-[75svh] items-end overflow-hidden px-4 pb-48 pt-40 text-white sm:px-6 lg:pb-56">
        <Image src="/images/contact-building.jpg" alt="" fill preload sizes="100vw" className="-z-20 object-cover" />
        {/* darkens the photo (most at the bottom) and shadows the title, so the white title stays
            readable over the pale building */}
        <span aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-ink/70 via-ink/35 to-ink/10" />
        <div className="mx-auto w-full max-w-[1200px]">
          <h1 className="text-6xl font-medium tracking-tight text-shadow-[0_2px_24px_rgba(11,11,12,0.35)] sm:text-8xl">
            Contact the CSA
          </h1>
        </div>
      </header>

      {/* the headquarters card, overlapping the photo's bottom edge */}
      <div className="relative z-10 -mt-36 px-4 sm:px-6 lg:-mt-40">
        <address className="mx-auto grid max-w-[1200px] gap-10 rounded-3xl bg-white p-8 not-italic shadow-[0_24px_60px_-24px_rgba(11,11,12,0.35)] ring-1 ring-ink/5 sm:p-10 md:grid-cols-[1.2fr_2fr] lg:p-12">
          <div>
            <p className="text-sm text-ink/50">Headquarters</p>
            <p className="mt-3 text-xl leading-relaxed">
              {address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
          </div>
          <dl className="grid gap-6 sm:grid-cols-3">
            {contacts.map(({ label, value, href }) => (
              <div key={label}>
                <dt className="text-sm text-ink/50">{label}</dt>
                <dd className="mt-3 text-xl">
                  <a href={href} className="hover:text-ink/70">
                    {value}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </address>
      </div>

      <Section id="message" title="Send a message" intro={intro}>
        <div className="max-w-3xl">
          <MessageForm />
        </div>
      </Section>
    </main>
  );
}
