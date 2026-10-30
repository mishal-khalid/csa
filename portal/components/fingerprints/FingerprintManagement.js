"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { holdLoading } from "@/components/loader/ready";
import { api } from "@/lib/api";
import { nameProblem } from "@/lib/rules";
import { useAccount } from "@/lib/session";
import { FingerprintIcon, TrashIcon } from "../dashboard/icons";
import { FingerprintsSkeleton } from "../dashboard/skeletons";
import TypedDeleteDialog from "../TypedDeleteDialog";
import { saveProblem, TextCell } from "../users/cells";
import AddFingerprintModal from "./AddFingerprintModal";
import LinkedAccounts from "./LinkedAccounts";

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const moment = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// The Fingerprint Management tab, for the main account only: every fingerprint (a passkey on one
// device), named and edited in place, with the accounts it signs in to (a table on wider screens,
// a card per fingerprint on phones), "Add a fingerprint" and Delete.
export default function FingerprintManagement() {
  const me = useAccount();
  const router = useRouter();
  const [fingerprints, setFingerprints] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const release = useRef(null);

  // the loading screen stays up until the fingerprints are in
  useLayoutEffect(() => {
    release.current = holdLoading();
    return () => release.current();
  }, []);
  useLayoutEffect(() => {
    if (fingerprints || failed) release.current?.();
  }, [fingerprints, failed]);

  const expired = useCallback(() => router.replace("/login"), [router]);

  // the fingerprints, and every account (for linking)
  const load = useCallback(
    () =>
      Promise.all([api("/fingerprints"), api("/users")]).then(
        ([found, users]) => {
          if (found.status === 401) return expired();
          if (found.status === 403) return router.replace("/");
          if (found.status !== 200 || users.status !== 200) return setFailed(true);
          setFingerprints(found.data.fingerprints);
          setAccounts(users.data.users);
          setFailed(false);
        },
        () => setFailed(true),
      ),
    [expired, router],
  );

  useEffect(() => {
    if (!me.main) {
      release.current?.();
      router.replace("/");
      return;
    }
    load();
  }, [me.main, load, router]);

  // a change to one fingerprint; resolves with what went wrong, or null
  async function change(path, options) {
    try {
      const result = await api(path, options);
      if (result.status === 401) {
        expired();
        return "Your session has ended.";
      }
      if (result.status !== 200) return result.status === 404 ? "This fingerprint or account no longer exists." : saveProblem(result);
      const saved = result.data.fingerprint;
      setFingerprints((current) => current.map((f) => (f.id === saved.id ? saved : f)));
      return null;
    } catch {
      return "Couldn’t reach the portal. Try again.";
    }
  }

  async function remove(fingerprint, typed) {
    try {
      const result = await api(`/fingerprints/${fingerprint.id}`, { method: "DELETE", body: { name: typed } });
      if (result.status === 204) {
        setFingerprints((current) => current.filter((f) => f.id !== fingerprint.id));
        setDeleting(null);
        return null;
      }
      if (result.status === 401) {
        expired();
        return "Your session has ended.";
      }
      return result.data?.code === "confirm" ? "That isn’t this fingerprint’s name." : saveProblem(result);
    } catch {
      return "Couldn’t reach the portal. Check your connection and try again.";
    }
  }

  // each fingerprint's cells, for the table and the cards alike
  function cellsFor(fingerprint) {
    const base = `/fingerprints/${fingerprint.id}`;
    return {
      name: (
        <TextCell
          value={fingerprint.name}
          label="Name"
          editable
          wrap
          problem={nameProblem}
          save={(name) => change(base, { method: "PATCH", body: { name } })}
        />
      ),
      accounts: (
        <LinkedAccounts
          linked={fingerprint.accounts}
          accounts={accounts}
          link={(userId) => change(`${base}/accounts`, { body: { userId } })}
          unlink={(userId) => change(`${base}/accounts/${userId}`, { method: "DELETE", body: {} })}
        />
      ),
      added: day.format(new Date(fingerprint.createdAt)),
      lastUsed: fingerprint.lastUsedAt ? moment.format(new Date(fingerprint.lastUsedAt)) : <span className="text-ink/40">Never</span>,
      remove: (
        <button
          type="button"
          onClick={() => setDeleting(fingerprint)}
          aria-label={`Delete ${fingerprint.name}`}
          className="grid size-8 place-items-center rounded-full text-ink/40 transition-colors duration-200 hover:bg-maroon/[0.08] hover:text-maroon"
        >
          <TrashIcon className="size-[18px]" />
        </button>
      ),
    };
  }

  if (!fingerprints) {
    if (!failed) return <FingerprintsSkeleton />;
    return (
      <div className="rounded-[28px] bg-white p-8 ring-1 ring-black/5">
        <p className="text-[15px]">Couldn’t load the fingerprints.</p>
        <button type="button" onClick={load} className="mt-4 h-10 rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-ink/85">
          Try again
        </button>
      </div>
    );
  }

  const rows = fingerprints.map((fingerprint) => ({ fingerprint, cells: cellsFor(fingerprint) }));

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
        <div>
          <p className="text-sm text-ink/50">
            {fingerprints.length} fingerprint{fingerprints.length === 1 ? "" : "s"}
          </p>
          <h1 className="mt-2 font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">Fingerprint Management</h1>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex h-12 items-center gap-2 rounded-full bg-ink pl-4 pr-5 text-[15px] font-medium text-white transition-colors duration-300 ease-soft hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <FingerprintIcon className="size-5" />
          Add a fingerprint
        </button>
      </header>

      {fingerprints.length === 0 ? (
        <div className="rounded-[28px] bg-white px-6 py-12 text-center ring-1 ring-black/5">
          <FingerprintIcon className="mx-auto size-8 text-ink/30" />
          <p className="mt-3 text-[15px] text-ink/60">No fingerprints yet.</p>
        </div>
      ) : (
        <>
          {/* wider screens: the table (no scrolling box, so the Link account list can hang below it) */}
          <div className="hidden rounded-[28px] bg-white ring-1 ring-black/5 lg:block">
            <table className="w-full table-fixed text-[15px]">
              <colgroup>
                <col className="w-[26%]" />
                <col />
                <col className="w-32" />
                <col className="w-44" />
                <col className="w-14" />
              </colgroup>
              <thead>
                <tr className="text-left text-[13px] text-ink/50">
                  {["Name", "Linked accounts", "Added", "Last used"].map((heading, i) => (
                    <th key={heading} scope="col" className={`py-4 font-normal ${i === 0 ? "pl-6 pr-3" : "px-3"}`}>
                      {heading}
                    </th>
                  ))}
                  <th scope="col" className="py-4 pr-4">
                    <span className="sr-only">Delete</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ fingerprint, cells }) => (
                  <tr key={fingerprint.id} className="border-t border-ink/10 align-top">
                    <td className="py-3 pl-6 pr-3">{cells.name}</td>
                    <td className="px-3 py-3">{cells.accounts}</td>
                    <td className="px-3 py-3">
                      <span className="block py-1">{cells.added}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="block py-1">{cells.lastUsed}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end">{cells.remove}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* phones and tablets: a card per fingerprint */}
          <ul className="space-y-3 lg:hidden">
            {rows.map(({ fingerprint, cells }) => (
              <li key={fingerprint.id} className="rounded-[24px] bg-white p-5 ring-1 ring-black/5">
                <div className="flex items-start gap-3">
                  <FingerprintIcon className="mt-1.5 size-5 shrink-0 text-ink/40" />
                  <div className="min-w-0 flex-1 text-[17px] font-medium">{cells.name}</div>
                  {cells.remove}
                </div>
                <dl className="mt-3 space-y-2 border-t border-ink/10 pt-3 text-[15px]">
                  {[
                    ["Accounts", cells.accounts],
                    ["Added", cells.added],
                    ["Last used", cells.lastUsed],
                  ].map(([term, cell]) => (
                    <div key={term} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-3">
                      <dt className="py-1 text-[13px] leading-6 text-ink/50">{term}</dt>
                      <dd className="min-w-0 py-1">{cell}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}

      {adding && (
        <AddFingerprintModal
          onExpired={expired}
          onClose={() => setAdding(false)}
          onAdded={(fingerprint) => {
            setFingerprints((current) => [...current, fingerprint]);
            setAdding(false);
          }}
        />
      )}
      {deleting && (
        <TypedDeleteDialog
          title={`Delete ${deleting.name}?`}
          explanation={
            <>
              This can’t be undone. It stops logging in to its accounts. To confirm, type its name,{" "}
              <span className="font-medium text-ink">{deleting.name}</span>.
            </>
          }
          label="Name"
          matches={(typed) => typed.trim().toLowerCase() === deleting.name.trim().toLowerCase()}
          remove={(typed) => remove(deleting, typed)}
          button="Delete fingerprint"
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
