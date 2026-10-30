"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { breachCount, useBreachCount } from "@/lib/breach";
import { emailProblem, nameProblem, normalise, passwordProblem, roles, usernameFrom, usernameProblem } from "@/lib/rules";
import { roleLabel } from "@/lib/session";
import { ChevronDownIcon, EyeIcon, EyeOffIcon, Tick } from "../dashboard/icons";
import { BreachWarning, saveProblem } from "./cells";
import Dialog from "../Dialog";

const field =
  "mt-2 block w-full rounded-2xl bg-white py-3 pl-4 text-[15px] text-ink ring-1 ring-ink/15 outline-none transition-shadow focus:ring-2 focus:ring-ink/40 aria-invalid:ring-maroon/50 aria-invalid:focus:ring-maroon/70";
const note = "mt-2 min-h-5 text-[13px] leading-5 text-maroon";

const order = ["name", "email", "username", "password"];

// The "Create user" modal: name, email, username (made from the email until it's typed over),
// password and role. Each field is checked inline once typing pauses (or when it's left), with a
// green tick when the email, username or password checks out; empty fields are only pointed out
// when Create is pressed. The password is also checked against known breaches.
export default function CreateUserModal({ users, onCreated, onExpired, onClose }) {
  const [values, setValues] = useState({ name: "", email: "", username: "", password: "", role: "CITIZEN" });
  const [notes, setNotes] = useState({});
  const [passed, setPassed] = useState({});
  const [usernameTyped, setUsernameTyped] = useState(false);
  const [visible, setVisible] = useState(false);
  const [anyway, setAnyway] = useState(false);
  const [late, setLate] = useState({ password: null, count: null });
  const [pending, setPending] = useState(false);
  const [formNote, setFormNote] = useState(null);
  const timers = useRef({});
  const refs = useRef({});

  const problems = {
    name: nameProblem,
    email: (value) => emailProblem(value, users),
    username: (value) => usernameProblem(value, users),
    password: passwordProblem,
  };

  const passwordOk = passed.password && !passwordProblem(values.password);
  const checked = useBreachCount(values.password, passwordOk);
  const breaches = checked ?? (late.password === values.password ? late.count : null);

  useEffect(() => {
    const pending = timers.current;
    refs.current.name?.focus();
    return () => Object.values(pending).forEach(clearTimeout);
  }, []);

  function check(name, value) {
    clearTimeout(timers.current[name]);
    const problem = problems[name](value);
    setNotes((current) => ({ ...current, [name]: problem }));
    setPassed((current) => ({ ...current, [name]: !problem }));
    return problem;
  }

  // a field is checked once typing pauses; an empty one waits for Create
  function schedule(name, value) {
    clearTimeout(timers.current[name]);
    setNotes((current) => ({ ...current, [name]: null }));
    setPassed((current) => ({ ...current, [name]: false }));
    if (value.trim()) timers.current[name] = setTimeout(() => check(name, value), 450);
  }

  function change(name, value) {
    setFormNote(null);
    setValues((current) => ({ ...current, [name]: value }));
    schedule(name, value);
    if (name === "email" && !usernameTyped) {
      const suggested = usernameFrom(value);
      setValues((current) => ({ ...current, username: suggested }));
      schedule("username", suggested);
    }
    if (name === "username") setUsernameTyped(value !== "");
    if (name === "password") setAnyway(false);
  }

  const leave = (name) => () => {
    if (values[name].trim()) check(name, values[name]);
  };

  async function onSubmit(e) {
    e.preventDefault();
    if (pending) return;
    const first = order.find((name) => check(name, values[name]));
    if (first) {
      refs.current[first].focus();
      return;
    }

    setPending(true);
    setFormNote(null);
    let count = breaches;
    if (count === null) {
      count = await breachCount(values.password).catch(() => null);
      setLate({ password: values.password, count });
    }
    if (count > 0 && !anyway) {
      setPending(false);
      refs.current.password.focus();
      return;
    }

    try {
      const body = { ...values, name: values.name.trim(), email: normalise(values.email), username: normalise(values.username) };
      const result = await api("/users", { body });
      if (result.status === 201) return onCreated(result.data.user);
      if (result.status === 401) return onExpired();
      if (result.data?.code === "taken") {
        const name = result.data.field;
        setNotes((current) => ({ ...current, [name]: saveProblem(result) }));
        setPassed((current) => ({ ...current, [name]: false }));
        refs.current[name].focus();
      } else if (result.status === 403) {
        setFormNote("Only admins can create accounts.");
      } else if (result.status === 429) {
        setFormNote(saveProblem(result));
      } else {
        setFormNote("Couldn’t create the account. Try again.");
      }
    } catch {
      setFormNote("Couldn’t reach the portal. Check your connection and try again.");
    }
    setPending(false);
  }

  // a labelled text field with its note underneath (and a tick at the right when it checks out)
  const input = (name, label, { tick, ...props } = {}) => (
    <div>
      <label htmlFor={`new-${name}`} className="block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          ref={(el) => (refs.current[name] = el)}
          id={`new-${name}`}
          value={values[name]}
          onChange={(e) => change(name, e.target.value)}
          onBlur={leave(name)}
          aria-invalid={Boolean(notes[name])}
          aria-describedby={`new-${name}-note`}
          autoComplete="off"
          spellCheck={false}
          {...props}
          className={`${field} ${tick ? "pr-11" : "pr-4"}`}
        />
        {tick && passed[name] && !notes[name] && (
          <span className="pointer-events-none absolute bottom-0 right-4 flex h-[46px] items-center">
            <Tick />
          </span>
        )}
      </div>
      <p id={`new-${name}-note`} aria-live="polite" className={note}>
        {notes[name]}
      </p>
    </div>
  );

  return (
    <Dialog title="Create user" onClose={onClose}>
      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-2">
        {input("name", "Name", { autoCapitalize: "words" })}
        {input("email", "Email", { type: "email", inputMode: "email", autoCapitalize: "none", tick: true })}
        {input("username", "Username", { autoCapitalize: "none", tick: true })}

        <div>
          <label htmlFor="new-password" className="block text-sm font-medium">
            Password
          </label>
          <div className="relative">
            <input
              ref={(el) => (refs.current.password = el)}
              id="new-password"
              type={visible ? "text" : "password"}
              value={values.password}
              onChange={(e) => change("password", e.target.value)}
              onBlur={() => values.password && check("password", values.password)}
              aria-invalid={Boolean(notes.password || (breaches > 0 && !anyway))}
              aria-describedby="new-password-note"
              autoComplete="new-password"
              spellCheck={false}
              className={`${field} pr-20`}
            />
            <span className="absolute bottom-0 right-2 flex h-[46px] items-center gap-1">
              {passwordOk && breaches === 0 && <Tick />}
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? "Hide the password" : "Show the password"}
                className="grid size-9 place-items-center rounded-full text-ink/45 transition-colors hover:text-ink"
              >
                {visible ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
              </button>
            </span>
          </div>
          <div id="new-password-note" aria-live="polite">
            {notes.password || !(breaches > 0) ? (
              <p className={note}>{notes.password}</p>
            ) : (
              <div className="pb-2">
                <BreachWarning count={breaches} anyway={anyway} setAnyway={setAnyway} />
              </div>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="new-role" className="block text-sm font-medium">
            Role
          </label>
          <div className="relative">
            <select
              id="new-role"
              value={values.role}
              onChange={(e) => setValues((current) => ({ ...current, role: e.target.value }))}
              className={`${field} cursor-pointer appearance-none pr-11`}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute bottom-[13px] right-4 size-5 text-ink/45" />
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-6 h-12 w-full rounded-full bg-ink text-[15px] font-medium text-white transition-colors duration-300 ease-soft hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-wait disabled:bg-ink/70"
        >
          {pending ? "Creating…" : "Create user"}
        </button>
        <p aria-live="polite" className={`${note} text-center`}>
          {formNote}
        </p>
      </form>
    </Dialog>
  );
}
