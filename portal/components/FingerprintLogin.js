"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { readFingerprint } from "@/lib/fingerprint";
import { initials } from "@/lib/session";
import { FingerprintIcon } from "./dashboard/icons";
import Dialog from "./Dialog";

const minutes = (seconds) => {
  const n = Math.max(1, Math.ceil((seconds ?? 60) / 60));
  return `${n} minute${n === 1 ? "" : "s"}`;
};

// what the API's answer to a fingerprint means, for the line under the button
function loginProblem({ status, data }) {
  switch (data?.code) {
    case "unknown_fingerprint":
      return "This fingerprint hasn’t been added to the portal.";
    case "not_linked":
      return "This fingerprint isn’t linked to any account.";
    case "not_verified":
      return "The fingerprint couldn’t be checked. Try again.";
    case "expired":
      return "That took too long. Use your fingerprint again.";
  }
  if (status === 429) return `Too many attempts. Try again in ${minutes(data?.retryAfter)}.`;
  return "Couldn’t log in right now. Try again.";
}

// "Login with fingerprint", under the login form. The browser asks the device's reader for any
// fingerprint added to the portal; one linked to a single account logs straight in, and one linked
// to several opens a list of them to choose from. Every message is said under the button.
export default function FingerprintLogin() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState(null);
  const [choices, setChoices] = useState(null);

  async function logIn() {
    if (pending) return;
    setPending(true);
    setNote(null);
    try {
      const options = await api("/auth/fingerprint/options", { body: {} });
      if (options.status !== 200) return setNote(loginProblem(options));
      const read = await readFingerprint(options.data);
      if (read.problem) return setNote(read.problem);
      const result = await api("/auth/fingerprint", { body: { reading: read.reading } });
      if (result.status === 200 && result.data.user) return router.replace("/");
      if (result.status === 200 && result.data.choose) return setChoices(result.data.choose);
      setNote(loginProblem(result));
    } catch {
      setNote("Couldn’t reach the portal. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={logIn}
        disabled={pending}
        aria-describedby="fingerprint-note"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-[15px] font-medium text-ink ring-1 ring-ink/15 transition-colors duration-300 ease-soft hover:bg-neutral-50 hover:ring-ink/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-wait disabled:text-ink/60"
      >
        <FingerprintIcon className="size-5" />
        {pending ? "Reading fingerprint…" : "Login with fingerprint"}
      </button>
      <p id="fingerprint-note" aria-live="polite" className="mt-2 min-h-5 text-center text-[13px] leading-5 text-maroon">
        {note}
      </p>
      {choices && (
        <AccountPicker
          choices={choices}
          onDone={() => router.replace("/")}
          onExpired={(problem) => {
            setChoices(null);
            setNote(problem);
          }}
          onClose={() => setChoices(null)}
        />
      )}
    </>
  );
}

// "Choose an account": the accounts a fingerprint is linked to, by name and username.
function AccountPicker({ choices, onDone, onExpired, onClose }) {
  const [picking, setPicking] = useState(null);
  const [problem, setProblem] = useState(null);

  async function pick(account) {
    if (picking) return;
    setPicking(account.id);
    setProblem(null);
    try {
      const result = await api("/auth/fingerprint/choose", { body: { userId: account.id } });
      if (result.status === 200) return onDone();
      if (result.data?.code === "expired") return onExpired(loginProblem(result));
      setProblem(result.data?.code === "not_linked" ? "This account is no longer linked to the fingerprint." : loginProblem(result));
    } catch {
      setProblem("Couldn’t reach the portal. Check your connection and try again.");
    }
    setPicking(null);
  }

  return (
    <Dialog title="Choose an account" onClose={onClose}>
      <ul className="mt-5 space-y-2">
        {choices.map((account) => (
          <li key={account.id}>
            <button
              type="button"
              onClick={() => pick(account)}
              disabled={picking !== null}
              className="flex w-full items-center gap-3 rounded-[20px] bg-white p-3 text-left ring-1 ring-black/5 transition-colors duration-200 hover:ring-black/15 disabled:cursor-wait"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-sm font-medium text-white">{initials(account.name)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{account.name}</span>
                <span className="block truncate text-[13px] text-ink/50">{account.username}</span>
              </span>
              {picking === account.id && <span className="size-4 animate-spin rounded-full border-2 border-ink/15 border-t-ink/50" />}
            </button>
          </li>
        ))}
      </ul>
      <p aria-live="polite" className="mt-3 min-h-5 text-[13px] leading-5 text-maroon">
        {problem}
      </p>
    </Dialog>
  );
}
