import { byCompany, pdfUrl, previewUrl, shortDate } from "@/lib/documents";

const EMAIL = "hello@ethos.com.csa";

export default function Home() {
  const sections = byCompany();

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 sm:px-8">
      <header className="pt-10 sm:pt-14">
        {/* eslint-disable-next-line @next/next/no-img-element -- a small SVG, nothing to optimise */}
        <img src="/brand/ethos-lockup.svg" alt="Ethos Group of Companies" width={964} height={294} className="h-11 w-auto sm:h-14" />
        <hr className="mt-8 border-neutral-200 sm:mt-10" />
        <h1 className="mt-8 text-3xl font-medium tracking-tight sm:mt-10 sm:text-4xl">Documents</h1>
      </header>

      <main className="flex-1 pb-24">
        {sections.length === 0 ? (
          <p className="mt-10 text-neutral-500">No documents yet.</p>
        ) : (
          sections.map(({ company, documents }) => (
            <section key={company} aria-labelledby={slug(company)} className="mt-12 sm:mt-14">
              <h2 id={slug(company)} className="text-sm font-medium text-neutral-500">
                {company}
              </h2>
              <ul className="mt-5 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-4">
                {documents.map((doc) => (
                  <li key={doc.file}>
                    <a
                      href={pdfUrl(doc)}
                      className="group block rounded-sm outline-offset-4 focus-visible:outline-2 focus-visible:outline-dill"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP, see scripts/previews.mjs */}
                      <img
                        src={previewUrl(doc)}
                        alt=""
                        width={800}
                        height={1132}
                        loading="lazy"
                        className="aspect-[1/1.415] w-full border border-neutral-200 object-cover object-top"
                      />
                      <p className="mt-3 text-[15px] leading-snug font-medium">{doc.title}</p>
                      <p className="mt-1.5 text-sm text-neutral-500">
                        {doc.number} · {shortDate(doc.date)}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>

      <footer className="border-t border-neutral-200 py-8 text-sm text-neutral-500">
        <a href={`mailto:${EMAIL}`} className="hover:text-ink">
          {EMAIL}
        </a>
      </footer>
    </div>
  );
}

function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
