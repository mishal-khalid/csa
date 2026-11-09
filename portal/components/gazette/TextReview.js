"use client";

import { useState } from "react";
import { PencilIcon, TrashIcon } from "../dashboard/icons";

// The transcribed text, block by block, as the public Gazette will show it, each with Edit and
// Delete. Editing opens the block's own words as fields; nothing is rewritten for you. The text is
// the reader's (rule-based, so the same PDF always reads the same way); this is where a person
// checks it against the PDF and fixes what the rules couldn't settle.

const names = {
  text: "Text",
  subtitle: "Subtitle",
  number: "Number",
  title: "Title",
  label: "Label",
  after: "After the points",
  caption: "Caption",
  name: "Name",
  clauses: "Points",
  items: "Points",
  columns: "Columns",
  rows: "Rows",
};

const field =
  "block w-full rounded-xl bg-white px-3 py-2 text-[15px] leading-6 ring-1 ring-ink/15 outline-none transition-shadow focus:ring-2 focus:ring-ink/40";

// a text field that grows with what's in it
function Area({ value, onChange, label, short }) {
  const rows = short ? 1 : Math.min(14, Math.max(2, Math.ceil((value?.length ?? 0) / 70) + (value?.split("\n").length ?? 1) - 1));
  return short ? (
    <input aria-label={label} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={field} />
  ) : (
    <textarea aria-label={label} value={value ?? ""} rows={rows} onChange={(e) => onChange(e.target.value)} className={`${field} resize-y`} />
  );
}

