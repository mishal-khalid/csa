import Image from "next/image";
import Link from "next/link";

// A section of a group page: a heading on the left over its content. tone="grey" sits it on off-white.
export function Section({ id, title, intro, tone = "white", children }) {
  return (
    <section
      aria-labelledby={id}
      className={`px-4 py-24 sm:px-6 lg:py-32 ${tone === "grey" ? "bg-neutral-50" : "bg-white"}`}
    >
      <div className="mx-auto max-w-[1200px]">
        {/* scroll-mt keeps a heading clear of the fixed nav when a link jumps to it (e.g. /exec#cabinet) */}
        <h2 id={id} className="scroll-mt-32 text-3xl font-medium tracking-tight sm:text-4xl">
          {title}
        </h2>
        {intro && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/60">{intro}</p>}
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

// A grey tile for one body: its emblem, name and who leads it. Opens the body's page.
export function BodyCard({ href, name, head, post, emblem }) {
  return (
    <Link
      href={href}
      className="flex h-full min-h-64 flex-col justify-between gap-10 rounded-3xl bg-[#f4f4f2] p-8 transition-colors duration-300 hover:bg-[#ececea]"
    >
      <Image src={emblem.src} alt="" width={emblem.width} height={64} className="h-14 w-auto self-start" />
      <span>
        <span className="block text-xl font-medium tracking-tight">{name}</span>
        <span className="mt-3 block text-[15px] text-ink/80">{head ?? "To be announced"}</span>
        <span className="mt-1 block text-sm text-ink/50">{post}</span>
      </span>
    </Link>
  );
}

export function BodyGrid({ items }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.href}>
          <BodyCard {...item} />
        </li>
      ))}
    </ul>
  );
}

// Stands in for a person's portrait until photos exist: a neutral silhouette in a circle.
// Size it with className (e.g. "size-16"); `dark` is for use on a black background.
export function Silhouette({ className = "", dark = false }) {
  return (
    <span
      aria-hidden="true"
      className={`block shrink-0 overflow-hidden rounded-full ${dark ? "bg-white/10 text-white/25" : "bg-[#e9e9e6] text-ink/20"} ${className}`}
    >
      <svg viewBox="0 0 64 64" fill="currentColor" className="size-full translate-y-[10%]">
        <circle cx="32" cy="24" r="12" />
        <path d="M8 64c0-14 10.7-24 24-24s24 10 24 24z" />
      </svg>
    </span>
  );
}

// A person on a white card: silhouette, name, title, and an optional note (what they look after).
// With an href the whole card links there. A null name is a post not yet filled.
export function PersonCard({ name, title, note, href }) {
  const content = (
    <>
      <Silhouette className="size-16" />
      <div>
        <p className="text-lg font-medium tracking-tight">{name ?? "To be announced"}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink/60">{title}</p>
        {note && <p className="text-[13px] text-ink/45">{note}</p>}
      </div>
    </>
  );
  const card = "flex h-full items-center gap-5 rounded-3xl bg-white p-6 ring-1 ring-ink/10";
  return href ? (
    <Link href={href} className={`${card} transition-colors duration-300 hover:bg-[#f4f4f2]`}>
      {content}
    </Link>
  ) : (
    <div className={card}>{content}</div>
  );
}

export function PersonGrid({ people }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {people.map((person) => (
        <li key={(person.name ?? "") + person.title}>
          <PersonCard {...person} />
        </li>
      ))}
    </ul>
  );
}

// A contact block: label and value pairs in a row; values with an href become links.
export function ContactList({ items }) {
  return (
    <dl className="flex flex-wrap gap-x-12 gap-y-6">
      {items.map(({ label, value, href }) => (
        <div key={label}>
          <dt className="text-sm text-ink/50">{label}</dt>
          <dd className="mt-1 text-[15px]">
            {href ? (
              <a href={href} className="hover:text-ink/70">
                {value}
              </a>
            ) : (
              value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// A person who doesn't have a page of their own: name and post on an outlined tile.
export function PersonTile({ name, post }) {
  return (
    <div className="h-full rounded-3xl p-8 ring-1 ring-ink/10">
      <p className="text-xl font-medium tracking-tight">{name}</p>
      <p className="mt-2 text-[15px] leading-relaxed text-ink/60">{post}</p>
    </div>
  );
}
