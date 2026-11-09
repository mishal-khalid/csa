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

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const formatDate = (iso) => dateFormat.format(new Date(`${iso}T00:00:00Z`));
