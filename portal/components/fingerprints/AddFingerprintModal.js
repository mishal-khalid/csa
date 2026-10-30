"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { readNewFingerprint } from "@/lib/fingerprint";
import { nameProblem } from "@/lib/rules";
import { FingerprintIcon } from "../dashboard/icons";
import Dialog from "../Dialog";
import { saveProblem } from "../users/cells";

const field =
  "mt-2 block w-full rounded-2xl bg-white px-4 py-3 text-[15px] text-ink ring-1 ring-ink/15 outline-none transition-shadow placeholder:text-ink/35 focus:ring-2 focus:ring-ink/40 aria-invalid:ring-maroon/50 aria-invalid:focus:ring-maroon/70";
const note = "mt-2 min-h-5 text-[13px] leading-5 text-maroon";

// "Add a fingerprint": a name for it, then the browser's own fingerprint prompt. The name is
// checked inline once typing pauses; accounts are linked afterwards, from the table.
export default function AddFingerprintModal({ onAdded, onExpired, onClose }) {
  const [name, setName] = useState("");
  const [nameNote, setNameNote] = useState(null);
  const [reading, setReading] = useState(false);
  const [problem, setProblem] = useState(null);
  const timer = useRef(null);
  const nameField = useRef(null);

  useEffect(() => {
    nameField.current?.focus();
    return () => clearTimeout(timer.current);
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (reading) return;
    clearTimeout(timer.current);
    const found = nameProblem(name);
    setNameNote(found);
    if (found) {
      nameField.current.focus();
      return;
    }

    setReading(true);
    setProblem(null);
    try {
      const options = await api("/fingerprints/options", { body: { name: name.trim() } });
      if (options.status === 401) return onExpired();
      if (options.status !== 200) {
        setProblem(saveProblem(options));
        return;
      }
      const read = await readNewFingerprint(options.data);
      if (read.problem) {
        setProblem(read.problem);
        return;
      }
      const result = await api("/fingerprints", { body: { name: name.trim(), reading: read.reading } });
      if (result.status === 201) return onAdded(result.data.fingerprint);
      if (result.status === 401) return onExpired();
      const code = result.data?.code;
      setProblem(
        code === "already_added"
          ? "This fingerprint is already added."
          : code === "not_verified"
            ? "The fingerprint couldn’t be checked. Try again."
            : saveProblem(result),
      );
    } catch {
      setProblem("Couldn’t reach the portal. Check your connection and try again.");
    } finally {
      setReading(false);
    }
  }

  return (
    <Dialog title="Add a fingerprint" onClose={onClose}>
      <p className="mt-3 text-[15px] leading-6 text-ink/70">
        Add it on the device people will log in with: this computer’s fingerprint sensor, a fingerprint key, or a phone (by scanning the code
        your browser shows).
      </p>
      <form onSubmit={onSubmit} noValidate className="mt-6">
        <label htmlFor="fingerprint-name" className="block text-sm font-medium">
          Name
        </label>
        <input
          ref={nameField}
          id="fingerprint-name"
          value={name}
          placeholder="e.g. Front desk Mac"
          onChange={(e) => {
            const next = e.target.value;
            setName(next);
            setNameNote(null);
            clearTimeout(timer.current);
            if (next.trim()) timer.current = setTimeout(() => setNameNote(nameProblem(next)), 450);
          }}
          onBlur={() => name.trim() && setNameNote(nameProblem(name))}
          aria-invalid={Boolean(nameNote)}
          aria-describedby="fingerprint-name-note"
          autoComplete="off"
          className={field}
        />
        <p id="fingerprint-name-note" aria-live="polite" className={note}>
          {nameNote}
        </p>

        <button
          type="submit"
          disabled={reading}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-medium text-white transition-colors duration-300 ease-soft hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-wait disabled:bg-ink/70"
        >
          <FingerprintIcon className="size-5" />
          {reading ? "Reading…" : "Read fingerprint"}
        </button>
        <p aria-live="polite" className={`${note} text-center`}>
          {problem}
        </p>
      </form>
    </Dialog>
  );
}
