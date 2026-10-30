"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { holdLoading } from "@/components/loader/ready";
import { api } from "@/lib/api";
import { useAccount } from "@/lib/session";
import { PlusIcon } from "../dashboard/icons";
import { DirectorySkeleton } from "../dashboard/skeletons";
import TypedDeleteDialog from "../TypedDeleteDialog";
import { saveProblem } from "../users/cells";
import AddEntryModal from "./AddEntryModal";
import Details from "./Details";
import { childrenMap, kindsIn, pathTo } from "./entries";
import Tree from "./Tree";

const wide = () => window.matchMedia("(min-width: 1024px)").matches;

// The Directory tab: everything under the CSA (departments, bodies, commissions, companies,
// institutions and other kinds), arranged in folders such as Cabinet and inside one another. A
// folding tree on the left, the picked entry's details on the right (on phones, the details are a
// screen of their own). Everyone signed in can browse it; admins add, edit, drag to move, and
// delete. The picked entry is in the address (?entry=…), so it can be linked to.
export default function Directory() {
  const me = useAccount();
  const canEdit = me.role === "ADMIN";
  const router = useRouter();
  const params = useSearchParams();
  const [entries, setEntries] = useState(null);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());
  // undefined while closed; null to add at the top level, or the entry to add inside
  const [adding, setAdding] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const [treeNote, setTreeNote] = useState(null);
  const release = useRef(null);
  // on phones, whether the details screen was opened from the tree (so Back can go back to it)
  const openedHere = useRef(false);

  // the loading screen (when there is one) stays up until the Directory is in
  useLayoutEffect(() => {
    release.current = holdLoading();
    return () => release.current();
  }, []);
  useLayoutEffect(() => {
    if (entries || failed) release.current?.();
  }, [entries, failed]);

  const expired = useCallback(() => router.replace("/login"), [router]);

  const byId = useMemo(() => new Map((entries ?? []).map((e) => [e.id, e])), [entries]);
  const childrenOf = useMemo(() => childrenMap(entries ?? []), [entries]);
  const kinds = useMemo(() => kindsIn(entries ?? []), [entries]);
  const selected = byId.get(params.get("entry")) ?? null;

  // the top level starts unfolded, and so does the way to an entry in the address
  const load = useCallback(
    () =>
      api("/directory").then(
        ({ status, data }) => {
          if (status === 401) return expired();
          if (status !== 200) return setFailed(true);
          const found = new Map(data.entries.map((e) => [e.id, e]));
          const linked = new URLSearchParams(window.location.search).get("entry");
          setExpanded(new Set([...data.entries.filter((e) => !e.parentId).map((e) => e.id), ...pathTo(linked, found).map((e) => e.id)]));
          setEntries(data.entries);
          setFailed(false);
        },
        () => setFailed(true),
      ),
    [expired],
  );

  useEffect(() => {
    load();
  }, [load]);

  // picks an entry: unfolds the way to it, and puts it in the address (on phones, as a new screen)
  function select(id) {
    setExpanded((current) => new Set([...current, ...pathTo(id, byId).map((e) => e.id)]));
    const href = id ? `/directory?entry=${id}` : "/directory";
    if (wide()) router.replace(href, { scroll: false });
    else {
      openedHere.current = Boolean(id);
      router.push(href);
    }
  }

  function back() {
    if (openedHere.current) router.back();
    else router.replace("/directory");
    openedHere.current = false;
  }

  // a call that changes the Directory; resolves with what went wrong, or null
  async function call(path, options, onDone) {
    try {
      const result = await api(path, options);
      if (result.status === 401) {
        expired();
        return "Your session has ended.";
      }
      if (result.status >= 300) {
        const code = result.data?.code;
        if (code === "into_itself") return "Something can’t go inside itself.";
        if (code === "not_empty") return "Move or delete what’s inside it first.";
        if (result.status === 404) return "That’s no longer in the Directory.";
        return saveProblem(result);
      }
      onDone(result.data);
      return null;
    } catch {
      return "Couldn’t reach the portal. Try again.";
    }
  }

  const change = (entry, field, value) =>
    call(`/directory/${entry.id}`, { method: "PATCH", body: { [field]: value } }, ({ entry: saved }) =>
      setEntries((current) => current.map((e) => (e.id === saved.id ? saved : e))),
    );

  async function move(id, parentId, index) {
    setTreeNote(await call(`/directory/${id}/move`, { body: { parentId, index } }, (data) => setEntries(data.entries)));
  }

  async function remove(entry) {
    const problem = await call(`/directory/${entry.id}`, { method: "DELETE", body: {} }, () => {
      setEntries((current) => current.filter((e) => e.id !== entry.id));
      setDeleting(null);
      // the details go back to where it was
      if (selected?.id === entry.id) router.replace(entry.parentId ? `/directory?entry=${entry.parentId}` : "/directory", { scroll: false });
    });
    return problem;
  }

  if (!entries) {
    if (!failed) return <DirectorySkeleton />;
    return (
      <div className="rounded-[28px] bg-white p-8 ring-1 ring-black/5">
        <p className="text-[15px]">Couldn’t load the Directory.</p>
        <button type="button" onClick={load} className="mt-4 h-10 rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-ink/85">
          Try again
        </button>
      </div>
    );
  }

  const count = entries.filter((e) => !e.folder).length;

  return (
    <div className="space-y-10">
      {/* on phones, the details screen has its own heading */}
      <header className={selected ? "hidden lg:block" : undefined}>
        <p className="text-sm text-ink/50">
          {count} {count === 1 ? "entry" : "entries"}
        </p>
        <h1 className="mt-2 font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">Directory</h1>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <section aria-label="Directory tree" className={`rounded-[28px] bg-white p-3 ring-1 ring-black/5 ${selected ? "hidden lg:block" : ""}`}>
          <div className="flex min-h-11 items-center justify-between gap-3 pb-1 pl-3">
            <h2 className="text-sm font-medium text-ink/50">Inside the CSA</h2>
            {canEdit && (
              <button
                type="button"
                onClick={() => setAdding(null)}
                className="flex h-9 items-center gap-1.5 rounded-full pl-3 pr-4 text-[13px] font-medium text-ink/60 transition-colors hover:bg-ink/[0.05] hover:text-ink"
              >
                <PlusIcon className="size-4" />
                Add
              </button>
            )}
          </div>
          {treeNote && (
            <p role="alert" className="px-3 pb-2 text-[13px] leading-5 text-maroon">
              {treeNote}
            </p>
          )}
          {entries.length ? (
            <Tree
              childrenOf={childrenOf}
              byId={byId}
              selectedId={selected?.id}
              onSelect={select}
              expanded={expanded}
              setExpanded={setExpanded}
              canEdit={canEdit}
              move={move}
            />
          ) : (
            <p className="px-3 pb-4 pt-2 text-[14px] text-ink/45">Nothing here yet.</p>
          )}
        </section>

        <div className={`lg:sticky lg:top-8 ${selected ? "" : "hidden lg:block"}`}>
          {selected ? (
            <Details
              entry={selected}
              path={pathTo(selected.id, byId)}
              inside={childrenOf.get(selected.id) ?? []}
              kinds={kinds}
              canEdit={canEdit}
              onSelect={select}
              change={change}
              onAdd={() => setAdding(selected)}
              onDelete={() => setDeleting(selected)}
              onBack={back}
            />
          ) : (
            <div className="rounded-[28px] border border-dashed border-ink/15 px-8 py-16 text-center text-[15px] text-ink/45">
              Pick something in the tree to see its details.
            </div>
          )}
        </div>
      </div>

      {adding !== undefined && (
        <AddEntryModal
          parent={adding}
          kinds={kinds}
          onExpired={expired}
          onClose={() => setAdding(undefined)}
          onAdded={(entry) => {
            setEntries((current) => [...current, entry]);
            if (adding) setExpanded((current) => new Set(current).add(adding.id));
            setAdding(undefined);
            select(entry.id);
          }}
          onAddedMany={({ entries: all, added }) => {
            // everything new is unfolded, so it can all be seen
            const folders = all.filter((e) => e.folder && !byId.has(e.id)).map((e) => e.id);
            setEntries(all);
            setExpanded((current) => new Set([...current, ...folders, ...(adding ? [adding.id] : [])]));
            setAdding(undefined);
            // adding inside something keeps it picked (its panel lists what's now inside it)
            if (!adding && added.length) select(added[0]);
          }}
        />
      )}
      {deleting && (
        <TypedDeleteDialog
          title={`Delete ${deleting.name}?`}
          explanation={
            <>
              This can’t be undone. To confirm, type its name, <span className="font-medium text-ink">{deleting.name}</span>.
            </>
          }
          label="Name"
          matches={(typed) => typed.trim().toLowerCase() === deleting.name.trim().toLowerCase()}
          remove={() => remove(deleting)}
          button={`Delete ${deleting.folder ? "folder" : "entry"}`}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
