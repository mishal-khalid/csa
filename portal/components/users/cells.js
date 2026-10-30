"use client";

import { useEffect, useRef, useState } from "react";
import { breachCount, useBreachCount } from "@/lib/breach";
import { passwordProblem, roles } from "@/lib/rules";
import { roleLabel } from "@/lib/session";
import { ChevronDownIcon, EyeIcon, EyeOffIcon, Tick } from "../dashboard/icons";

// The table's cells, edited in place: clicking one turns it into a field. Enter or clicking away
// saves it (once it checks out), Esc puts it back. What's wrong is said under the field as you type.

const view =
  "-mx-2 block w-[calc(100%+1rem)] rounded-lg px-2 py-1 text-left transition-colors duration-200 hover:bg-ink/[0.05] focus-visible:outline-2 focus-visible:outline-ink";
const input =
  "-mx-2 block w-[calc(100%+1rem)] rounded-lg bg-white px-2 py-1 ring-2 ring-ink/25 outline-none transition-shadow placeholder:text-ink/35 focus:ring-ink/40 aria-invalid:ring-maroon/50 disabled:text-ink/50";
const noteStyle = "mt-1.5 text-[13px] leading-5 text-maroon";

const spinner = <span className="size-3.5 animate-spin rounded-full border-2 border-ink/15 border-t-ink/50" />;

const minutes = (seconds) => {
  const n = Math.max(1, Math.ceil((seconds ?? 60) / 60));
  return `${n} minute${n === 1 ? "" : "s"}`;
};

// what the API's answer to a change means, for the line under the field (null when it worked)
export function saveProblem({ status, data }) {
  if (status === 200 || status === 201 || status === 204) return null;
  if (data?.code === "taken") return data.field === "email" ? "This email already has an account." : "This username is taken.";
  if (data?.code === "main_account") return "Only the main account can change this.";
  if (data?.code === "self") return "You can’t change your own role.";
  if (status === 429) return `Too many changes. Try again in ${minutes(data?.retryAfter)}.`;
  if (status === 404) return "This account no longer exists.";
  return "Couldn’t save that. Try again.";
}

// the tick that shows for a moment after a change is saved
function useSavedTick() {
  const [saved, setSaved] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [
    saved,
    () => {
      setSaved(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setSaved(false), 1600);
    },
  ];
}

// A text cell (name, username, email). `problem(draft)` says what's wrong with a draft;
// `normalise` gives the value as it would be stored, to tell whether anything changed;
// `save(value)` resolves with a problem from the API, or null. A long value is cut short with "…",
// or, with `wrap`, runs onto more lines. An empty value shows `placeholder` (or a dash, when it
// can't be edited).
export function TextCell({
  value: given,
  label,
  editable,
  problem,
  normalise = (raw) => raw.trim(),
  save,
  inputMode,
  wrap,
  placeholder = "",
  className = "",
}) {
  const value = given ?? "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [note, setNote] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, flashSaved] = useSavedTick();
  const timer = useRef(null);
  // set while a save is on its way, so the blur that follows Enter doesn't save twice
  const busy = useRef(false);
  const field = useRef(null);
  const button = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (editing) field.current?.select();
  }, [editing]);

  const fit = wrap ? "break-words" : "truncate";

  // the whole value on hover, when it's cut short
  const title = wrap || !value ? undefined : value;

  if (!editable) {
    return (
      <span title={title} className={`block py-1 ${fit} ${className}`}>
        {value || <span className="text-ink/35">—</span>}
      </span>
    );
  }

  function open() {
    setDraft(value);
    setNote(null);
    setEditing(true);
  }

  function close(refocus) {
    clearTimeout(timer.current);
    setEditing(false);
    setNote(null);
    if (refocus) requestAnimationFrame(() => button.current?.focus());
  }

  async function commit(refocus) {
    if (busy.current || !editing) return;
    clearTimeout(timer.current);
    const next = normalise(draft);
    if (next === value) return close(refocus);
    const found = problem(draft);
    setNote(found);
    if (found) return;
    busy.current = true;
    setSaving(true);
    const failed = await save(next);
    busy.current = false;
    setSaving(false);
    if (failed) {
      setNote(failed);
      return;
    }
    close(refocus);
    flashSaved();
  }

  if (!editing) {
    return (
      <button
        ref={button}
        type="button"
        onClick={open}
        aria-label={`${label}: ${value || "empty"}. Edit`}
        title={title}
        className={`${view} ${className}`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={`min-w-0 ${fit}`}>{value || <span className="text-ink/35">{placeholder}</span>}</span>
          {saved && <Tick className="size-4 shrink-0" />}
        </span>
      </button>
    );
  }

  return (
    <div>
      <div className="relative">
        <input
          ref={field}
          aria-label={label}
          placeholder={placeholder}
          value={draft}
          disabled={saving}
          inputMode={inputMode}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            setNote(null);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => setNote(normalise(next) === value ? null : problem(next)), 450);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(true);
            } else if (e.key === "Escape") {
              e.preventDefault();
              close(true);
            }
          }}
          onBlur={() => commit(false)}
          aria-invalid={Boolean(note)}
          className={`${input} ${saving ? "pr-7" : ""} ${className}`}
        />
        {saving && <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center">{spinner}</span>}
      </div>
      {note && (
        <p role="alert" className={noteStyle}>
          {note}
        </p>
      )}
    </div>
  );
}

