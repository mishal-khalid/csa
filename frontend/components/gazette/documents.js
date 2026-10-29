// The documents published in the CSA Gazette, from the CSA's records. A document is listed only once
// it has been made: its PDF is in /public/gazette and its full text is transcribed in
// ./texts/<index>.json. Drafts and documents not yet written never appear here. `status` marks a
// document later documents partly override; documents with no reference number predate the
// Gazette's numbering.
//
// Each document's page lives at /g/<index>: a 10-digit index made of its publication date and its
// order that day (YYYYMMDDNN), so the addresses stay stable and sort chronologically.

export const types = [
  { id: "framework", label: "Frameworks" },
  { id: "circular", label: "Circulars" },
  { id: "mandate", label: "Executive mandates" },
  { id: "founding", label: "Founding documents" },
];

// each type's tag in the index row
export const typeTags = {
  framework: "Framework",
  circular: "Circular",
  mandate: "Executive mandate",
  founding: "Founding document",
};

export const documents = [
  {
    index: "2026010101",
    type: "framework",
    title: "Structural Framework of The Director’s Office",
    reference: "GZT/G1-2026",
    date: "2026-01-01",
    volume: 1,
    number: 1,
    pdfs: [
      { label: "View PDF", href: "/gazette/2026010101.pdf" },
      { label: "View appendix", href: "/gazette/2026010101-appendix.pdf" },
    ],
  },
  {
    index: "2026101602",
    type: "circular",
    title: "Leadership of the Continental Security Agency",
    reference: "CSA/TDO/2026/CIR/01",
    date: "2026-10-16",
    pdfs: [{ label: "View PDF", href: "/gazette/2026101602.pdf" }],
  },
  {
    index: "2026101701",
    type: "mandate",
    title: "Executive Mandate on the Confirmation of Leadership",
    reference: "CSA/TDO/2026/EM/03",
    date: "2026-10-17",
    pdfs: [{ label: "View PDF", href: "/gazette/2026101701.pdf" }],
  },
  {
    index: "2024050201",
    type: "founding",
    title: "The Issue of International Security",
    date: "2024-05-02",
    status: "Partly superseded",
    pdfs: [{ label: "View PDF", href: "/gazette/2024050201.pdf" }],
  },
  {
    index: "2025040701",
    type: "founding",
    title: "1st Amendment of the Issue of International Security",
    date: "2025-04-07",
    status: "Partly superseded",
    pdfs: [{ label: "View PDF", href: "/gazette/2025040701.pdf" }],
  },
];

export const documentHref = (index) => `/g/${index}`;
export const documentByIndex = (index) => documents.find((doc) => doc.index === index);

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const formatDate = (iso) => dateFormat.format(new Date(`${iso}T00:00:00Z`));
