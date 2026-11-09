"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Dialog from "../Dialog";
import { problemFor, today } from "./gazette";

// Check and publish. The document is checked against the Gazette's rules (Director's Orders
// 01/2026 and 02/2026, the same check the API runs again when it publishes): every error must be
// fixed first; every warning must be read and accepted. Publishing then gives the document its
// Volume, Number and address for good, puts the cover on, and puts it on the public Gazette.
export default function PublishDialog({ doc, place, onClose, onPublished, onExpired }) {
  const [issues, setIssues] = useState(null);
  const [problem, setProblem] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let live = true;
    api(`/gazette/${doc.id}/check`, { body: { date: today() } }).then(
      (result) => {
        if (!live) return;
        if (result.status === 401) return onExpired();
        if (result.status === 200) setIssues(result.data.issues);
        else setProblem(problemFor(result));
      },
      () => live && setProblem("Couldn’t reach the portal. Try again."),
    );
    return () => {
      live = false;
    };
  }, [doc.id, onExpired]);

  const errors = issues?.filter((issue) => issue.level === "error") ?? [];
  const warnings = issues?.filter((issue) => issue.level === "warning") ?? [];
  const ready = issues && !errors.length && (!warnings.length || accepted);

  async function publish() {
    setPublishing(true);
    setProblem(null);
    try {
      const result = await api(`/gazette/${doc.id}/publish`, { body: { date: today(), acknowledged: accepted } });
      if (result.status === 401) return onExpired();
      if (result.status === 200) return onPublished(result.data.document);
      // the rules may have found something new since the check
      if (result.data?.issues) {
        setIssues(result.data.issues);
        setAccepted(false);
      } else setProblem(problemFor(result));
    } catch {
      setProblem("Couldn’t reach the portal. Try again.");
    }
    setPublishing(false);
  }

  const Issue = ({ issue }) => (
    <li className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <p className="text-[15px] leading-6">{issue.message}</p>
      {issue.quote && <p className="mt-1.5 border-l-2 border-ink/15 pl-3 font-serif text-[15px] italic leading-6 text-ink/70">“{issue.quote}”</p>}
      <p className="mt-2 text-[13px] text-ink/50">{[issue.where, issue.rule].filter(Boolean).join(" · ")}</p>
    </li>
  );

  return (
    <Dialog title="Check and publish" onClose={onClose}>
      {!issues && !problem && <p className="mt-4 text-[15px] text-ink/60">Checking the document against the Gazette’s rules…</p>}

      {issues && (
        <div className="mt-4 space-y-6">
          {errors.length === 0 && warnings.length === 0 && (
            <p className="text-[15px] leading-6">The document meets every rule the check covers.</p>
          )}
          {errors.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-maroon">
                {errors.length} to fix before it can be published
              </h3>
              <ul className="mt-3 space-y-2">
                {errors.map((issue, i) => (
                  <Issue key={i} issue={issue} />
                ))}
              </ul>
            </section>
          )}
          {warnings.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-amber-800">
                {warnings.length} warning{warnings.length === 1 ? "" : "s"} to read
              </h3>
              <ul className="mt-3 space-y-2">
                {warnings.map((issue, i) => (
                  <Issue key={i} issue={issue} />
                ))}
              </ul>
              {errors.length === 0 && (
                <label className="mt-4 flex items-start gap-3 text-[15px] leading-6">
                  <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 size-4 accent-ink" />
                  I’ve read the warnings and the document should be published as it is.
                </label>
              )}
            </section>
          )}

          {errors.length === 0 && (
            <div className="rounded-2xl bg-white p-4 text-[15px] leading-6 ring-1 ring-black/5">
              It will be published today as <strong className="font-medium">Volume {place?.volume} · Number {place?.number}</strong>
              {place?.gazetteRef ? ` (${place.gazetteRef})` : ""}, at /g/{place?.serial}
              {doc.cover ? ", with its cover" : ""}. This can’t be undone.
            </div>
          )}
        </div>
      )}

      {problem && <p className="mt-4 text-[13px] leading-5 text-maroon">{problem}</p>}

      <button
        type="button"
        disabled={!ready || publishing}
        onClick={publish}
        className="mt-6 h-12 w-full rounded-full bg-ink text-[15px] font-medium text-white transition-colors duration-300 ease-soft hover:bg-ink/85 disabled:cursor-not-allowed disabled:bg-ink/35"
      >
        {publishing ? "Publishing…" : "Publish"}
      </button>
    </Dialog>
  );
}
