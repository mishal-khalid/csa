"use client";

import Link from "next/link";
import { useEvaluation } from "@/lib/evaluation";

// The six students as the mock lays them out: two to a row, CPL. Maahin top left. The page runs
// right to left, so the grid alone runs left to right to keep that order. A student whose part is
// done is in the seal's blue; one picked (for a drill pair) is outlined in it.
export default function StudentGrid({ hrefOf, onPick, isDone = () => false, isPicked = () => false }) {
  const { content } = useEvaluation();
  return (
    <ul dir="ltr" className="grid grid-cols-2 gap-x-6 gap-y-4">
      {content.students.map((s) => {
        const done = isDone(s.number);
        const picked = isPicked(s.number);
        const look = `flex h-14 w-full items-center justify-center text-[17px] transition-colors ${
          done ? "bg-seal text-white" : picked ? "bg-white text-ink ring-2 ring-seal ring-inset" : "bg-bar text-ink"
        }`;
        return (
          <li key={s.number}>
            {hrefOf ? (
              <Link href={hrefOf(s.number)} className={look}>
                {s.name}
              </Link>
            ) : (
              <button type="button" aria-pressed={picked} onClick={() => onPick(s.number)} className={look}>
                {s.name}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
