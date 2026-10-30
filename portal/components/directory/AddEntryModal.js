"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { ChevronDownIcon, ChevronRightIcon } from "../dashboard/icons";
import Dialog from "../Dialog";
import { saveProblem } from "../users/cells";
import BulkAdd from "./BulkAdd";
import { NEW_KIND } from "./KindCell";
import { entryNameProblem, kindProblem } from "./rules";

const field =
  "mt-2 block w-full rounded-2xl bg-white px-4 py-3 text-[15px] text-ink ring-1 ring-ink/15 outline-none transition-shadow placeholder:text-ink/35 focus:ring-2 focus:ring-ink/40 aria-invalid:ring-maroon/50 aria-invalid:focus:ring-maroon/70";
const note = "mt-2 min-h-5 text-[13px] leading-5 text-maroon";
const FOLDER = "__folder";

// Adding to the Directory: the kind (a folder, one of the kinds, or a new kind) and the name.
// `parent` is the entry it goes inside, or null for the top level. Head and contact details are
// filled in afterwards, in the details panel. Fields are checked inline once typing pauses.
// "Add several at once" switches to the bulk field (BulkAdd), which hands its result to
// `onAddedMany`.
export default function AddEntryModal({ parent, kinds, onAdded, onAddedMany, onExpired, onClose }) {
  const [several, setSeveral] = useState(false);
  const [kind, setKind] = useState(FOLDER);
  const [newKind, setNewKind] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState({});
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState(null);
  const timers = useRef({});
  const refs = useRef({});

  useEffect(() => {
    const pendingTimers = timers.current;
    refs.current.kind?.focus();
    return () => Object.values(pendingTimers).forEach(clearTimeout);
  }, []);

  const checks = { newKind: kindProblem, name: entryNameProblem };

  function typed(which, value, set) {
    set(value);
    setProblem(null);
    setNotes((current) => ({ ...current, [which]: null }));
    clearTimeout(timers.current[which]);
    if (value.trim()) timers.current[which] = setTimeout(() => setNotes((current) => ({ ...current, [which]: checks[which](value) })), 450);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (pending) return;
    const found = { newKind: kind === NEW_KIND ? kindProblem(newKind) : null, name: entryNameProblem(name) };
    setNotes(found);
    const first = ["newKind", "name"].find((which) => found[which]);
    if (first) return refs.current[first].focus();

    setPending(true);
    setProblem(null);
    const folder = kind === FOLDER;
    const body = {
      parentId: parent?.id ?? null,
      folder,
      name: name.trim(),
      ...(!folder && { kind: kind === NEW_KIND ? newKind.trim() : kind }),
    };
    try {
      const result = await api("/directory", { body });
      if (result.status === 201) return onAdded(result.data.entry);
      if (result.status === 401) return onExpired();
      setProblem(result.status === 404 ? "What you were adding to no longer exists." : saveProblem(result));
    } catch {
      setProblem("Couldn’t reach the portal. Check your connection and try again.");
    }
    setPending(false);
  }

  return (
    <Dialog title={parent ? `Add to ${parent.name}` : "Add to the Directory"} onClose={onClose} full={several}>
      {several ? (
        <BulkAdd parent={parent} kinds={kinds} onAdded={onAddedMany} onExpired={onExpired} onOne={() => setSeveral(false)} />
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-2">
          <div>
            <label htmlFor="entry-kind" className="block text-sm font-medium">
              Kind
            </label>
            <div className="relative">
              <select
                ref={(el) => (refs.current.kind = el)}
                id="entry-kind"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value);
                  setNotes((current) => ({ ...current, newKind: null }));
                }}
                className={`${field} cursor-pointer appearance-none pr-11`}
              >
                <option value={FOLDER}>Folder</option>
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
                <option value={NEW_KIND}>New kind…</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute bottom-[13px] right-4 size-5 text-ink/45" />
            </div>
            <p className="mt-2 min-h-5 text-[13px] leading-5 text-ink/45">
              {kind === FOLDER ? "A folder only groups what’s inside it." : " "}
            </p>
          </div>

          {kind === NEW_KIND && (
            <div>
              <label htmlFor="entry-new-kind" className="block text-sm font-medium">
                New kind
              </label>
              <input
                ref={(el) => (refs.current.newKind = el)}
                id="entry-new-kind"
                value={newKind}
                placeholder="e.g. Authority"
                onChange={(e) => typed("newKind", e.target.value, setNewKind)}
                aria-invalid={Boolean(notes.newKind)}
                autoComplete="off"
                className={field}
              />
              <p aria-live="polite" className={note}>
                {notes.newKind}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="entry-name" className="block text-sm font-medium">
              Name
            </label>
            <input
              ref={(el) => (refs.current.name = el)}
              id="entry-name"
              value={name}
              onChange={(e) => typed("name", e.target.value, setName)}
              onBlur={() => name.trim() && setNotes((current) => ({ ...current, name: entryNameProblem(name) }))}
              aria-invalid={Boolean(notes.name)}
              autoComplete="off"
              className={field}
            />
            <p aria-live="polite" className={note}>
              {notes.name}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSeveral(true)}
            className="-ml-1 flex items-center gap-1 rounded-full py-1 pl-1 pr-3 text-[14px] font-medium text-ink/60 transition-colors hover:bg-ink/[0.04] hover:text-ink"
          >
            Add several at once
            <ChevronRightIcon className="size-4" />
          </button>

          <button
            type="submit"
            disabled={pending}
            className="mt-4 h-12 w-full rounded-full bg-ink text-[15px] font-medium text-white transition-colors duration-300 ease-soft hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-wait disabled:bg-ink/70"
          >
            {pending ? "Adding…" : "Add"}
          </button>
          <p aria-live="polite" className={`${note} text-center`}>
            {problem}
          </p>
        </form>
      )}
    </Dialog>
  );
}
