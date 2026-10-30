"use client";

import { useEffect, useRef, useState } from "react";
import { normalise } from "@/lib/rules";
import { CloseIcon, PlusIcon } from "../dashboard/icons";

const spinner = <span className="size-3.5 animate-spin rounded-full border-2 border-ink/15 border-t-ink/50" />;

// A fingerprint's accounts, as chips: × unlinks one, and "Link account" opens a searchable list of
// the accounts not yet linked. `link(id)` and `unlink(id)` resolve with what went wrong, or null.
export default function LinkedAccounts({ linked, accounts, link, unlink }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(null);
  const [note, setNote] = useState(null);
  const box = useRef(null);
  const search = useRef(null);
  const opener = useRef(null);

  // the list closes on a click outside it, or Esc
  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const outside = (e) => !box.current?.contains(e.target) && setOpen(false);
    const escape = (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      opener.current?.focus();
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  async function change(account, action) {
    setBusy(account.id);
    setNote(null);
    const failed = await action(account.id);
    setBusy(null);
    if (failed) setNote(failed);
    else if (action === link) {
      setOpen(false);
      setQuery("");
    }
  }

  const words = normalise(query);
  const available = accounts.filter(
    (account) =>
      !linked.some((l) => l.id === account.id) &&
      (!words || [account.name, account.username, account.email].some((text) => text.toLowerCase().includes(words))),
  );

  return (
    <div ref={box} className="relative">
      <div className="flex flex-wrap items-center gap-1.5">
        {linked.map((account) => (
          <span key={account.id} title={account.username} className="inline-flex items-center gap-1 rounded-full bg-ink/[0.06] py-1 pl-3 pr-1 text-[13px] font-medium">
            {account.name}
            <button
              type="button"
              onClick={() => change(account, unlink)}
              disabled={busy === account.id}
              aria-label={`Unlink ${account.name}`}
              className="grid size-5 place-items-center rounded-full text-ink/50 transition-colors hover:bg-ink/10 hover:text-ink disabled:cursor-wait"
            >
              {busy === account.id ? spinner : <CloseIcon className="size-3.5" />}
            </button>
          </span>
        ))}
        <button
          ref={opener}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-full py-1 pl-2 pr-3 text-[13px] font-medium text-ink/55 transition-colors hover:bg-ink/[0.05] hover:text-ink"
        >
          <PlusIcon className="size-4" />
          Link account
        </button>
      </div>
      {note && (
        <p role="alert" className="mt-1.5 text-[13px] leading-5 text-maroon">
          {note}
        </p>
      )}

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-72 max-w-[calc(100vw-4rem)] rounded-2xl bg-white p-2 shadow-[0_12px_40px_rgba(11,11,12,0.14)] ring-1 ring-black/5">
          <input
            ref={search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search accounts"
            aria-label="Search accounts"
            autoComplete="off"
            spellCheck={false}
            className="block w-full rounded-xl bg-neutral-100 px-3 py-2 text-[14px] outline-none placeholder:text-ink/40 focus:ring-2 focus:ring-ink/20"
          />
          <ul className="mt-1 max-h-64 overflow-y-auto">
            {available.map((account) => (
              <li key={account.id}>
                <button
                  type="button"
                  onClick={() => change(account, link)}
                  disabled={busy !== null}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-ink/[0.04] disabled:cursor-wait"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium">{account.name}</span>
                    <span className="block truncate text-[12px] text-ink/50">{account.username}</span>
                  </span>
                  {busy === account.id && spinner}
                </button>
              </li>
            ))}
          </ul>
          {available.length === 0 && (
            <p className="px-3 py-3 text-[13px] text-ink/50">{words ? "No accounts match." : "Every account is linked."}</p>
          )}
        </div>
      )}
    </div>
  );
}