// A password cell: dots, with an eye that shows the password (fetched only then) and hides it
// again. Clicking the dots sets a new password, which is also checked against known breaches.
export function PasswordCell({ user, canView, editable, reveal, save }) {
  const [shown, setShown] = useState(null);
  const [revealing, setRevealing] = useState(false);
  const [revealNote, setRevealNote] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [visible, setVisible] = useState(false);
  const [note, setNote] = useState(null);
  const [anyway, setAnyway] = useState(false);
  // a breach count worked out on saving, before the as-you-type check had come back
  const [late, setLate] = useState({ password: null, count: null });
  const [saving, setSaving] = useState(false);
  const [saved, flashSaved] = useSavedTick();
  const timer = useRef(null);
  const busy = useRef(false);
  const box = useRef(null);
  const field = useRef(null);
  const button = useRef(null);

  const checked = useBreachCount(draft, editing && !passwordProblem(draft));
  const breaches = checked ?? (late.password === draft ? late.count : null);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (editing) field.current?.focus();
  }, [editing]);

  async function toggleShown() {
    if (shown !== null) return setShown(null);
    setRevealing(true);
    const result = await reveal();
    setRevealing(false);
    if (result.password !== undefined) {
      setShown(result.password);
      setRevealNote(null);
    } else setRevealNote(result.problem);
  }

  function open() {
    setDraft("");
    setNote(null);
    setAnyway(false);
    setVisible(false);
    setEditing(true);
  }

  function close(refocus) {
    clearTimeout(timer.current);
    setEditing(false);
    setNote(null);
    if (refocus) requestAnimationFrame(() => button.current?.focus());
  }

  async function commit(refocus) {
    if (busy.current || !editing) return;
    clearTimeout(timer.current);
    if (!draft) return close(refocus);
    const found = passwordProblem(draft);
    setNote(found);
    if (found) return;
    busy.current = true;
    setSaving(true);
    let count = breaches;
    if (count === null) {
      count = await breachCount(draft).catch(() => null);
      setLate({ password: draft, count });
    }
    // a breached password needs "Use it anyway" ticked first
    const blocked = count > 0 && !anyway;
    const failed = blocked ? null : await save(draft);
    busy.current = false;
    setSaving(false);
    if (blocked) return;
    if (failed) {
      setNote(failed);
      return;
    }
    setShown(null);
    close(refocus);
    flashSaved();
  }

  if (editing) {
    return (
      <div
        ref={box}
        // clicking the eye or the "Use it anyway" box keeps the field open; clicking anywhere else saves
        onBlur={(e) => {
          if (!box.current?.contains(e.relatedTarget)) commit(false);
        }}
      >
        <div className="relative">
          <input
            ref={field}
            type={visible ? "text" : "password"}
            aria-label="New password"
            placeholder="New password"
            value={draft}
            disabled={saving}
            autoComplete="new-password"
            spellCheck={false}
            onChange={(e) => {
              const next = e.target.value;
              setDraft(next);
              setNote(null);
              setAnyway(false);
              clearTimeout(timer.current);
              timer.current = setTimeout(() => setNote(next ? passwordProblem(next) : null), 450);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit(true);
              } else if (e.key === "Escape") {
                e.preventDefault();
                close(true);
              }
            }}
            aria-invalid={Boolean(note || (breaches > 0 && !anyway))}
            className={`${input} pr-8 placeholder:text-ink/35`}
          />
          <span className="absolute inset-y-0 right-0 flex items-center">
            {saving ? (
              spinner
            ) : (
              <button
                type="button"
                onClick={() => {
                  setVisible((v) => !v);
                  field.current?.focus();
                }}
                aria-label={visible ? "Hide the password" : "Show the password"}
                className="grid size-7 place-items-center rounded-md text-ink/45 hover:text-ink"
              >
                {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            )}
          </span>
        </div>
        {note && (
          <p role="alert" className={noteStyle}>
            {note}
          </p>
        )}
        {!note && breaches > 0 && <BreachWarning count={breaches} anyway={anyway} setAnyway={(v) => (setAnyway(v), field.current?.focus())} small />}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1">
        {editable ? (
          <button
            ref={button}
            type="button"
            onClick={open}
            aria-label="Password. Set a new one"
            className="-ml-2 min-w-0 rounded-lg px-2 py-1 text-left transition-colors duration-200 hover:bg-ink/[0.05] focus-visible:outline-2 focus-visible:outline-ink"
          >
            <PasswordText user={user} shown={shown} saved={saved} />
          </button>
        ) : (
          <span className="block min-w-0 py-1">
            <PasswordText user={user} shown={shown} saved={saved} />
          </span>
        )}
        {canView && user.passwordStored && (
          <button
            type="button"
            onClick={toggleShown}
            disabled={revealing}
            aria-label={shown !== null ? "Hide the password" : "Show the password"}
            aria-pressed={shown !== null}
            className="grid size-8 shrink-0 place-items-center rounded-full text-ink/45 transition-colors duration-200 hover:bg-ink/[0.05] hover:text-ink disabled:cursor-wait"
          >
            {revealing ? spinner : shown !== null ? <EyeOffIcon className="size-[18px]" /> : <EyeIcon className="size-[18px]" />}
          </button>
        )}
      </div>
      {revealNote && (
        <p role="alert" className={noteStyle}>
          {revealNote}
        </p>
      )}
    </div>
  );
}

