"use client";

import { useEffect, useRef, useState } from "react";
import Dialog from "./Dialog";

// A delete that has to be confirmed by typing something out (an account's username, a
// fingerprint's name): Delete only works once `matches(typed)` is true. `remove(typed)` resolves
// with what went wrong, or null once it's done. The API checks the typed text again.
export default function TypedDeleteDialog({ title, explanation, label, matches, remove, button, onClose }) {
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState(null);
  const field = useRef(null);
  const ready = matches(typed);

  useEffect(() => field.current?.focus(), []);

  async function onSubmit(e) {
    e.preventDefault();
    if (!ready || pending) return;
    setPending(true);
    setProblem(null);
    const failed = await remove(typed);
    // on success the dialog is closed by then
    if (failed) {
      setProblem(failed);
      setPending(false);
    }
  }

  return (
    <Dialog title={title} onClose={onClose}>
      <p className="mt-3 text-[15px] leading-6 text-ink/70">{explanation}</p>
      <form onSubmit={onSubmit} noValidate className="mt-6">
        <label htmlFor="confirm-delete" className="block text-sm font-medium">
          {label}
        </label>
        <input
          ref={field}
          id="confirm-delete"
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
            setProblem(null);
          }}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby="confirm-delete-note"
          className="mt-2 block w-full rounded-2xl bg-white px-4 py-3 text-[15px] text-ink ring-1 ring-ink/15 outline-none transition-shadow focus:ring-2 focus:ring-ink/40"
        />
        <p id="confirm-delete-note" aria-live="polite" className="mt-2 min-h-5 text-[13px] leading-5 text-maroon">
          {problem}
        </p>
        <button
          type="submit"
          disabled={!ready || pending}
          className="mt-4 h-12 w-full rounded-full bg-maroon text-[15px] font-medium text-white transition-colors duration-300 ease-soft hover:bg-maroon/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon disabled:cursor-not-allowed disabled:bg-maroon/35"
        >
          {pending ? "Deleting…" : button}
        </button>
      </form>
    </Dialog>
  );
}
