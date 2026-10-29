// The documents published in the CSA Gazette, from the CSA's records and the Salaadheeb Salaamathee
// Council's (SSC). A document is listed only once it has been made: its PDF is in /public/gazette
// and its full text is transcribed in ./texts/<index>.json. Drafts and documents not yet written
// never appear here.
//
// `reference` is the document's own number as printed on it. `status` marks a document later
// documents partly override. SSC documents (the Salaadheeb Congress's among them) are in Dhivehi
// (`body: "ssc"`) and have their own section of the Gazette.
//
// `index` identifies a document internally: its publication date and its order that day
// (YYYYMMDDNN). Its place in the Gazette is worked out from that order (see `gazetted` below).

export const types = [
  { id: "framework", label: "Frameworks" },
  { id: "circular", label: "Circulars" },
  { id: "mandate", label: "Executive mandates" },
  { id: "founding", label: "Founding documents" },
];

// the SSC's section of the Gazette, after the CSA's own
export const ssc = { id: "ssc", label: "Salaadheeb Salaamathee Council" };

// each type's tag in the index row
export const typeTags = {
  framework: "Framework",
  circular: "Circular",
  mandate: "Executive mandate",
  founding: "Founding document",
  announcement: "Announcement",
  "press-release": "Press release",
};

const records = [
  {
    index: "2026010101",
    type: "framework",
    title: "Structural Framework of The Director’s Office",
    reference: "GZT/G1-2026",
    date: "2026-01-01",
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
  {
    index: "2026081801",
    body: "ssc",
    type: "announcement",
    title: "ސަލާދީބު ސަލާމަތީ ކައުންސިލްގެ އިސްވާރުންގެ އިޢުލާން",
    reference: "SSC(IUL)/01/EXEC/01",
    date: "2026-08-18",
    pdfs: [{ label: "View PDF", href: "/gazette/2026081801.pdf" }],
  },
  {
    index: "2026081802",
    body: "ssc",
    type: "announcement",
    title: "މަހަލްތީ ކޮމިޓީ އިފްތިތާޙު ކުރުމުގެ ބަޔާން",
    reference: "SSC(IUL)/01/EXEC/02",
    date: "2026-08-18",
    pdfs: [{ label: "View PDF", href: "/gazette/2026081802.pdf" }],
  },
  {
    index: "2026082101",
    body: "ssc",
    type: "announcement",
    title: "ސަލާދީބު ސަލާމަތީ ކައުންސިލުގެ މާލީ ސިޔާސަތު",
    reference: "SSC(IUL)/01/EXEC/03",
    date: "2026-08-21",
    pdfs: [{ label: "View PDF", href: "/gazette/2026082101.pdf" }],
  },
  {
    index: "2026082201",
    body: "ssc",
    type: "announcement",
    title: "ސަލާދީބު ސަލާމަތީ ކައުންސިލުގެ އިސްވެރިންގެ އިޢުލާން",
    reference: "SSC(IUL)/01/EXEC/04",
    date: "2026-08-22",
    pdfs: [{ label: "View PDF", href: "/gazette/2026082201.pdf" }],
  },
  {
    index: "2026083001",
    body: "ssc",
    type: "circular",
    title: "ސްކޫލް ނިންމާ ދަރިވަރުންނަށް ޢަމަލީ ތަޖުރިބާ އާއި ތަޢުލީމް ފޯރުކޮށްދޭ ޕްރޮގްރާމްގެ އުސޫލު",
    reference: "SSC(CIR)/02/PLC/05",
    date: "2026-08-30",
    pdfs: [{ label: "View PDF", href: "/gazette/2026083001.pdf" }],
  },
  {
    index: "2026090401",
    body: "ssc",
    type: "circular",
    title: "ކައުންސިލުގެ އުސޫލުތަކާއި ޤަވާއިދު",
    reference: "SSC(CIR)/02/INT/07",
    date: "2026-09-04",
    pdfs: [{ label: "View PDF", href: "/gazette/2026090401.pdf" }],
  },
  {
    index: "2026091101",
    body: "ssc",
    type: "press-release",
    title: "ނޫސް ބަޔާން",
    reference: "SSC(PR)/02/PLC/08",
    date: "2026-09-11",
    pdfs: [{ label: "View PDF", href: "/gazette/2026091101.pdf" }],
  },
  {
    index: "2026100601",
    body: "ssc",
    type: "circular",
    title: "ސަލާދީބު ކޮންގްރެސް އެކުލަވާލުމާއި ހިންގުމުގެ އުސޫލު",
    reference: "SSC(CIR)/02/PLC/11",
    date: "2026-10-06",
    pdfs: [{ label: "View PDF", href: "/gazette/2026100601.pdf" }],
  },
  {
    index: "2026101001",
    body: "ssc",
    type: "announcement",
    title: "މި އިދާރާގެ ގަވަރނިންގ ބޮޑީ އާއި އިސް-ކޮމީޓީތަކުގެ ހިންގާ ކޮމީޓީއަށް ކޮންގްރެސްގެ މަންދޫބުން އައްޔަނުކޮށް ފުރަތަމަ ދަޢުރުގެ ފުރަތަމަ ޖަލްސާގައި އިއްވި ނަންތަކާއި ނިންމި ނިންމުންތައް ޢާންމު ކުރުމާއި ގުޅޭ",
    reference: "SSC-CGR(IUL)/01/IDR/01",
    date: "2026-10-10",
    pdfs: [{ label: "View PDF", href: "/gazette/2026101001.pdf" }],
  },
  {
    index: "2026101201",
    body: "ssc",
    type: "announcement",
    title: "ކޮންގްރެސްގެ ފުރަތަމަ ދަޢުރުގެ ދެވަނަ ޖަލްސާގައި ކޮމިޓީތަކަށް އައްޔަނުކުރި މަންދޫބުންނާއި، ހުސްގޮނޑިތަކަށް އައްޔަނު ކުރެވުނު މަންދޫބުންނާއި އެކު ކޮންގްރެސްގެ މަންދޫބުންގެ ފުރިހަމަ ނަންތަކާއި، ފދ ދޖގައި ނިންމި ނިންމުންތައް ޢާންމު ކުރުމާއި ގުޅޭ",
    reference: "SSC-CGR(IUL)/01/IDR/02",
    date: "2026-10-12",
    pdfs: [{ label: "View PDF", href: "/gazette/2026101201.pdf" }],
  },
];

// The Gazette's numbering, worked out from publication order:
// - `serial` counts every document ever published, from 1, and never resets. It's the document's
//   address: /g/<serial>.
// - Volume 1 is the first half of 2026 (the Structural Framework is printed as Volume 1, Number
//   1); each half year after it is the next volume.
// - `number` counts the documents published in the year, from 1 each January, across both of its
//   volumes.
// - `gazetteRef` is CSA/G<volume>-<number>.
// The founding documents predate Volume 1: they take a serial, but no volume, number or Gazette
// reference.
// A document added later with an earlier date shifts the numbers of everything after it.
const FIRST_YEAR = 2026;

function gazetted(list) {
  const counts = {};
  return [...list]
    .sort((a, b) => a.index.localeCompare(b.index))
    .map((doc, i) => {
      const serial = i + 1;
      const [year, month] = doc.date.split("-").map(Number);
      if (year < FIRST_YEAR) return { ...doc, serial };
      const volume = (year - FIRST_YEAR) * 2 + (month <= 6 ? 1 : 2);
      const number = (counts[year] = (counts[year] ?? 0) + 1);
      return { ...doc, serial, volume, number, gazetteRef: `CSA/G${volume}-${number}` };
    });
}

export const documents = gazetted(records);

export const documentHref = (serial) => `/g/${serial}`;
export const documentBySerial = (serial) => documents.find((doc) => String(doc.serial) === String(serial));
export const documentByIndex = (index) => documents.find((doc) => doc.index === index);

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const formatDate = (iso) => dateFormat.format(new Date(`${iso}T00:00:00Z`));