// The fields of one block, worked out from its shape: words become fields, lists of points nest.
function Fields({ value, onChange, depth = 0 }) {
  return (
    <div className={`space-y-3 ${depth ? "border-l-2 border-ink/10 pl-3" : ""}`}>
      {Object.entries(value).map(([key, v]) => {
        if (key === "type") return null;
        const set = (next) => onChange({ ...value, [key]: next });
        if (typeof v === "string") {
          const short = ["label", "number", "subtitle", "caption", "name"].includes(key) || (key === "title" && depth > 0);
          return (
            <label key={key} className="block">
              <span className="mb-1 block text-[13px] text-ink/50">{names[key] ?? key}</span>
              <Area value={v} onChange={set} label={names[key] ?? key} short={short} />
            </label>
          );
        }
        if (key === "rows" && Array.isArray(v)) {
          return (
            <div key={key}>
              <span className="mb-1 block text-[13px] text-ink/50">Rows</span>
              <div className="space-y-2">
                {v.map((row, r) => (
                  <div key={r} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, row.length)}, minmax(0, 1fr))` }}>
                    {row.map((cell, c) => (
                      <Area
                        key={c}
                        value={cell}
                        label={`Row ${r + 1}, cell ${c + 1}`}
                        onChange={(next) => set(v.map((rr, i) => (i === r ? rr.map((cc, j) => (j === c ? next : cc)) : rr)))}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        }
        if (key === "columns" && Array.isArray(v)) {
          return (
            <div key={key}>
              <span className="mb-1 block text-[13px] text-ink/50">Columns</span>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, v.length)}, minmax(0, 1fr))` }}>
                {v.map((column, c) => (
                  <Area key={c} short value={column} label={`Column ${c + 1}`} onChange={(next) => set(v.map((cc, j) => (j === c ? next : cc)))} />
                ))}
              </div>
            </div>
          );
        }
        if (Array.isArray(v)) {
          return (
            <div key={key}>
              <span className="mb-1 block text-[13px] text-ink/50">{names[key] ?? key}</span>
              <div className="space-y-3">
                {v.map((item, i) => (
                  <Fields key={i} depth={depth + 1} value={item} onChange={(next) => set(v.map((it, j) => (j === i ? next : it)))} />
                ))}
              </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

// How a block reads, briefly, in the list
function Preview({ block }) {
  const clauseText = (clauses = [], depth = 0) =>
    clauses.map((clause, i) => (
      <div key={i} className={`grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 ${depth ? "mt-1.5" : "mt-2"}`}>
        <span className="text-ink/50">{clause.label ?? ""}</span>
        <div>
          {clause.text && <p className="whitespace-pre-line">{clause.text}</p>}
          {clause.items?.length > 0 && clauseText(clause.items, depth + 1)}
          {clause.after && <p className="mt-1.5 whitespace-pre-line">{clause.after}</p>}
        </div>
      </div>
    ));

  switch (block.type) {
    case "chapter":
      return (
        <div className="text-center font-serif">
          <p className="text-xl font-semibold">{block.text}</p>
          {block.subtitle && <p className="text-lg">{block.subtitle}</p>}
        </div>
      );
    case "heading":
      return <p className="text-center font-serif text-lg font-semibold">{block.text}</p>;
    case "article":
      return (
        <div>
          <p className="text-[13px] text-ink/50">
            Article {block.number}
            {block.title ? ` · ${block.title}` : ""}
          </p>
          <div className="font-serif text-[17px] leading-7">{clauseText(block.clauses)}</div>
        </div>
      );
    case "paragraph":
      return <p className="whitespace-pre-line font-serif text-[17px] leading-7">{block.text}</p>;
    case "list":
      return <div className="font-serif text-[17px] leading-7">{clauseText(block.items)}</div>;
    case "table":
      return (
        <div className="overflow-x-auto">
          {block.caption && <p className="mb-2 text-[13px] text-ink/50">{block.caption}</p>}
          <table className="w-full text-[13px]">
            {block.columns && (
              <thead>
                <tr>
                  {block.columns.map((column, i) => (
                    <th key={i} className="border-b border-ink/15 px-2 py-1.5 text-left font-medium">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} className="whitespace-pre-line border-b border-ink/10 px-2 py-1.5 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "signatures":
      return (
        <div className="grid gap-4 text-[15px] sm:grid-cols-2">
          {block.items.map((item, i) => (
            <div key={i}>
              {item.caption && <p className="text-[12px] uppercase tracking-[0.14em] text-ink/45">{item.caption}</p>}
              <p className="font-medium">{item.name}</p>
              <p className="whitespace-pre-line text-ink/60">{item.title}</p>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

const kinds = { chapter: "Chapter", heading: "Heading", article: "Article", paragraph: "Paragraph", list: "Points", table: "Table", signatures: "Signatures" };

// `save(blocks)` resolves with what went wrong, or null.
export default function TextReview({ blocks, editable, save, dhivehi }) {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);
  const [problem, setProblem] = useState(null);
  const [saving, setSaving] = useState(false);

  async function commit(next) {
    setSaving(true);
    setProblem(null);
    const failed = await save(next);
    setSaving(false);
    if (failed) setProblem(failed);
    else setEditing(null);
  }

  const counts = Object.entries(
    blocks.reduce((all, block) => ({ ...all, [block.type]: (all[block.type] ?? 0) + 1 }), {}),
  )
    .map(([type, n]) => `${n} ${kinds[type]?.toLowerCase() ?? type}${n === 1 || type === "list" || type === "signatures" ? "" : "s"}`)
    .join(" · ");

  if (!blocks.length) return <p className="text-[15px] text-ink/50">No text yet. It’s read from the document’s PDF when you upload it.</p>;

  return (
    <div>
      <p className="text-[13px] text-ink/50">{counts}</p>
      <ol className="mt-4 space-y-2" dir={dhivehi ? "rtl" : undefined}>
        {blocks.map((block, i) => (
          <li key={i} className={`group rounded-2xl p-3 transition-colors ${editing === i ? "bg-neutral-50 ring-1 ring-ink/10" : "hover:bg-neutral-50"}`}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-ink/40">{kinds[block.type] ?? block.type}</span>
              {editable && editing !== i && (
                <span className="flex gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                  <button
                    type="button"
                    aria-label={`Edit this ${kinds[block.type]?.toLowerCase() ?? "block"}`}
                    onClick={() => {
                      setEditing(i);
                      setDraft(structuredClone(block));
                      setProblem(null);
                    }}
                    className="grid size-8 place-items-center rounded-full text-ink/50 hover:bg-ink/[0.06] hover:text-ink"
                  >
                    <PencilIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete this ${kinds[block.type]?.toLowerCase() ?? "block"}`}
                    onClick={() => commit(blocks.filter((_, j) => j !== i))}
                    className="grid size-8 place-items-center rounded-full text-ink/40 hover:bg-maroon/[0.08] hover:text-maroon"
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </span>
              )}
            </div>
            {editing === i ? (
              <div dir="ltr">
                <Fields value={draft} onChange={setDraft} />
                {problem && <p className="mt-2 text-[13px] text-maroon">{problem}</p>}
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => setEditing(null)} className="h-10 rounded-full px-4 text-sm font-medium text-ink/60 hover:bg-ink/[0.05]">
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => commit(blocks.map((b, j) => (j === i ? draft : b)))}
                    className="h-10 rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-ink/85 disabled:bg-ink/40"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <Preview block={block} />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
