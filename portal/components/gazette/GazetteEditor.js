"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAccount } from "@/lib/session";
import TypedDeleteDialog from "../TypedDeleteDialog";
import { ArrowDownIcon, ArrowUpIcon, ChevronLeftIcon, DownloadIcon, TrashIcon, UploadIcon } from "../dashboard/icons";
import { GazetteEditorSkeleton } from "../dashboard/skeletons";
import { TextCell } from "../users/cells";
import { coverTypes, formatDate, megabytes, problemFor, statuses, today, typeLabel } from "./gazette";
import PublishDialog from "./PublishDialog";
import TextReview from "./TextReview";

const SITE = process.env.NEXT_PUBLIC_SITE_URL;
const card = "rounded-[28px] bg-white p-6 ring-1 ring-black/5 sm:p-7";
const heading = "text-[13px] font-medium uppercase tracking-[0.14em] text-ink/45";

// Uploads a PDF straight to storage, then has the API take it in (and read it). Resolves with the
// updated document, or what went wrong.
async function uploadPdf(id, kind, file) {
  if (file.type && file.type !== "application/pdf") return { problem: "That isn’t a PDF." };
  const target = await api(`/gazette/${id}/uploads`, { body: { kind, size: file.size } });
  if (target.status === 401) return { expired: true };
  if (target.status !== 200) return { problem: problemFor(target) };
  const put = await fetch(target.data.upload.url, { method: "PUT", headers: target.data.upload.headers, body: file }).catch(() => null);
  if (!put?.ok) return { problem: "The upload didn’t go through. Try again." };
  const taken = await api(`/gazette/${id}/files`, { body: { kind, path: target.data.path, name: file.name } });
  if (taken.status === 401) return { expired: true };
  // turned away as a repeat: say which document it repeats, to open from here
  if (taken.status !== 200) return { problem: problemFor(taken), repeats: taken.data?.duplicate?.self === false ? taken.data.duplicate : null };
  return { document: taken.data.document };
}

// A PDF fetched into the page, so it shows in the frame (and downloads) wherever it's kept: a link
// straight to storage can be refused a frame by the storage's own headers. Returns its local address,
// or the link itself when the file can't be fetched (the website's own older PDFs, which allow
// framing but not fetching from the portal).
function usePdf(url) {
  // the local copy, with the link it was made from (an older one counts for nothing)
  const [loaded, setLoaded] = useState({ url: null, local: null });
  useEffect(() => {
    if (!url) return;
    let address = null;
    let live = true;
    fetch(url)
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (!live) return;
        if (!blob) return setLoaded({ url, local: url });
        address = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setLoaded({ url, local: address });
      })
      .catch(() => live && setLoaded({ url, local: url }));
    return () => {
      live = false;
      if (address) URL.revokeObjectURL(address);
    };
  }, [url]);
  const local = url && loaded.url === url ? loaded.local : null;
  return local;
}

// A place to drop a PDF, or click to choose one.
function DropZone({ label, note, busy, onFile, compact }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && !busy) onFile(file);
      }}
      className={`grid place-items-center rounded-[24px] border-2 border-dashed text-center transition-colors ${
        over ? "border-ink/40 bg-ink/[0.03]" : "border-ink/15"
      } ${compact ? "p-5" : "min-h-[22rem] p-8"}`}
    >
      <div>
        {!compact && <UploadIcon className="mx-auto size-8 text-ink/35" />}
        <p className={`${compact ? "" : "mt-4"} text-[15px] font-medium`}>{busy ?? label}</p>
        {!busy && note && <p className="mt-1 text-[13px] text-ink/50">{note}</p>}
        {!busy && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="mt-4 h-10 rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-ink/85"
          >
            Choose a PDF
          </button>
        )}
        {busy && <span className="mx-auto mt-4 block size-5 animate-spin rounded-full border-2 border-ink/15 border-t-ink/60" />}
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onFile(file);
          }}
        />
      </div>
    </div>
  );
}

function Row({ term, children }) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-3">
      <dt className="py-1 text-[13px] leading-6 text-ink/50">{term}</dt>
      <dd className="min-w-0 text-[15px]">{children}</dd>
    </div>
  );
}

