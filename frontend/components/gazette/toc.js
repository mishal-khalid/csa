// The table of contents beside each long Gazette document. Each entry points at a chapter or
// heading in the transcribed text by its exact printed `match`; entries are matched in order, so a
// repeated heading (e.g. the two printed "Appendix 19"s) lands on the right one. `label` and `sub`
// are what the contents column shows; `level: 2` indents an entry under the one before.
// Short documents have no contents list.

const chapters = (list) => list.map(([match, label, sub]) => ({ match, label, sub }));

export const contents = {
  // Structural Framework of The Director's Office
  2026010101: chapters([
    ["First Chapter", "First Chapter", "Introduction"],
    ["Second Chapter", "Second Chapter", "Rules and Regulations of Employment"],
    ["Third Chapter", "Third Chapter", "Requirements of Employment"],
    ["Fourth Chapter", "Fourth Chapter", "Executive Roles and Organizational Structure"],
    ["Fifth Chapter", "Fifth Chapter", "The Cabinet"],
    [
      "Sixth Chapter",
      "Sixth Chapter",
      "Interdepartmental and Intergovernmental Executive Representation Framework",
    ],
    ["Seventh Chapter", "Seventh Chapter", "Definitions and Interpretations"],
    ["Eighth Chapter", "Eighth Chapter", "Signatories of Approval"],
    ["Appendix 1", "Appendix 1", "Salary Composition Framework"],
    ["Appendix 2", "Appendix 2", "Filled Model Recruitment & Eligibility Point Assessment Form"],
    ["Appendix 3", "Appendix 3", "Filled Model Application Form – Personal Details"],
    ["Appendix 4", "Appendix 4", "Filled Model Affidavit of Employment"],
    ["Appendix 5", "Appendix 5"],
    ["Mandated by Issue no. GZT/G1-2026", "Mandated by Issue no. GZT/G1-2026"],
  ]),

  // Leadership of the Continental Security Agency (CIR/01)
  2026101602: [
    { match: "Chapter I – The Cabinet and Senior Counsel", label: "Chapter I", sub: "The Cabinet and Senior Counsel" },
    { match: "Chapter 2 – Departmental Leadership", label: "Chapter 2", sub: "Departmental Leadership" },
    ...[
      "Department of Defence",
      "Department of Foreign Affairs",
      "Department of Internal Affairs",
      "International Intelligence Council",
      "Department of Justice",
      "Department of Homeland Security",
      "Department of Education",
      "Department of Health and Welfare",
      "Department of Culture and Youth",
      "Department of Economy and Trade",
      "Department of Infrastructure",
      "Department of Environment and Resources",
    ].map((name) => ({ match: name, label: name, level: 2 })),
    {
      match: "Chapter 3 – CSA Judicial Service Commission and the Judiciary",
      label: "Chapter 3",
      sub: "CSA Judicial Service Commission and the Judiciary",
    },
    { match: "Effect", label: "Effect" },
  ],

  // Executive Mandate on the Confirmation of Leadership (EM/03)
  2026101701: [
    { match: "Executive Mandate", label: "Executive Mandate", sub: "Confirmation of Cabinet and Institutional Leadership" },
    ...[
      "Department of Defence",
      "Department of Foreign Affairs",
      "Department of Internal Affairs",
      "International Intelligence Council",
      "Department of Justice",
      "Department of Homeland Security",
      "Continental Armed Forces",
      "Continental Security Corps",
      "Continental Law Enforcement Authority",
      "Attorney General’s Office and the Universal Board of Legal Affairs",
      "Department of Education",
      "Department of Health and Welfare",
      "Department of Culture and Youth",
      "Department of Economy and Trade",
      "Department of Infrastructure",
      "Department of Environment and Resources",
      "Prosecutor General’s Office",
      "CSA Human Resources Commission",
      "Civic Affairs Commission",
      "CSA Judicial Service Commission",
    ].map((body, i) => {
      // the last two instruments are both printed "Appendix 19"; the contents keep that
      const appendix = `Appendix ${Math.min(i + 1, 19)}`;
      return { match: appendix, label: appendix, sub: body };
    }),
  ],

  // The Issue of International Security
  2024050201: [
    { match: "Insignia and Ranks", label: "Insignia and Ranks" },
    { match: "The Director’s Office", label: "The Director’s Office" },
    { match: "Security Council", label: "Security Council" },
    { match: "Leadership of the CSA", label: "Leadership of the CSA" },
    {
      match: "Ministries, Agencies, Departments and Public Bodies",
      label: "Ministries, Agencies, Departments and Public Bodies",
    },
  ],
};

// The SSC's long documents: their contents are built from the text itself, listing every article
// (its printed number and margin title) and every chapter or schedule, with the headings inside a
// chapter under it.
const builtFromText = new Set(["2026083001", "2026100601", "2026101001", "2026101201"]);

function fromText(blocks) {
  let inChapter = false;
  return blocks.flatMap((block, i) => {
    const href = `#${blockId(i)}`;
    if (block.type === "chapter") {
      inChapter = true;
      return [{ href, label: block.text }];
    }
    if (block.type === "article" && block.title) return [{ href, label: `${block.number} ${block.title}` }];
    if (block.type === "heading" && inChapter) return [{ href, label: block.text, level: 2 }];
    return [];
  });
}

// Turns a document's contents into links: each entry gets the anchor of the first chapter or heading
// with its exact text that comes after the previous entry's. Entries that match nothing are dropped.
export function contentsFor(index, blocks) {
  if (blocks && builtFromText.has(index)) return fromText(blocks);
  const entries = contents[index];
  if (!entries || !blocks) return null;
  let from = 0;
  const resolved = [];
  for (const entry of entries) {
    const at = blocks.findIndex(
      (block, i) => i >= from && (block.type === "chapter" || block.type === "heading") && block.text === entry.match,
    );
    if (at === -1) continue;
    resolved.push({ ...entry, href: `#${blockId(at)}` });
    from = at + 1;
  }
  return resolved.length > 0 ? resolved : null;
}

// the anchor id of a chapter or heading block in a document's text
export const blockId = (i) => `s${i}`;
