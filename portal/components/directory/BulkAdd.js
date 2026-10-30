"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { ChevronLeftIcon } from "../dashboard/icons";
import { saveProblem } from "../users/cells";
import { forApi, readBulk } from "./bulk";
import { entryIcon } from "./entries";

const example = `//F Cabinet
//D Defence, Foreign Affairs, Justice

//C Civic Affairs Commission
//Co Continental Mint Company`;

const key = [
  ["//F", "Folder"],
  ["//D", "Department"],
  ["//B", "Body"],
  ["//C", "Commission"],
  ["//Co", "Company"],
  ["//I", "Institution"],
];

// the preview: what will be added, as a tree
function Preview({ entries, depth = 0 }) {
  return (
    <ul>
      {entries.map((entry, i) => (
        <li key={`${entry.line}-${i}`}>
          <div className="flex items-center gap-2 rounded-lg py-1 pr-1 text-[14px]" style={{ paddingLeft: 4 + depth * 16 }}>
            {entryIcon(entry, "size-4 shrink-0 text-ink/55")}
            <span className="min-w-0 flex-1 truncate">{entry.name}</span>
            {entry.isNew && <span className="shrink-0 rounded-full bg-ink/[0.06] px-1.5 py-0.5 text-[11px] font-medium text-ink/60">new kind</span>}
            <span className="shrink-0 text-[12px] text-ink/40">{entry.folder ? "Folder" : entry.kind}</span>
          </div>
          {entry.children?.length > 0 && <Preview entries={entry.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

// "Add several at once", in the Add modal (which fills the window for it): a large field for the
// bulk code (see bulk.js), with a key of the codes above it and a live preview beside it, both
// stretching to the modal's height. On phones the preview sits under the field and the modal
// scrolls. What's typed is
// read once typing pauses; each problem is listed with its line number (which turns red in the
// margin), and Add stays off until there are none. Everything is added in one go, or nothing.
export default function BulkAdd({ parent, kinds, onAdded, onExpired, onOne }) {
  const [text, setText] = useState("");
  // the text as of the last pause in typing, which the preview and problems show
  const [settled, setSettled] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState(null);
  const field = useRef(null);
  const margin = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    field.current?.focus();
    return () => clearTimeout(timer.current);
  }, []);

  const reading = useMemo(() => readBulk(settled, kinds), [settled, kinds]);
  const problemLines = new Set(reading.problems.map((p) => p.line));
  const lineCount = Math.max(1, text.split("\n").length);
  const ready = settled === text && reading.count > 0 && reading.problems.length === 0;

  async function add() {
    if (pending) return;
    clearTimeout(timer.current);
    setSettled(text);
    const now = readBulk(text, kinds);
    if (now.problems.length) return field.current.focus();
    if (!now.count) {
      setProblem("Type what to add first.");
      return field.current.focus();
    }
    setPending(true);
    setProblem(null);
    try {
      const result = await api("/directory/bulk", { body: { parentId: parent?.id ?? null, entries: forApi(now.entries) } });
      if (result.status === 201) return onAdded(result.data);
      if (result.status === 401) return onExpired();
      setProblem(
        result.status === 404
          ? "What you were adding to no longer exists."
          : result.status === 413
            ? "That’s too much to add at once."
            : result.status === 400
              ? "These couldn’t be added. Check them and try again."
              : saveProblem(result),
      );
    } catch {
      setProblem("Couldn’t reach the portal. Check your connection and try again.");
    }
    setPending(false);
  }

  return (
    <div className="mt-5 flex min-h-0 flex-1 flex-col">
      <p id="bulk-key" className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] leading-5 text-ink/55">
        {key.map(([code, kind]) => (
          <span key={code}>
            <span className="font-mono font-medium text-ink">{code}</span> {kind}
          </span>
        ))}
        <span>
          <span className="font-mono font-medium text-ink">{"//Name"}</span> other kinds
        </span>
      </p>
      <p className="mt-1 text-[13px] leading-5 text-ink/45">
        Commas separate names, and “quotes” keep a comma in one. Lines under a folder go inside it; a blank line closes it.
      </p>

      <div className="mt-4 grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        {/* the field, with line numbers in the margin */}
        <div className="flex h-72 overflow-hidden rounded-2xl lg:h-auto lg:min-h-0 bg-white ring-1 ring-ink/15 transition-shadow focus-within:ring-2 focus-within:ring-ink/40">
          <div
            ref={margin}
            aria-hidden="true"
            className="w-10 shrink-0 select-none overflow-hidden border-r border-ink/10 bg-neutral-50 py-3 pr-2 text-right font-mono text-[12px] leading-6 text-ink/30"
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className={problemLines.has(i + 1) ? "font-medium text-maroon" : undefined}>
                {i + 1}
              </div>
            ))}
          </div>
          <textarea
            ref={field}
            value={text}
            onChange={(e) => {
              const next = e.target.value;
              setText(next);
              setProblem(null);
              clearTimeout(timer.current);
              timer.current = setTimeout(() => setSettled(next), 400);
            }}
            onScroll={(e) => {
              if (margin.current) margin.current.scrollTop = e.currentTarget.scrollTop;
            }}
            wrap="off"
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            placeholder={example}
            aria-label="What to add"
            aria-describedby="bulk-key bulk-problems"
            aria-invalid={reading.problems.length > 0}
            className="min-w-0 flex-1 resize-none bg-transparent px-3 py-3 font-mono text-[13px] leading-6 text-ink outline-none placeholder:text-ink/30"
          />
        </div>

        <div className="h-56 overflow-y-auto rounded-2xl bg-white/60 p-3 ring-1 ring-black/5 lg:h-auto lg:min-h-0" aria-live="polite">
          <p className="px-1 pb-1 text-[13px] text-ink/50">
            {reading.count ? `${reading.count} to add${parent ? ` to ${parent.name}` : ""}` : "What you type shows here."}
          </p>
          <Preview entries={reading.entries} />
        </div>
      </div>

      <ul id="bulk-problems" aria-live="polite" className="mt-3 min-h-5 space-y-1 text-[13px] leading-5 text-maroon">
        {reading.problems.map((p, i) => (
          <li key={i}>
            {p.line && <span className="font-medium">Line {p.line}: </span>}
            {p.message}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={add}
        disabled={pending || (!ready && settled === text && text !== "")}
        className="mt-3 h-12 w-full rounded-full bg-ink text-[15px] font-medium text-white transition-colors duration-300 ease-soft hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:bg-ink/40"
      >
        {pending ? "Adding…" : reading.count && ready ? `Add ${reading.count}` : "Add"}
      </button>
      <p aria-live="polite" className="mt-2 min-h-5 text-center text-[13px] leading-5 text-maroon">
        {problem}
      </p>
      <button
        type="button"
        onClick={onOne}
        className="-ml-1 mt-1 flex items-center gap-1 rounded-full py-1 pl-1 pr-3 text-[14px] font-medium text-ink/60 transition-colors hover:bg-ink/[0.04] hover:text-ink"
      >
        <ChevronLeftIcon className="size-4" />
        Add one
      </button>
    </div>
  );
}