// A Gazette document in the portal: the finished PDF on the left (with its cover, as it will be
// published), and on the right where it goes in the Gazette, its details as read from the document,
// its appendices, its text to check, and Check and publish. Once published, it's the Register entry:
// its place and PDFs are fixed, and only its status, commencement and transcription can change.
export default function GazetteEditor({ id }) {
  const me = useAccount();
  const router = useRouter();
  const [doc, setDoc] = useState(null);
  const [failed, setFailed] = useState(false);
  const [next, setNext] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewProblem, setPreviewProblem] = useState(null);
  const [busy, setBusy] = useState(null);
  const [problem, setProblem] = useState(null);
  // the document an upload was turned away for repeating
  const [repeats, setRepeats] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const date = today();

  const expired = useCallback(() => router.replace("/login"), [router]);

  const load = useCallback(
    () =>
      Promise.all([api(`/gazette/${id}`), api(`/gazette/next?date=${date}`)]).then(
        ([result, place]) => {
          if (result.status === 401) return expired();
          if (result.status === 403) return router.replace("/");
          if (result.status !== 200) return setFailed(true);
          setDoc(result.data.document);
          if (place.status === 200) setNext(place.data);
          setFailed(false);
        },
        () => setFailed(true),
      ),
    [id, date, expired, router],
  );

  useEffect(() => {
    if (me.role !== "ADMIN") router.replace("/");
    else load();
  }, [me.role, load, router]);

  const draft = doc?.state === "DRAFT";
  // the finished PDF: the preview while it's a draft, the published issue after
  const published = doc?.files?.[0]?.href;
  const pdf = usePdf(draft ? preview?.view : published ? (published.startsWith("/") ? `${SITE}${published}` : published) : null);

  // the finished PDF, built again whenever what's on the cover or in the issue changes
  const previewKey = doc && draft && doc.main ? JSON.stringify([doc.type, doc.docNumber, doc.title, doc.main.name, doc.main.pages, doc.appendices.map((a) => a.path)]) : null;
  useEffect(() => {
    if (!previewKey) return;
    let live = true;
    const timer = setTimeout(async () => {
      setPreviewProblem(null);
      try {
        const result = await api(`/gazette/${id}/preview`, { body: { date } });
        if (!live) return;
        if (result.status === 401) return expired();
        if (result.status === 200) setPreview(result.data);
        else {
          setPreview(null);
          setPreviewProblem(problemFor(result));
        }
      } catch {
        if (live) setPreviewProblem("Couldn’t reach the portal to build the PDF.");
      }
    }, 400);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [previewKey, id, date, expired]);

  // saves changes to the document; resolves with what went wrong, or null
  const change = useCallback(
    async (changes) => {
      try {
        const result = await api(`/gazette/${id}`, { method: "PATCH", body: changes });
        if (result.status === 401) {
          expired();
          return "Your session has ended.";
        }
        if (result.status !== 200) return problemFor(result);
        setDoc(result.data.document);
        return null;
      } catch {
        return "Couldn’t reach the portal. Try again.";
      }
    },
    [id, expired],
  );

  async function upload(kind, file) {
    setBusy(kind === "main" ? "Uploading and reading the document…" : "Uploading the appendix…");
    setProblem(null);
    setRepeats(null);
    try {
      const result = await uploadPdf(id, kind, file);
      if (result.expired) return expired();
      if (result.problem) {
        setProblem(result.problem);
        setRepeats(result.repeats);
      } else setDoc(result.document);
    } catch {
      setProblem("Couldn’t reach the portal. Try again.");
    }
    setBusy(null);
  }

  async function removeAppendix(path) {
    const result = await api(`/gazette/${id}/appendices/remove`, { body: { path } }).catch(() => null);
    if (result?.status === 200) setDoc(result.data.document);
    else setProblem(result ? problemFor(result) : "Couldn’t reach the portal. Try again.");
  }

  async function moveAppendix(index, by) {
    const order = doc.appendices.map((a) => a.path);
    const [moved] = order.splice(index, 1);
    order.splice(index + by, 0, moved);
    const failed = await change({ appendixOrder: order });
    if (failed) setProblem(failed);
  }

  if (!doc) {
    if (!failed) return <GazetteEditorSkeleton />;
    return (
      <div className="rounded-[28px] bg-white p-8 ring-1 ring-black/5">
        <p className="text-[15px]">Couldn’t load this document.</p>
        <button type="button" onClick={load} className="mt-4 h-10 rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-ink/85">
          Try again
        </button>
      </div>
    );
  }

  const place = draft ? next : doc;
  const filename = `${(doc.title || "Gazette document").replace(/[^\w .()’'-]+/g, "").trim()}.pdf`;
  const nextNumber = next?.series?.[doc.type];
  const dhivehi = doc.language === "dv";

  return (
    <div className="space-y-8">
      <header>
        <Link href="/gazette" className="inline-flex items-center gap-1 text-sm font-medium text-ink/50 hover:text-ink">
          <ChevronLeftIcon className="size-4" />
          Gazette
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <p className="text-sm text-ink/50">
              {draft ? `Draft · ${doc.cover ? "with a cover" : "no cover"}` : `Published ${formatDate(doc.publishedOn)}`}
            </p>
            <h1 dir="auto" className="mt-2 font-serif text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              {doc.title || (draft ? "New document" : "Untitled")}
            </h1>
          </div>
          {draft && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleting(true)}
                className="flex h-12 items-center gap-2 rounded-full px-4 text-[15px] font-medium text-ink/60 transition-colors hover:bg-maroon/[0.08] hover:text-maroon"
              >
                <TrashIcon className="size-[18px]" />
                Delete draft
              </button>
              <button
                type="button"
                disabled={!doc.main}
                onClick={() => setPublishing(true)}
                className="h-12 rounded-full bg-ink px-6 text-[15px] font-medium text-white transition-colors duration-300 ease-soft hover:bg-ink/85 disabled:bg-ink/35"
              >
                Check and publish
              </button>
            </div>
          )}
        </div>
        {problem && (
          <p className="mt-3 text-[13px] text-maroon">
            {problem}
            {repeats && (
              <>
                {" "}
                <Link href={`/gazette/${repeats.id}`} className="font-medium underline underline-offset-2 hover:text-maroon/80">
                  Open it
                </Link>
              </>
            )}
          </p>
        )}
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* left: the PDF */}
        <section aria-label="The PDF" className="xl:sticky xl:top-8">
          {draft && !doc.main ? (
            <DropZone
              label="Drop the document’s PDF here"
              note={doc.cover ? "Without a cover: the module adds it." : "A Notice is published without a cover."}
              busy={busy}
              onFile={(file) => upload("main", file)}
            />
          ) : (
            <div className="overflow-hidden rounded-[28px] bg-white ring-1 ring-black/5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-5 py-3">
                <p className="min-w-0 truncate text-[13px] text-ink/50">
                  {draft
                    ? `${doc.cover ? "Cover + " : ""}${doc.main.pages} page${doc.main.pages === 1 ? "" : "s"}${doc.appendices.length ? ` + ${doc.appendices.length} appendix PDF${doc.appendices.length === 1 ? "" : "s"}` : ""}`
                    : "As published"}
                </p>
                <div className="flex gap-2">
                  {draft && (
                    <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink/60 hover:bg-ink/[0.05]">
                      <UploadIcon className="size-4" />
                      Replace PDF
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) upload("main", file);
                        }}
                      />
                    </label>
                  )}
                  {pdf && (
                    <a
                      href={pdf}
                      download={filename}
                      className="flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-white hover:bg-ink/85"
                    >
                      <DownloadIcon className="size-4" />
                      Download PDF
                    </a>
                  )}
                </div>
              </div>
              {busy ? (
                <div className="grid h-[70svh] place-items-center text-[15px] text-ink/60">{busy}</div>
              ) : previewProblem ? (
                <div className="grid h-[40svh] place-items-center p-8 text-center text-[15px] leading-6 text-ink/60">
                  <p>
                    The PDF can’t be built yet. {previewProblem}
                  </p>
                </div>
              ) : pdf ? (
                <iframe title="The finished PDF" src={pdf} className="block h-[calc(100svh-9rem)] min-h-[32rem] w-full bg-neutral-100" />
              ) : (
                <div className="grid h-[70svh] place-items-center text-[15px] text-ink/50">{draft ? "Building the PDF…" : "Loading the PDF…"}</div>
              )}
            </div>
          )}
        </section>

        {/* right: the details */}
        <div className="space-y-6">
          <section className={card}>
            <h2 className={heading}>In the Gazette</h2>
            <div className="mt-4 grid grid-cols-3 gap-4">
              {[
                ["Volume", place?.volume],
                ["Number", place?.number],
                ["Address", place?.serial ? `/g/${place.serial}` : null],
              ].map(([term, value]) => (
                <div key={term}>
                  <p className="text-[13px] text-ink/50">{term}</p>
                  <p className="mt-1 font-serif text-3xl font-semibold tabular-nums">{value ?? "—"}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[13px] leading-5 text-ink/50">
              {draft
                ? `If it’s published today (${formatDate(date)}), after the last document in the Register. They’re given for good when it’s published.`
                : `${doc.gazetteRef ?? ""}${doc.gazetteRef ? " · " : ""}published ${formatDate(doc.publishedOn)}.`}
            </p>
            {!draft && SITE && doc.serial && (
              <a href={`${SITE}/g/${doc.serial}`} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-medium underline underline-offset-4">
                Open it on the Gazette
              </a>
            )}
          </section>

          <section className={card}>
            <h2 className={heading}>Details</h2>
            <dl className="mt-4 space-y-2.5">
              <Row term="Type">
                {draft && doc.cover ? (
                  <select
                    value={doc.type}
                    onChange={async (e) => {
                      const failed = await change({ type: e.target.value });
                      if (failed) setProblem(failed);
                    }}
                    className="-mx-2 w-[calc(100%+1rem)] rounded-lg bg-transparent px-2 py-1 hover:bg-ink/[0.05]"
                  >
                    {coverTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="block py-1">{doc.tag ?? typeLabel(doc.type)}</span>
                )}
              </Row>
              <Row term={doc.type === "notice" ? "Reference" : "Number"}>
                <TextCell
                  value={doc.docNumber}
                  label="Number"
                  editable={draft}
                  placeholder={doc.type === "notice" ? "The Notice’s reference" : "e.g. 3/2026"}
                  problem={() => null}
                  save={(v) => change({ docNumber: v })}
                />
                {draft && nextNumber && doc.docNumber !== nextNumber && (
                  <button type="button" onClick={() => change({ docNumber: nextNumber })} className="mt-1 text-[13px] text-ink/60 underline underline-offset-4 hover:text-ink">
                    Next free: {nextNumber}. Use it
                  </button>
                )}
              </Row>
              <Row term="Title">
                <TextCell value={doc.title} label="Title" editable={draft} wrap placeholder="The document’s title" problem={() => null} save={(v) => change({ title: v })} />
              </Row>
              <Row term="Issuing body">
                <TextCell
                  value={doc.issuingBody}
                  label="Issuing body"
                  editable={draft}
                  wrap
                  placeholder="e.g. The President’s Office"
                  problem={() => null}
                  save={(v) => change({ issuingBody: v })}
                />
              </Row>
              <Row term="Published">
                <span className="block py-1">{draft ? `On publishing (today, ${formatDate(date)})` : formatDate(doc.publishedOn)}</span>
              </Row>
              <Row term="Comes into force">
                <input
                  type="date"
                  value={doc.commencesOn ?? ""}
                  onChange={async (e) => {
                    const failed = await change({ commencesOn: e.target.value || null });
                    if (failed) setProblem(failed);
                  }}
                  className="-mx-2 rounded-lg bg-transparent px-2 py-1 hover:bg-ink/[0.05]"
                />
                {!doc.commencesOn && <span className="ml-2 text-[13px] text-ink/50">on publication</span>}
              </Row>
              {!draft && (
                <Row term="Status">
                  <select
                    value={doc.status ?? ""}
                    onChange={async (e) => {
                      const failed = await change({ status: e.target.value });
                      if (failed) setProblem(failed);
                    }}
                    className="-mx-2 rounded-lg bg-transparent px-2 py-1 hover:bg-ink/[0.05]"
                  >
                    {!statuses.includes(doc.status) && doc.status && <option value={doc.status}>{doc.status}</option>}
                    {statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </Row>
              )}
            </dl>
          </section>

          {(draft || doc.files?.length > 1) && (
            <section className={card}>
              <h2 className={heading}>Appendices</h2>
              {draft ? (
                <>
                  {doc.appendices.length > 0 && (
                    <ol className="mt-4 space-y-2">
                      {doc.appendices.map((appendix, i) => (
                        <li key={appendix.path} className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-3">
                          <span className="w-6 text-[13px] tabular-nums text-ink/40">{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-medium">{appendix.title ?? appendix.name}</p>
                            <p className="text-[13px] text-ink/50">
                              {appendix.number ? `Reads as Appendix ${appendix.number} · ` : ""}
                              {appendix.pages} page{appendix.pages === 1 ? "" : "s"} · {megabytes(appendix.size)}
                            </p>
                          </div>
                          <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => moveAppendix(i, -1)} className="grid size-8 place-items-center rounded-full text-ink/50 hover:bg-ink/[0.06] disabled:opacity-30">
                            <ArrowUpIcon className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Move down"
                            disabled={i === doc.appendices.length - 1}
                            onClick={() => moveAppendix(i, 1)}
                            className="grid size-8 place-items-center rounded-full text-ink/50 hover:bg-ink/[0.06] disabled:opacity-30"
                          >
                            <ArrowDownIcon className="size-4" />
                          </button>
                          <button type="button" aria-label={`Remove ${appendix.name}`} onClick={() => removeAppendix(appendix.path)} className="grid size-8 place-items-center rounded-full text-ink/40 hover:bg-maroon/[0.08] hover:text-maroon">
                            <TrashIcon className="size-4" />
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                  <div className="mt-4">
                    <DropZone compact label="Add an appendix PDF" note="Each appendix as its own PDF, in order." busy={busy === "Uploading the appendix…" ? busy : null} onFile={(file) => upload("appendix", file)} />
                  </div>
                </>
              ) : (
                <ul className="mt-4 space-y-2">
                  {doc.files.slice(1).map((file) => (
                    <li key={file.href}>
                      <a href={file.href.startsWith("/") ? `${SITE}${file.href}` : file.href} target="_blank" rel="noreferrer" className="text-[15px] font-medium underline underline-offset-4">
                        {file.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {doc.notes?.length > 0 && draft && (
            <section className={card}>
              <h2 className={heading}>From the reader</h2>
              <ul className="mt-4 space-y-2 text-[15px] leading-6">
                {doc.notes.map((note, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-14 shrink-0 text-[13px] leading-6 text-ink/45">{note.page ? `Page ${note.page}` : ""}</span>
                    <span>{note.message}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={card}>
            <h2 className={heading}>Text</h2>
            <p className="mt-2 text-[13px] leading-5 text-ink/50">
              Read from the PDF by fixed rules, so the same PDF always reads the same way. Check it against the PDF and fix anything that reads wrong.
            </p>
            <div className="mt-4">
              <TextReview blocks={doc.blocks} editable dhivehi={dhivehi} save={(blocks) => change({ blocks })} />
            </div>
          </section>
        </div>
      </div>

      {publishing && (
        <PublishDialog
          doc={doc}
          place={next}
          onExpired={expired}
          onClose={() => setPublishing(false)}
          onPublished={(published) => {
            setPublishing(false);
            setDoc(published);
            setPreview(null);
          }}
        />
      )}
      {deleting && (
        <TypedDeleteDialog
          title="Delete this draft?"
          explanation="The draft and its uploaded PDFs are deleted. Nothing has been published, so nothing else changes."
          label="Type “delete” to confirm"
          matches={(typed) => typed.trim().toLowerCase() === "delete"}
          button="Delete draft"
          onClose={() => setDeleting(false)}
          remove={async () => {
            const result = await api(`/gazette/${id}`, { method: "DELETE", body: {} }).catch(() => null);
            if (result?.status === 204) {
              router.replace("/gazette");
              return null;
            }
            return result ? problemFor(result) : "Couldn’t reach the portal. Try again.";
          }}
        />
      )}
    </div>
  );
}
