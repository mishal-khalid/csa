"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAccount } from "@/lib/session";
import { ChevronDownIcon, PlusIcon } from "../dashboard/icons";
import { GazetteSkeleton } from "../dashboard/skeletons";
import { formatDate, problemFor, typeAndNumber } from "./gazette";

// The "New Document" button and its menu: "Add Cover" for an Act, President's Order, Regulation or
// Guideline; "No cover" for a Notice (Director's Order Number 01/2026, point 26).
function NewDocument({ onPick, pending }) {
  const [open, setOpen] = useState(false);
  const menu = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!menu.current?.contains(e.target)) setOpen(false);
    };
    const escape = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const items = [
    { cover: true, label: "Add Cover", note: "Act, President’s Order, Regulation or Guideline" },
    { cover: false, label: "No cover", note: "Notice" },
  ];

  return (
    <div ref={menu} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 items-center gap-2 rounded-full bg-ink pl-4 pr-4 text-[15px] font-medium text-white transition-colors duration-300 ease-soft hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:bg-ink/40"
      >
        <PlusIcon className="size-5" />
        {pending ? "Starting…" : "New Document"}
        <ChevronDownIcon className={`size-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-72 rounded-[22px] border border-white/70 bg-neutral-100/90 p-1.5 shadow-[0_24px_80px_rgba(11,11,12,0.18)] backdrop-blur-xl"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onPick(item.cover);
              }}
              className="block w-full rounded-2xl px-4 py-3 text-left transition-colors duration-200 hover:bg-white"
            >
              <span className="block text-[15px] font-medium">{item.label}</span>
              <span className="mt-0.5 block text-[13px] text-ink/50">{item.note}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const placeOf = (doc) => (doc.volume && doc.number ? `${doc.volume}·${doc.number}` : "—");

function StateTag({ doc }) {
  if (doc.state === "DRAFT") return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[13px] font-medium text-amber-900">Draft</span>;
  return <span className="text-ink/70">{doc.status ?? "—"}</span>;
}

// The Gazette tab, for admins: the Gazette Register (every published document, drafts on top), and
// New Document to make the next one.
export default function GazetteRegister() {
  const me = useAccount();
  const router = useRouter();
  const [documents, setDocuments] = useState(null);
  const [failed, setFailed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [problem, setProblem] = useState(null);

  const load = useCallback(
    () =>
      api("/gazette").then(
        ({ status, data }) => {
          if (status === 200) {
            setDocuments(data.documents);
            setFailed(false);
          } else if (status === 401) router.replace("/login");
          else if (status === 403) router.replace("/");
          else setFailed(true);
        },
        () => setFailed(true),
      ),
    [router],
  );

  useEffect(() => {
    if (me.role !== "ADMIN") router.replace("/");
    else load();
  }, [me.role, load, router]);

  async function start(cover) {
    setStarting(true);
    setProblem(null);
    try {
      const result = await api("/gazette", { body: { cover } });
      if (result.status === 401) return router.replace("/login");
      if (result.status !== 201 && result.status !== 200) {
        setProblem(problemFor(result));
        setStarting(false);
        return;
      }
      router.push(`/gazette/${result.data.document.id}`);
    } catch {
      setProblem("Couldn’t reach the portal. Try again.");
      setStarting(false);
    }
  }

  if (!documents) {
    if (!failed) return <GazetteSkeleton />;
    return (
      <div className="rounded-[28px] bg-white p-8 ring-1 ring-black/5">
        <p className="text-[15px]">Couldn’t load the Gazette.</p>
        <button type="button" onClick={load} className="mt-4 h-10 rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-ink/85">
          Try again
        </button>
      </div>
    );
  }

  const published = documents.filter((doc) => doc.state === "PUBLISHED").length;
  const drafts = documents.length - published;

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
        <div>
          <p className="text-sm text-ink/50">
            {published} published{drafts ? ` · ${drafts} draft${drafts === 1 ? "" : "s"}` : ""}
          </p>
          <h1 className="mt-2 font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">Gazette</h1>
        </div>
        <NewDocument onPick={start} pending={starting} />
      </header>
      {problem && <p className="-mt-6 text-[13px] text-maroon">{problem}</p>}

      {documents.length === 0 ? (
        <p className="rounded-[28px] bg-white p-8 text-[15px] text-ink/60 ring-1 ring-black/5">Nothing in the Gazette yet.</p>
      ) : (
        <>
          {/* wider screens: the Register as a table */}
          <div className="hidden overflow-x-auto rounded-[28px] bg-white ring-1 ring-black/5 lg:block">
            <table className="w-full min-w-[48rem] table-fixed text-[15px]">
              <colgroup>
                <col className="w-20" />
                <col className="w-[22%]" />
                <col />
                <col className="w-[20%]" />
                <col className="w-28" />
                <col className="w-28" />
              </colgroup>
              <thead>
                <tr className="text-left text-[13px] text-ink/50">
                  <th scope="col" className="py-4 pl-6 pr-3 font-normal">
                    Vol·No
                  </th>
                  {["Type & number", "Title", "Issuing body", "Published", "Status"].map((heading) => (
                    <th key={heading} scope="col" className="px-3 py-4 font-normal">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="relative border-t border-ink/10 align-top transition-colors duration-200 hover:bg-ink/[0.025]">
                    <td className="py-4 pl-6 pr-3 tabular-nums text-ink/50">{placeOf(doc)}</td>
                    <td className="px-3 py-4">{typeAndNumber(doc) || <span className="text-ink/35">—</span>}</td>
                    <td className="px-3 py-4">
                      {/* the whole row opens the document */}
                      <Link href={`/gazette/${doc.id}`} className="font-medium after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-ink">
                        <span dir="auto" className="line-clamp-2">
                          {doc.title || <span className="font-normal text-ink/40">Untitled draft</span>}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-4 text-ink/70">
                      <span className="line-clamp-2">{doc.issuingBody ?? "—"}</span>
                    </td>
                    <td className="px-3 py-4 tabular-nums text-ink/70">{formatDate(doc.publishedOn) ?? "—"}</td>
                    <td className="px-3 py-4">
                      <StateTag doc={doc} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* phones and tablets: a card per document */}
          <ul className="space-y-3 lg:hidden">
            {documents.map((doc) => (
              <li key={doc.id}>
                <Link href={`/gazette/${doc.id}`} className="block rounded-[24px] bg-white p-5 ring-1 ring-black/5 transition-colors hover:bg-white/70">
                  <div className="flex items-start justify-between gap-3 text-[13px] text-ink/50">
                    <span className="tabular-nums">{doc.volume ? `Volume ${doc.volume} · Number ${doc.number}` : "—"}</span>
                    <StateTag doc={doc} />
                  </div>
                  <p dir="auto" className="mt-2 text-[17px] font-medium">
                    {doc.title || <span className="font-normal text-ink/40">Untitled draft</span>}
                  </p>
                  <p className="mt-1 text-[15px] text-ink/60">
                    {[typeAndNumber(doc), doc.issuingBody, formatDate(doc.publishedOn)].filter(Boolean).join(" · ")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
