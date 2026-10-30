"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { EMAIL, normalise, USERNAME } from "@/lib/rules";
import { Tick } from "./dashboard/icons";
import FingerprintLogin from "./FingerprintLogin";

const field =
  "mt-2 block w-full rounded-2xl bg-white py-3 pl-4 text-[15px] text-ink ring-1 ring-ink/15 outline-none transition-shadow focus:ring-2 focus:ring-ink/40 aria-invalid:ring-maroon/50 aria-invalid:focus:ring-maroon/70";
const note = "mt-2 min-h-5 text-[13px] leading-5 text-maroon";

// what's been typed: an email (it has an @) or a username, and whether it's well-formed
function classify(raw) {
  const value = normalise(raw);
  if (!value) return null;
  if (value.includes("@")) return { kind: "email", valid: value.length <= 254 && EMAIL.test(value) };
  return { kind: "username", valid: USERNAME.test(value) };
}

const minutes = (seconds) => {
  const n = Math.max(1, Math.ceil((seconds ?? 60) / 60));
  return `${n} minute${n === 1 ? "" : "s"}`;
};

// the line under the username/email field, for each state of its check
function identifierNote({ status, kind, retryAfter }) {
  switch (status) {
    case "required":
      return "Enter your email or username.";
    case "invalid":
      return kind === "email"
        ? "Enter a valid email address."
        : "Usernames are 3–30 letters, numbers, dots, dashes or underscores.";
    case "missing":
      return kind === "email" ? "There’s no account with this email." : "There’s no account with this username.";
    case "limited":
      return `Too many checks. Try again in ${minutes(retryAfter)}.`;
    case "error":
      return "Couldn’t check that right now. Try again.";
    default:
      return null;
  }
}

// The portal's login form, with "Login with fingerprint" under it (FingerprintLogin). Everything is
// checked inline, under each field, never in a pop-up:
// - Username or email: once typing pauses, it's checked for form (an email or a valid username),
//   then against the accounts; a green tick at the right means the account exists.
// - Password: checked when Login is pressed; a wrong password, or a locked account, is said under
//   the field.
// The API behind it (backend/) rate-limits these checks and pads their timing.
export default function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [check, setCheck] = useState({ status: "empty" });
  const [password, setPassword] = useState("");
  const [passwordNote, setPasswordNote] = useState(null);
  const [pending, setPending] = useState(false);

  const identifierRef = useRef(null);
  const passwordRef = useRef(null);
  const timer = useRef(null);
  const inflight = useRef(null);

  useEffect(() => {
    // already signed in: straight to the portal
    api("/auth/me").then(({ data }) => data?.user && router.replace("/"), () => {});
    return () => {
      clearTimeout(timer.current);
      inflight.current?.abort();
    };
  }, [router]);

  async function lookUp(value, kind) {
    const controller = new AbortController();
    inflight.current = controller;
    setCheck({ status: "checking", kind });
    try {
      const { status, data } = await api("/auth/lookup", {
        body: { identifier: value },
        signal: controller.signal,
      });
      if (status === 200) setCheck({ status: data.exists ? "found" : "missing", kind });
      else if (status === 429) setCheck({ status: "limited", kind, retryAfter: data?.retryAfter });
      else if (status === 400) setCheck({ status: "invalid", kind });
      else setCheck({ status: "error", kind });
    } catch (error) {
      if (error.name !== "AbortError") setCheck({ status: "error", kind });
    }
  }

  function onIdentifierChange(e) {
    const value = e.target.value;
    setIdentifier(value);
    clearTimeout(timer.current);
    inflight.current?.abort();
    const typed = classify(value);
    if (!typed) return setCheck({ status: "empty" });
    setCheck({ status: "typing", kind: typed.kind });
    // checked once typing pauses
    timer.current = setTimeout(() => {
      if (!typed.valid) setCheck({ status: "invalid", kind: typed.kind });
      else lookUp(value, typed.kind);
    }, 450);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (pending) return;
    const typed = classify(identifier);
    if (!typed || !typed.valid || check.status === "missing") {
      if (!typed) setCheck({ status: "required" });
      else if (!typed.valid) setCheck({ status: "invalid", kind: typed.kind });
      identifierRef.current.focus();
      return;
    }
    if (!password) {
      setPasswordNote("Enter your password.");
      passwordRef.current.focus();
      return;
    }

    setPending(true);
    setPasswordNote(null);
    try {
      const { status, data } = await api("/auth/login", {
        body: { identifier, password },
      });
      if (status === 200) {
        router.replace("/");
        return;
      }
      if (data?.code === "no_account") {
        setCheck({ status: "missing", kind: typed.kind });
        identifierRef.current.focus();
      } else if (data?.code === "wrong_password") {
        setPasswordNote("That password isn’t right.");
        passwordRef.current.select();
      } else if (data?.code === "locked") {
        setPasswordNote(`Too many wrong passwords. Try again in ${minutes(data.retryAfter)}.`);
      } else if (status === 429) {
        setPasswordNote(`Too many attempts. Try again in ${minutes(data?.retryAfter)}.`);
      } else {
        setPasswordNote("Couldn’t log in right now. Try again.");
      }
    } catch {
      setPasswordNote("Couldn’t reach the portal. Check your connection and try again.");
    }
    setPending(false);
  }

  const identifierMessage = identifierNote(check);

  return (
    // noValidate: the browser's own pop-up messages are replaced by the inline ones
    <form onSubmit={onSubmit} noValidate className="w-full max-w-sm space-y-2">
      <div>
        <label htmlFor="identifier" className="block text-sm font-medium">
          Username or email
        </label>
        <div className="relative">
          <input
            ref={identifierRef}
            id="identifier"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={identifier}
            onChange={onIdentifierChange}
            aria-invalid={Boolean(identifierMessage)}
            aria-describedby="identifier-note"
            className={`${field} pr-11`}
          />
          {/* the check's state, at the right of the field */}
          <span className="pointer-events-none absolute bottom-0 right-4 flex h-[46px] items-center">
            {check.status === "checking" && (
              <span className="size-4 animate-spin rounded-full border-2 border-ink/15 border-t-ink/50" />
            )}
            {check.status === "found" && <Tick />}
          </span>
        </div>
        <p id="identifier-note" aria-live="polite" className={note}>
          {identifierMessage}
          {check.status === "found" && <span className="sr-only">Account found.</span>}
        </p>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          ref={passwordRef}
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setPasswordNote(null);
          }}
          aria-invalid={Boolean(passwordNote)}
          aria-describedby="password-note"
          className={`${field} pr-4`}
        />
        <p id="password-note" aria-live="polite" className={note}>
          {passwordNote}
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-4 h-12 w-full rounded-full bg-ink text-[15px] font-medium text-white transition-colors duration-300 ease-soft hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-wait disabled:bg-ink/70"
      >
        {pending ? "Logging in…" : "Login"}
      </button>
      <div className="flex items-center gap-3 pb-2 pt-4 text-[13px] text-ink/40">
        <span className="h-px flex-1 bg-ink/10" />
        or
        <span className="h-px flex-1 bg-ink/10" />
      </div>
      <FingerprintLogin />
    </form>
  );
}
