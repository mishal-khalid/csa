"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, Tick } from "../dashboard/icons";
import { kindProblem } from "./rules";

export const NEW_KIND = "__new";

const spinner = <span className="size-3.5 animate-spin rounded-full border-2 border-ink/15 border-t-ink/50" />;

// An entry's kind, edited in place like the Users table's role: the browser's own list of kinds
// (the five, then any added), saved as soon as one is picked. "New kind…" turns it into a field
// for a new one: Enter saves it, Esc goes back.
export default function KindCell({ value, kinds, editable, save }) {
  const [naming, setNaming] = useState(false);
  const [draft, setDraft] = useState("");
  const [picked, setPicked] = useState(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(null);
  const [saved, setSaved] = useState(false);
  const field = useRef(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (naming) field.current?.focus();
  }, [naming]);

  if (!editable) return <span className="block py-1">{value}</span>;

  async function commit(kind) {
    setSaving(true);
    setNote(null);
    const failed = await save(kind);
    setSaving(false);
    setPicked(null);
    if (failed) return setNote(failed);
    setNaming(false);
    setSaved(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 1600);
  }

  if (naming) {
    return (
      <div>
        <input
          ref={field}
          value={draft}
          placeholder="Name the new kind"
          aria-label="New kind"
          disabled={saving}
          onChange={(e) => {
            setDraft(e.target.value);
            setNote(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setNaming(false);
              setNote(null);
            } else if (e.key === "Enter") {
              e.preventDefault();
              const problem = kindProblem(draft);
              if (problem) setNote(problem);
              else commit(draft.trim());
            }
          }}
          aria-invalid={Boolean(note)}
          className="-mx-2 block w-[calc(100%+1rem)] rounded-lg bg-white px-2 py-1 ring-2 ring-ink/25 outline-none placeholder:text-ink/35 focus:ring-ink/40 aria-invalid:ring-maroon/50"
        />
        <p className={`mt-1.5 text-[13px] leading-5 ${note ? "text-maroon" : "text-ink/45"}`}>{note ?? "Enter to save, Esc to go back."}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="relative -mx-2 inline-flex max-w-[calc(100%+1rem)] items-center">
        <select
          aria-label="Kind"
          value={picked ?? value}
          disabled={saving}
          onChange={(e) => {
            if (e.target.value === NEW_KIND) {
              setDraft("");
              setNaming(true);
              return;
            }
            setPicked(e.target.value);
            commit(e.target.value);
          }}
          className="w-full cursor-pointer appearance-none truncate rounded-lg bg-transparent py-1 pl-2 pr-7 transition-colors duration-200 outline-none hover:bg-ink/[0.05] focus-visible:ring-2 focus-visible:ring-ink/40 disabled:cursor-wait"
        >
          {kinds.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
          <option value={NEW_KIND}>New kind…</option>
        </select>
        <span className="pointer-events-none absolute right-1.5 flex items-center">
          {saving ? spinner : saved ? <Tick className="size-4" /> : <ChevronDownIcon className="size-4 text-ink/40" />}
        </span>
      </div>
      {note && (
        <p role="alert" className="mt-1.5 text-[13px] leading-5 text-maroon">
          {note}
        </p>
      )}
    </div>
  );
}
