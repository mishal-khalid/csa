import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CtaButton from "@/components/CtaButton";
import ContentsColumn from "@/components/gazette/ContentsColumn";
import GazetteText from "@/components/gazette/GazetteText";
import { documentByIndex, documents, formatDate, typeTags } from "@/components/gazette/documents";
import { texts } from "@/components/gazette/texts";
import { contentsFor } from "@/components/gazette/toc";

// Every Gazette document is prerendered at /g/<index>. The address is read before rendering so an
// unknown one gets a real 404 (see the department pages for why instant is off).
export const instant = false;

export function generateStaticParams() {
  return documents.map(({ index }) => ({ index }));
}

export async function generateMetadata({ params }) {
  const { index } = await params;
  const doc = documentByIndex(index);
  if (!doc) return {};
  // its summary when it has one; otherwise what kind of document it is, its reference and its date
  const { type, reference, date, summary } = doc;
  const published = `${typeTags[type]}${reference ? ` ${reference}` : ""}, published in the CSA Gazette on ${formatDate(date)}.`;
  return { title: doc.title, description: summary ?? published };
}

// A Gazette document, laid out like a printed gazette: a masthead strip between rules (CSA Gazette,
// volume and number, date, reference), the title centred in the serif, buttons opening its PDFs in a
// new tab, a divider with the Gazette's eagle emblem across the page, then the full text in a single
// reading column, with a table of contents beside it for the long documents that have one.
// Documents not yet transcribed show their summary instead.
export default async function GazetteDocumentPage({ params }) {
  const { index } = await params;
  const doc = documentByIndex(index);
  if (!doc) notFound();

  const { title, type, reference, date, volume, number, status, summary, pdfs } = doc;
  const blocks = texts[index];
  const toc = contentsFor(index, blocks);

  return (
    <main className="bg-white px-4 pt-32 text-ink sm:px-6 lg:pt-40">
      <article>
        <div className="mx-auto max-w-4xl">
          <Link href="/gazette" className="text-sm font-medium text-ink/50 hover:text-ink">
            The CSA Gazette
          </Link>

          {/* the masthead strip */}
          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-y-2 border-ink py-3 text-sm">
            <span className="font-serif text-xl font-semibold">CSA Gazette</span>
            {volume && (
              <span className="text-ink/70">
                Volume {volume} · Number {number}
              </span>
            )}
            <span className="text-ink/70">{formatDate(date)}</span>
            <span className="tabular-nums text-ink/70">{reference ?? typeTags[type]}</span>
        </div>

        <header className="py-14 text-center lg:py-20">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-ink/50">
            {[typeTags[type], status].filter(Boolean).join(" · ")}
          </p>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            {title}
          </h1>
          {pdfs && (
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              {pdfs.map(({ label, href }) => (
                <CtaButton key={href} href={href} label={label} newTab />
              ))}
            </div>
          )}
        </header>
        </div>

        {/* the divider: a thin rule across the page with the eagle emblem in the middle */}
        <div aria-hidden="true" className="flex items-center gap-8">
          <span className="h-px flex-1 bg-ink/15" />
          <Image src="/images/gazette-emblem.png" alt="" width={562} height={491} className="h-24 w-auto sm:h-28" />
          <span className="h-px flex-1 bg-ink/15" />
        </div>

        {toc ? (
          <div className="mx-auto grid max-w-6xl gap-x-12 pt-14 lg:grid-cols-[15rem_minmax(0,1fr)]">
            <aside>
              <ContentsColumn entries={toc} />
            </aside>
            <div className="min-w-0">
              <GazetteText blocks={blocks} />
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl pt-14">
            {blocks ? (
              <GazetteText blocks={blocks} />
            ) : (
              <div className="mx-auto max-w-2xl text-center">
                <p className="font-serif text-2xl leading-relaxed">{summary}</p>
                <p className="mt-8 text-[15px] text-ink/50">The full text will be published here.</p>
              </div>
            )}
          </div>
        )}
      </article>
    </main>
  );
}
