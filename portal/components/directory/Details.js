"use client";

import { Fragment } from "react";
import { ChevronLeftIcon, ChevronRightIcon, OutIcon, PlusIcon, TrashIcon } from "../dashboard/icons";
import { TextCell } from "../users/cells";
import { entryIcon, kindOf } from "./entries";
import KindCell from "./KindCell";
import { detailProblems, entryNameProblem, webAddress } from "./rules";

// a labelled line in a section
function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
      <dt className="py-1 text-[13px] leading-6 text-ink/50">{label}</dt>
      <dd className="min-w-0 text-[15px]">{children}</dd>
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <section className="border-t border-ink/10 pt-5">
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-ink/50">{title}</h3>
        {action}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

// a small link beside an email address or website, to open it
function OpenLink({ href, label }) {
  return (
    <a
      href={href}
      target={href.startsWith("mailto:") ? undefined : "_blank"}
      rel="noreferrer"
      aria-label={label}
      className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-ink/35 transition-colors hover:bg-ink/[0.05] hover:text-ink"
    >
      <OutIcon className="size-4" />
    </a>
  );
}

// The details of the entry picked in the tree: its kind and where it sits, its name, then (for
// everything but folders) its kind, head and contact details, and what's inside it. Admins edit
// any of it in place, add inside it, and delete it once it's empty. On phones it's a screen of its
// own, with Back.
export default function Details({ entry, path, inside, kinds, canEdit, onSelect, change, onAdd, onDelete, onBack }) {
  const save = (field) => (value) => change(entry, field, value);

  const detail = (field, label, placeholder, link) => {
    const href = link?.(entry[field]);
    return (
      <Row label={label}>
        <div className="flex items-start gap-1">
          <div className="min-w-0 flex-1">
            <TextCell
              value={entry[field]}
              label={label}
              editable={canEdit}
              wrap
              placeholder={placeholder}
              problem={detailProblems[field]}
              save={save(field)}
            />
          </div>
          {href && <OpenLink href={href} label={`Open ${label.toLowerCase()}`} />}
        </div>
      </Row>
    );
  };

  return (
    <article className="rounded-[28px] bg-white p-6 ring-1 ring-black/5 sm:p-8">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 mb-5 flex items-center gap-1 rounded-full py-1 pl-1 pr-3 text-[14px] font-medium text-ink/60 transition-colors hover:bg-ink/[0.04] hover:text-ink lg:hidden"
      >
        <ChevronLeftIcon className="size-5" />
        Directory
      </button>

      {/* its kind, and the path to it */}
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-ink/50">
        {entryIcon(entry, "size-4")}
        <span>{kindOf(entry)}</span>
        {path.length > 0 && <span aria-hidden="true">·</span>}
        {path.map((ancestor, i) => (
          <Fragment key={ancestor.id}>
            <button type="button" onClick={() => onSelect(ancestor.id)} className="rounded transition-colors hover:text-ink">
              {ancestor.name}
            </button>
            {i < path.length - 1 && <span aria-hidden="true">›</span>}
          </Fragment>
        ))}
      </p>
      <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
        <TextCell value={entry.name} label="Name" editable={canEdit} wrap problem={entryNameProblem} save={save("name")} />
      </h2>

      <div className="mt-8 space-y-6">
        {!entry.folder && (
          <>
            <Section title="Kind">
              <KindCell value={entry.kind} kinds={kinds} editable={canEdit} save={save("kind")} />
            </Section>
            <Section title="Head">
              <dl className="space-y-1">
                {detail("headName", "Name", "Add a name")}
                {detail("headPost", "Post", "Add a post")}
              </dl>
            </Section>
            <Section title="Contact">
              <dl className="space-y-1">
                {detail("email", "Email", "Add an email", (value) => value && `mailto:${value}`)}
                {detail("phone", "Phone", "Add a phone number", (value) => value && `tel:${value.replace(/[^+0-9]/g, "")}`)}
                {detail("website", "Website", "Add a website", (value) => value && webAddress(value))}
                {detail("address", "Address", "Add an address")}
              </dl>
            </Section>
          </>
        )}

        <Section
          title={`Inside it (${inside.length})`}
          action={
            canEdit && (
              <button
                type="button"
                onClick={onAdd}
                className="flex h-9 items-center gap-1.5 rounded-full bg-ink pl-3 pr-4 text-[13px] font-medium text-white transition-colors duration-300 ease-soft hover:bg-ink/85"
              >
                <PlusIcon className="size-4" />
                Add inside
              </button>
            )
          }
        >
          {inside.length ? (
            <ul className="space-y-0.5">
              {inside.map((child) => (
                <li key={child.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(child.id)}
                    className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-ink/[0.04]"
                  >
                    {entryIcon(child, "size-[18px] shrink-0 text-ink/55")}
                    <span className="min-w-0 flex-1 truncate text-[15px]">{child.name}</span>
                    <span className="shrink-0 text-[13px] text-ink/45">{kindOf(child)}</span>
                    <ChevronRightIcon className="size-4 shrink-0 text-ink/30" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-1 text-[14px] text-ink/45">Nothing inside yet.</p>
          )}
        </Section>

        {canEdit && (
          <div className="border-t border-ink/10 pt-5">
            <button
              type="button"
              onClick={onDelete}
              disabled={inside.length > 0}
              aria-describedby={inside.length ? "delete-why" : undefined}
              className="-ml-3 flex items-center gap-2 rounded-full px-3 py-2 text-[14px] font-medium text-maroon transition-colors hover:bg-maroon/[0.06] disabled:cursor-not-allowed disabled:text-ink/30 disabled:hover:bg-transparent"
            >
              <TrashIcon className="size-[18px]" />
              Delete {entry.folder ? "folder" : "entry"}
            </button>
            {inside.length > 0 && (
              <p id="delete-why" className="mt-1 text-[13px] text-ink/45">
                Move or delete what’s inside it first.
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
