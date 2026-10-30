// The Add modal's bulk code: one line per kind, read into a tree for the preview and the API.
//
//   //F Cabinet                          a folder, one per line
//   //D Defence, "Justice, Law and Order" departments: commas separate names, quotes keep one together
//   //Authority Maritime Authority       any other kind, by its full name
//
// The codes are //F Folder, //D Department, //B Body, //C Commission, //Co Company and
// //I Institution; capitals don't matter. Lines under a folder line go inside it (a folder under a
// folder goes inside that), and each blank line closes the latest folder.

export const codes = { f: "Folder", d: "Department", b: "Body", c: "Commission", co: "Company", i: "Institution" };

// as the API allows (backend/src/directory)
export const MAX_BULK = 300;
const MAX_DEPTH = 20;

const QUOTES = new Set(['"', "“", "”"]);

// the kind a code stands for: a built-in code, a kind already in use, or a new kind
function kindFor(code, kinds) {
  const lower = code.toLowerCase();
  if (codes[lower]) return { kind: codes[lower] };
  const known = kinds.find((kind) => kind.toLowerCase() === lower);
  if (known) return { kind: known };
  // short ones are more likely a mistyped code than a kind's name
  if (code.length <= 2 || !/^\p{L}[\p{L}\p{N}-]*$/u.test(code)) {
    return { problem: `“//${code}” isn’t a code. Use //F, //D, //B, //C, //Co or //I, or a kind’s full name.` };
  }
  if (code.length > 40) return { problem: "Kinds are at most 40 characters." };
  return { kind: code, isNew: true };
}

// "A, \"B, C\", D" → ["A", "B, C", "D"]; open is true if a quote isn't closed
function splitNames(text) {
  const names = [];
  let current = "";
  let quoted = false;
  for (const char of text) {
    if (QUOTES.has(char)) quoted = !quoted;
    else if (char === "," && !quoted) {
      names.push(current.trim());
      current = "";
    } else current += char;
  }
  names.push(current.trim());
  return { names, open: quoted };
}

// Reads the code: { entries, problems, count }. Entries are a tree of { folder, kind, name, line,
// isNew, children }; problems are { line, message }, in line order.
export function readBulk(text, kinds) {
  const root = { children: [] };
  const open = [root];
  const problems = [];
  let count = 0;

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    const content = raw.trim();
    if (!content) {
      // a blank line closes the latest folder
      if (open.length > 1) open.pop();
      return;
    }
    const problem = (message) => problems.push({ line, message });

    const parts = content.match(/^\/\/(\S+)\s*(.*)$/);
    if (!parts) return problem("Start the line with // and a code, e.g. //D.");
    const [, code, rest] = parts;
    const found = kindFor(code, ["Folder", ...kinds]);
    if (found.problem) return problem(found.problem);
    if (!rest) return problem("Add a name after the code.");

    const { names, open: unclosed } = splitNames(rest);
    if (unclosed) return problem("A quote isn’t closed.");
    if (names.some((name) => !name)) return problem("There’s an empty name. Check the commas.");
    if (names.some((name) => name.length > 150)) return problem("Names are at most 150 characters.");

    const parent = open.at(-1);
    if (found.kind === "Folder") {
      if (names.length > 1) return problem("A folder line takes one name. Put each folder on its own line.");
      if (open.length > MAX_DEPTH) return problem(`Folders go at most ${MAX_DEPTH} deep.`);
      const folder = { folder: true, name: names[0], line, children: [] };
      parent.children.push(folder);
      open.push(folder);
      count += 1;
    } else {
      for (const name of names) parent.children.push({ folder: false, kind: found.kind, name, line, isNew: found.isNew });
      count += names.length;
    }
  });

  if (count > MAX_BULK) problems.push({ line: null, message: `That’s ${count}. At most ${MAX_BULK} can be added at once.` });
  return { entries: root.children, problems, count };
}

// the tree as the API takes it
export const forApi = (entries) =>
  entries.map(({ folder, kind, name, children }) =>
    folder ? { folder, name, children: forApi(children) } : { folder, kind, name },
  );
