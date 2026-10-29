import { blockId } from "./toc";

// Renders a Gazette document's transcribed text (see ./texts) like a printed gazette: chapters and
// headings centred, articles in the legal layout of the original (margin label, article number,
// lettered clauses), body in Crimson Pro at reading size. Dhivehi documents (the SSC's) run right to
// left, in Faruma with MV MAG Round headings, and the layout mirrors with them.

// Text with blank-line breaks into separate paragraphs; a single line break stays a line break
// (e.g. a rank printed over its "Arm:" and "Collar:" lines).
function Paragraphs({ text, className = "" }) {
  return text.split("\n\n").map((para, i) => (
    <p key={i} className={`whitespace-pre-line ${i > 0 ? "mt-4" : ""} ${className}`}>
      {para}
    </p>
  ));
}

function Clause({ label, text, items }) {
  return (
    <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3">
      <span className="text-ink/60">{label ?? ""}</span>
      <div>
        {/* a clause can be just a list of items (e.g. the definitions chapters), with no text of its own */}
        {text && <Paragraphs text={text} />}
        {items?.length > 0 && (
          <div className={`${text ? "mt-3" : ""} space-y-3`}>
            {items.map((item, i) => (
              <Clause key={i} {...item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// The original's legal layout: the margin label on the left, the article number, then its clauses.
// On small screens the margin label sits above the article instead.
function Article({ id, number, title, clauses, sans }) {
  return (
    <div id={id} className="scroll-mt-32 grid gap-x-6 gap-y-2 md:grid-cols-[9rem_2.5rem_minmax(0,1fr)]">
      <p className={`${sans} text-sm leading-6 text-ink/55 md:pt-1`}>{title ?? ""}</p>
      <p className="font-medium md:text-end">{number}</p>
      <div className="space-y-4">
        {clauses.map((clause, i) => (
          <Clause key={i} {...clause} />
        ))}
      </div>
    </div>
  );
}

// Chapters, headings and articles carry an anchor id (blockId) so the contents column can link to them;
// scroll-mt keeps them clear of the fixed nav when jumped to. `heading` and `sans` are the font
// classes for headings and for the small print (labels, tables, signatures).
function Block({ block, id, heading, sans }) {
  switch (block.type) {
    case "chapter":
      return (
        <div id={id} className="scroll-mt-32 pt-10 text-center">
          <h2 className={`${heading} text-3xl font-semibold`}>{block.text}</h2>
          {block.subtitle && <p className="mt-2 text-2xl">{block.subtitle}</p>}
        </div>
      );
    case "heading":
      return (
        <h3 id={id} className={`${heading} scroll-mt-32 pt-6 text-center text-2xl font-semibold`}>
          {block.text}
        </h3>
      );
    case "article":
      return <Article {...block} id={id} sans={sans} />;
    case "paragraph":
      return (
        <div>
          <Paragraphs text={block.text} />
        </div>
      );
    case "list":
      return (
        <ul className="space-y-3">
          {block.items.map((item, i) => (
            <li key={i} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3">
              <span className="text-ink/60">{item.label ?? "•"}</span>
              <Paragraphs text={item.text} />
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <figure className={sans}>
          {block.caption && <figcaption className="mb-3 text-sm font-medium text-ink/60">{block.caption}</figcaption>}
          <div className="overflow-x-auto rounded-2xl ring-1 ring-ink/10">
            <table className="w-full min-w-[32rem] border-collapse text-start text-sm">
              {/* tables printed without a header row have no columns */}
              {block.columns && (
                <thead className="bg-neutral-50">
                  <tr>
                    {block.columns.map((column, i) => (
                      <th key={i} scope="col" className="px-4 py-3 font-medium text-ink/70">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-ink/10">
                {block.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c} className="whitespace-pre-line px-4 py-3 align-top leading-relaxed">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      );
    case "signatures":
      return (
        <div className={`grid gap-8 border-t border-ink/15 pt-8 ${sans} sm:grid-cols-2`}>
          {block.items.map((item, i) => (
            <div key={i}>
              {item.caption && (
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-ink/45">{item.caption}</p>
              )}
              <p className="text-[15px] font-medium">{item.name}</p>
              <p className="mt-1 whitespace-pre-line text-sm text-ink/60">{item.title}</p>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

// In right-to-left text, a line with no Dhivehi in it (a phone number, an address, "(1)") would be
// laid out right to left too, scrambling it ("(960) 330 1232" shows as "1232 330 (960)"). Each such
// line is wrapped in invisible left-to-right isolate marks so it reads as printed. Article numbers
// and list labels are left alone: printed right to left, "1." reads ".1" there too.
const THAANA = /[\u0780-\u07BF]/;
const isolateLines = (text) =>
  text
    .split("\n")
    .map((line) => (line.trim() && !THAANA.test(line) ? `\u2066${line}\u2069` : line))
    .join("\n");
const isolate = (value) =>
  typeof value === "string"
    ? isolateLines(value)
    : Array.isArray(value)
      ? value.map(isolate)
      : value && typeof value === "object"
        ? Object.fromEntries(Object.entries(value).map(([key, v]) => [key, ["type", "number", "label"].includes(key) ? v : isolate(v)]))
        : value;

export default function GazetteText({ blocks, dhivehi = false }) {
  if (dhivehi) {
    return (
      <div lang="dv" dir="rtl" className="space-y-8 font-dhivehi text-[19px] leading-[2] text-ink">
        {blocks.map((block, i) => (
          <Block key={i} block={isolate(block)} id={blockId(i)} heading="font-dhivehi-heading" sans="" />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-8 font-serif text-[19px] leading-[1.7] text-ink">
      {blocks.map((block, i) => (
        <Block key={i} block={block} id={blockId(i)} heading="tracking-tight" sans="font-sans" />
      ))}
    </div>
  );
}
