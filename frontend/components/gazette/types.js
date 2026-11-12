// What the Gazette's pages share, on the server and in the browser alike.

// The Gazette's sections, in order: the five types of Director's Order Number 01/2026 under the
// names of Director's Order Number 02/2026, then the kinds published before them. (The SSC's own
// documents have a section of their own, after these.)
export const types = [
  { id: "act", label: "Acts" },
  { id: "order", label: "President’s Orders" },
  { id: "regulation", label: "Regulations" },
  { id: "guideline", label: "Guidelines" },
  { id: "notice", label: "Notices" },
  { id: "circular", label: "Circulars" },
  { id: "mandate", label: "Executive mandates" },
  { id: "founding", label: "Founding documents" },
];

// the SSC's section of the Gazette, after the CSA's own
export const ssc = { id: "ssc", label: "Salaadheeb Salaamathee Council" };

export const documentHref = (serial) => `/g/${serial}`;

// A document's title as the Gazette's index lists it. Acts, Orders, Regulations and Guidelines carry
// their number, the way the Maldives Gazette lists its documents: "Guideline Number: G-1/2026
// (Organisational Structure of the CSA Public Companies Authority)". The number is the one in the
// document's reference, under its type's name, so an Act whose reference was printed "Issue Number
// 2/2026" reads "Act Number: 2/2026". Notices, the kinds from before the five types, and a document
// whose reference has no number (the first Act's "GZT/G1-2026") keep their plain titles: the user's
// picks. A Dhivehi text's number is in Dhivehi, as on its cover.
const NUMBERED = new Set(["act", "order", "regulation", "guideline"]);
const DHIVEHI_NUMBER = { order: "ރަޢީސުލްވަކާލާގެ ޤަރާރު ނަންބަރު" };

export function listedTitle({ type, language, tag, reference, title }) {
  const number = NUMBERED.has(type) ? reference?.match(/ Number (\S+)$/)?.[1] : null;
  const label = language === "dv" ? DHIVEHI_NUMBER[type] : `${tag} Number`;
  return number && label ? `${label}: ${number} (${title})` : title;
}

// What an index row shows on its right: the document's place in the Gazette, or for a Notice the
// office that issued it (as the Maldives Gazette shows a notice's office).
export function listedPlace({ type, issuingBody, volume, number }) {
  if (type === "notice") return issuingBody ?? "";
  return volume ? `Volume ${volume} · Number ${number}` : "";
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const formatDate = (iso) => dateFormat.format(new Date(`${iso}T00:00:00Z`));
