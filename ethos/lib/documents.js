// The documents on the Ethos documents portal (ethos.agee.pro, in-world ethos.com.csa).
//
// To add one: put the PDF in public/documents/<file>.pdf, add an entry below, then run
// `npm run previews` (macOS) to make its first-page image in public/previews/<file>.webp.
//
// Each tile links straight to the PDF, which opens in the browser's own PDF viewer.

// The sections, in the order they're shown. A company appears once it has a document.
export const companies = ["Ethos Group of Companies CPbc. LLC.", "Ethos Institute"];

export const documents = [
  {
    file: "egc-2026-01",
    company: "Ethos Group of Companies CPbc. LLC.",
    number: "EGC/2026/01",
    title: "Ethos Group of Companies Becomes the Core Public Beneficiary Company of the Continental Security Agency",
    date: "2026-11-12",
  },
  {
    file: "der-001-cir-2026-763",
    company: "Ethos Institute",
    number: "DER-001/CIR/2026/763",
    title: "Placement, Relocation and Restructuring of the Ethos Institute",
    date: "2026-11-17",
  },
];

export const pdfUrl = (doc) => `/documents/${doc.file}.pdf`;
export const previewUrl = (doc) => `/previews/${doc.file}.webp`;

// The sections with their documents, newest first within each.
export function byCompany() {
  const known = new Set(companies);
  const unknown = documents.map((d) => d.company).filter((c) => !known.has(c));
  if (unknown.length) throw new Error(`Add these companies to the list in lib/documents.js: ${[...new Set(unknown)].join(", ")}`);

  return companies
    .map((company) => ({
      company,
      documents: documents
        .filter((d) => d.company === company)
        .sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number)),
    }))
    .filter((section) => section.documents.length > 0);
}

// "12 Nov 2026"
export function shortDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
