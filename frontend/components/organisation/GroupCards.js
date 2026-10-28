import Image from "next/image";
import Link from "next/link";
import { groupHref, groups } from "./groups";

// A grey tile per group: its emblems, name, a line on its remit and how many bodies it holds.
export default function GroupCards() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map(({ slug, name, line, count, emblems }) => (
        <li key={slug}>
          <Link
            href={groupHref(slug)}
            className="flex h-full min-h-72 flex-col justify-between gap-10 rounded-3xl bg-[#f4f4f2] p-8 transition-colors duration-300 hover:bg-[#ececea]"
          >
            <span className="flex items-center gap-3">
              {emblems.map(({ src, width }) => (
                <Image key={src} src={src} alt="" width={width} height={64} className="h-12 w-auto" />
              ))}
            </span>
            <span>
              <span className="block text-sm text-ink/50">{count}</span>
              <span className="mt-2 block text-2xl font-medium tracking-tight">{name}</span>
              <span className="mt-2 block max-w-sm text-[15px] leading-relaxed text-ink/60">{line}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
