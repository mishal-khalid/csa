"use client";

import { useState } from "react";
import Link from "next/link";
import Screen, { Heading, MainButton } from "@/components/Screen";
import StudentGrid from "@/components/StudentGrid";
import { useEvaluation, useResults } from "@/lib/evaluation";
import { words } from "@/lib/words";

const partPaths = { THEORY: "/theory", DRILL: "/drill", COMMANDING: "/commanding", INSPECTION: "/inspection" };

// The home page, as the mock has it: the four parts, then the students (each opens their marks).
// Below them, Finish.
export default function Home() {
  return (
    <Screen subtitle={words.syllabusParts}>
      <nav className="mt-8 space-y-5">
        {Object.entries(partPaths).map(([part, path]) => (
          <Link key={part} href={path} className="flex h-14 items-center justify-center bg-bar text-[20px] active:bg-edge">
            {words.parts[part].name}
          </Link>
        ))}
      </nav>
      <Heading>{words.students}</Heading>
      <StudentGrid hrefOf={(n) => `/students/${n}`} />
      <Finish />
    </Screen>
  );
}

// Finish: only once every student has every item scored; until all instructors have finished it
// can be reopened. Says what's still missing, and who hasn't finished yet.
function Finish() {
  const ev = useEvaluation();
  const [results, check] = useResults();
  const [missing, setMissing] = useState(null);
  const [problem, setProblem] = useState(null);
  const [busy, setBusy] = useState(false);
  const name = (n) => ev.content.students[n - 1].name;

  async function finish() {
    setBusy(true);
    setProblem(null);
    const outcome = await ev.finish();
    setMissing(outcome?.missing ?? null);
    if (outcome?.offline) setProblem(words.noConnection);
    if (!outcome) check();
    setBusy(false);
  }

  async function reopen() {
    setBusy(true);
    if (!(await ev.reopen())) check();
    setBusy(false);
  }

  const waiting = results?.instructors.filter((i) => !i.finished) ?? [];

  return (
    <section className="mt-14">
      {ev.instructor.finished ? (
        <div className="text-center">
          <p className="text-[19px] font-bold text-seal">{words.finished}</p>
          {results && !results.open && (
            <>
              {waiting.length > 0 ? (
                <p className="mt-2 text-[16px]">
                  {words.waitingFor} <span className="font-sans">{waiting.map((i) => i.name).join("، ")}</span>
                </p>
              ) : (
                <p className="mt-2 text-[16px]">{words.needMore(results.needed)}</p>
              )}
              <button type="button" onClick={reopen} disabled={busy} className="mt-5 h-12 w-full border-2 border-seal text-[18px] text-seal">
                {words.reopen}
              </button>
            </>
          )}
        </div>
      ) : (
        <MainButton onClick={finish} disabled={busy}>
          {words.finish}
        </MainButton>
      )}

      {problem && <p className="mt-3 text-center text-[16px] text-red-700">{problem}</p>}

      {missing && !ev.instructor.finished && (
        <div className="mt-5">
          <p className="text-[17px]">{words.notYet}</p>
          <ul className="mt-2 space-y-2">
            {missing.map((m) => (
              <li key={`${m.student}-${m.part}`}>
                <Link href={m.part === "DRILL" ? "/drill" : `${partPaths[m.part]}/${m.student}`} className="flex justify-between bg-panel px-4 py-2 text-[16px]">
                  <span>
                    {words.parts[m.part].name} <span dir="ltr">({m.items.length})</span>
                  </span>
                  <span>{name(m.student)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-12 text-center text-[15px] text-rule">
        {words.signedInAs} <bdi className="font-bold">{ev.instructor.name}</bdi>
        {" · "}
        <button type="button" onClick={ev.signOut} className="underline underline-offset-4">
          {words.signOut}
        </button>
      </p>
    </section>
  );
}
