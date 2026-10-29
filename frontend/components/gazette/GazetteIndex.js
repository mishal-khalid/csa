"use client";

import { useState } from "react";
import Link from "next/link";
import { documentHref, documents, formatDate, ssc, typeTags, types } from "./documents";

function SearchIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true" {...props}>
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13 13l3.5 3.5" />
    </svg>
  );
}

// A section title in italic serif between two thin rules.
function Divider({ children }) {
  return (
    <div className="flex items-center gap-6">
      <span className="h-px flex-1 bg-ink/15" />
      <h2 className="font-serif text-3xl italic text-ink sm:text-4xl">{children}</h2>
      <span className="h-px flex-1 bg-ink/15" />
    </div>
  );
}

// One document as an index row: date, type, title (with any status) and Gazette reference. The
// whole row opens the document's page. SSC titles are in Dhivehi, right to left in MV MAG Round.
function Row({ serial, body, type, title, gazetteRef, date, status }) {
  return (
    <li>
      <Link
        href={documentHref(serial)}
        className="-mx-4 grid gap-x-8 gap-y-2 rounded-2xl px-4 py-6 transition-colors duration-200 hover:bg-neutral-50 md:grid-cols-[8rem_11rem_minmax(0,1fr)_auto] md:items-baseline"
      >
      <p className="text-sm text-ink/50 tabular-nums">{formatDate(date)}</p>
      <p>
        <span className="rounded-full px-3 py-1 text-[13px] text-ink/70 ring-1 ring-ink/15">{typeTags[type]}</span>
      </p>
      <div>
        {body === "ssc" ? (
          <p lang="dv" dir="rtl" className="font-dhivehi-heading text-xl leading-relaxed">
            {title}
          </p>
        ) : (
          <p className="text-lg font-medium leading-snug tracking-tight">{title}</p>
        )}
        {status && <p className="mt-1 text-sm text-ink/50">{status}</p>}
      </div>
      <p className="text-sm text-ink/50 tabular-nums md:text-right">{gazetteRef ?? ""}</p>
      </Link>
    </li>
  );
}

const newestFirst = (a, b) => b.index.localeCompare(a.index);

// The Gazette's archive: a search bar and pills on top, then every matching document as an index
// row, newest first, under italic serif dividers: the CSA's documents in sections by type, then the
// SSC's in a section of their own. Each pill shows one section. The search covers titles and both
// references (the Gazette's and the document's own).
export default function GazetteIndex() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");

  const needle = query.trim().toLowerCase();
  const matches = documents.filter(
    (doc) => !needle || `${doc.title} ${doc.gazetteRef ?? ""} ${doc.reference ?? ""}`.toLowerCase().includes(needle),
  );
  const sections = [
    ...types.map((t) => ({ ...t, docs: matches.filter((doc) => !doc.body && doc.type === t.id) })),
    { ...ssc, docs: matches.filter((doc) => doc.body === "ssc") },
  ]
    .filter((section) => (type === "all" || section.id === type) && section.docs.length > 0)
    .map((section) => ({ ...section, docs: section.docs.sort(newestFirst) }));

  return (
    <div>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-ink/40" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or reference"
          aria-label="Search the Gazette"
          className="h-14 w-full rounded-full bg-neutral-100 pl-13 pr-6 text-[15px] text-ink outline-none ring-ink/20 placeholder:text-ink/40 focus:ring-2"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by type">
        {[{ id: "all", label: "All" }, ...types, ssc].map(({ id, label }) => {
          const selected = type === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              onClick={() => setType(id)}
              className={`rounded-full px-4 py-2 text-sm transition-colors duration-200 ${
                selected ? "bg-ink text-white" : "text-ink/70 ring-1 ring-ink/15 hover:text-ink hover:ring-ink/30"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-16 space-y-20">
        {sections.map(({ id, label, docs }) => (
          // the id lets other pages link to a type's section (e.g. the footer's /gazette#circular)
          <section key={id} id={id} aria-label={label} className="scroll-mt-32">
            <Divider>{label}</Divider>
            <ul className="mt-8 divide-y divide-ink/10 border-b border-ink/10">
              {docs.map((doc) => (
                <Row key={doc.index} {...doc} />
              ))}
            </ul>
          </section>
        ))}
        {sections.length === 0 && <p className="py-16 text-center text-lg text-ink/50">No documents match your search.</p>}
      </div>
    </div>
  );
}
