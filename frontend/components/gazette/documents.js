// The documents published in the CSA Gazette, from the CSA's records. Drafts never appear here.
// `status` marks a document later documents partly override; documents with no reference number
// predate the Gazette's numbering.
//
// Each document's page lives at /g/<index>: a 10-digit index made of its publication date and its
// order that day (YYYYMMDDNN), so the addresses stay stable and sort chronologically. Documents with
// a `pdf` have their full text transcribed in ./texts/<index>.json; the others show a `summary`
// (draft copy) until their full text is supplied.

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
    index: "2026101601",
    type: "framework",
    title: "Personnel and Leadership Framework of the Cabinet Departments",
    reference: "GZT/G2-2026",
    date: "2026-10-16",
    summary:
      "Sets out how the Cabinet’s departments are led: each department’s Secretary, Secretaries of State and Deputy Secretaries, and the Executive Director who heads its career service. It also separates the Judiciary from the Executive, establishes the Judicial Service Commission, and renames the Parliament of the CSA the Continental Assembly.",
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
    index: "2026101603",
    type: "circular",
    title: "Official Domains",
    reference: "CSA/TDO/2026/CIR/02",
    date: "2026-10-16",
    summary:
      "Sets the CSA’s official web address, csa.org, and its top-level domain, .csa; assigns each body its own domain; and sets the formats for official email addresses.",
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
    index: "2024092301",
    type: "founding",
    title: "Official Release of the United Continents",
    date: "2024-09-23",
    summary:
      "Establishes the United Continents, an international diplomatic and political organisation based in New York City, with its bodies and founding leadership.",
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