function PasswordText({ user, shown, saved }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {!user.passwordStored ? (
        <span className="truncate text-ink/40">Not stored</span>
      ) : shown !== null ? (
        // shown in full, wrapping if it's long
        <span className="min-w-0 break-all font-mono text-[14px]">{shown}</span>
      ) : (
        <span aria-label="Hidden" className="truncate tracking-[0.15em] text-ink/60">
          ••••••••••
        </span>
      )}
      {saved && <Tick className="size-4 shrink-0" />}
    </span>
  );
}

// the line under a password that's turned up in data breaches, with the choice to use it anyway
export function BreachWarning({ count, anyway, setAnyway, small }) {
  return (
    <div className={small ? "mt-1.5" : "mt-2"}>
      <p role="alert" className="text-[13px] leading-5 text-maroon">
        This password has appeared in {count.toLocaleString("en-GB")} data breach{count === 1 ? "" : "es"}. Attackers try passwords like it first.
      </p>
      <label className="mt-1.5 inline-flex cursor-pointer items-center gap-2 text-[13px] font-medium">
        <input type="checkbox" checked={anyway} onChange={(e) => setAnyway(e.target.checked)} className="size-4 accent-ink" />
        Use it anyway
      </label>
    </div>
  );
}

// A role cell: the role, which opens the browser's own list of roles when clicked; picking one
// saves it at once.
export function RoleCell({ value, editable, lockedReason, save }) {
  // the role just picked, shown while it saves
  const [picked, setPicked] = useState(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(null);
  const [saved, flashSaved] = useSavedTick();

  if (!editable) {
    return (
      <span title={lockedReason} className="block truncate py-1">
        {roleLabel(value)}
      </span>
    );
  }

  return (
    <div>
      <div className="relative -mx-2 inline-flex max-w-[calc(100%+1rem)] items-center">
        <select
          aria-label="Role"
          value={picked ?? value}
          disabled={saving}
          onChange={async (e) => {
            setPicked(e.target.value);
            setSaving(true);
            setNote(null);
            const failed = await save(e.target.value);
            setPicked(null);
            setSaving(false);
            if (failed) setNote(failed);
            else flashSaved();
          }}
          className="w-full cursor-pointer appearance-none truncate rounded-lg bg-transparent py-1 pl-2 pr-7 transition-colors duration-200 outline-none hover:bg-ink/[0.05] focus-visible:ring-2 focus-visible:ring-ink/40 disabled:cursor-wait"
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {roleLabel(role)}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-1.5 flex items-center">
          {saving ? spinner : saved ? <Tick className="size-4" /> : <ChevronDownIcon className="size-4 text-ink/40" />}
        </span>
      </div>
      {note && (
        <p role="alert" className={noteStyle}>
          {note}
        </p>
      )}
    </div>
  );
}
