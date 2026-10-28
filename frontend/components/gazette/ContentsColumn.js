// A document's table of contents. On large screens it's a sticky column beside the text (scrolling
// on its own when long; data-lenis-prevent lets the wheel scroll it rather than the page). On smaller
// screens it's a collapsible "Contents" box above the text.

function Entries({ entries }) {
  return (
    <ol className="space-y-1">
      {entries.map(({ href, label, sub, level }) => (
        <li key={href} className={level === 2 ? "pl-4" : undefined}>
          <a href={href} className="block rounded-lg px-3 py-2 transition-colors duration-200 hover:bg-neutral-50">
            <span className={`block leading-snug ${level === 2 ? "text-[13px] text-ink/60" : "text-sm font-medium"}`}>
              {label}
            </span>
            {sub && <span className="mt-0.5 block text-[13px] leading-snug text-ink/50">{sub}</span>}
          </a>
        </li>
      ))}
    </ol>
  );
}

export default function Contents({ entries }) {
  return (
    <>
      <details className="mb-12 rounded-2xl ring-1 ring-ink/10 lg:hidden">
        <summary className="cursor-pointer px-5 py-4 text-sm font-medium">Contents</summary>
        <nav aria-label="Contents" className="px-2 pb-3">
          <Entries entries={entries} />
        </nav>
      </details>

      <nav
        aria-label="Contents"
        data-lenis-prevent
        className="sticky top-28 hidden max-h-[calc(100svh-8rem)] overflow-y-auto pr-2 lg:block"
      >
        <p className="px-3 pb-3 text-xs font-medium uppercase tracking-[0.14em] text-ink/45">Contents</p>
        <Entries entries={entries} />
      </nav>
    </>
  );
}
