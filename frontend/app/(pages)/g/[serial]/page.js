import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import CtaButton from "@/components/CtaButton";
import ContentsColumn from "@/components/gazette/ContentsColumn";
import GazetteText from "@/components/gazette/GazetteText";
import { documentByIndex, documentBySerial, documentHref, documents, formatDate, typeTags } from "@/components/gazette/documents";
import { texts } from "@/components/gazette/texts";
import { contentsFor } from "@/components/gazette/toc";

// Every Gazette document is prerendered at /g/<serial>. The address is read before rendering so an
// unknown one gets a real 404 (see the department pages for why instant is off).
export const instant = false;

export function generateStaticParams() {
  return documents.map(({ serial }) => ({ serial: String(serial) }));
}

export async function generateMetadata({ params }) {
  const { serial } = await params;
  const doc = documentBySerial(serial);
  if (!doc) return {};
  // what kind of document it is, its reference and its date
  const { type, reference, date } = doc;
  const published = `${typeTags[type]}${reference ? ` ${reference}` : ""}, published in the CSA Gazette on ${formatDate(date)}.`;
  return { title: doc.title, description: published };
}

// A Gazette document, laid out like a printed gazette: a masthead strip between rules (CSA Gazette,
// volume and number, date, Gazette reference), the title centred, buttons opening its PDFs in a new
// tab, a divider with the Gazette's eagle emblem across the page, then the full text in a single
// reading column, with a table of contents beside it for the long documents that have one.
// The SSC's documents are in Dhivehi: their title and text run right to left in Faruma and MV MAG
// Round, inside the same English frame.
export default async function GazetteDocumentPage({ params }) {
  const { serial } = await params;
  const doc = documentBySerial(serial);
  if (!doc) {
    // addresses from before the Gazette was renumbered used the document's index
    const moved = documentByIndex(serial);
    if (moved) permanentRedirect(documentHref(moved.serial));
    notFound();
  }

  const { index, title, type, reference, date, volume, number, gazetteRef, status, pdfs } = doc;
  const dhivehi = doc.body === "ssc";
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
            <span className="tabular-nums text-ink/70">{gazetteRef ?? typeTags[type]}</span>
          </div>

          <header className="py-14 text-center lg:py-20">
            {/* what it is, its own printed number, and any status */}
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-ink/50">
              {[typeTags[type], reference, status].filter(Boolean).join(" · ")}
            </p>
            {dhivehi ? (
              <h1
                lang="dv"
                dir="rtl"
                className="mx-auto mt-6 max-w-3xl text-balance font-dhivehi-heading text-4xl leading-[1.5] sm:text-5xl sm:leading-[1.5]"
              >
                {title}
              </h1>
            ) : (
              <h1 className="mx-auto mt-5 max-w-3xl text-balance font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
                {title}
              </h1>
            )}
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
          // right to left for Dhivehi, so the contents sit on the right
          <div
            dir={dhivehi ? "rtl" : undefined}
            className="mx-auto grid max-w-6xl gap-x-12 pt-14 lg:grid-cols-[15rem_minmax(0,1fr)]"
          >
            <aside lang={dhivehi ? "dv" : undefined}>
              <ContentsColumn entries={toc} dhivehi={dhivehi} />
            </aside>
            <div className="min-w-0">
              <GazetteText blocks={blocks} dhivehi={dhivehi} />
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl pt-14">
            <GazetteText blocks={blocks} dhivehi={dhivehi} />
          </div>
        )}
      </article>
    </main>
  );
}
