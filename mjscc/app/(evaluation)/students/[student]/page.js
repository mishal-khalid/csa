"use client";

import { useState } from "react";
import { notFound, useParams } from "next/navigation";
import Screen, { MainButton, Panel } from "@/components/Screen";
import { studentNumber } from "@/lib/cards";
import { useEvaluation, useResults } from "@/lib/evaluation";
import { words } from "@/lib/words";

const PARTS = ["THEORY", "DRILL", "COMMANDING", "INSPECTION"];
const KEYS = { THEORY: "theory", DRILL: "drill", COMMANDING: "commanding", INSPECTION: "inspection" };

const one = (n) => (Math.round(n * 10) / 10).toLocaleString("en", { maximumFractionDigits: 1 });
const pct = (n) => `${one(n)}%`;

// A student's marks. Until every instructor has finished, this instructor's own, with how they add
// up; after, every instructor's side by side with the averages and the overall, then each part's
// items, and the inspection notes.
export default function StudentPage() {
  const student = studentNumber(useParams().student);
  if (!student) notFound();
  return (
    <Screen subtitle={<StudentName student={student} />} back="/">
      <Marks student={student} />
    </Screen>
  );
}

function StudentName({ student }) {
  const { content } = useEvaluation();
  return <span className="font-bold">{content?.students[student - 1].name}</span>;
}

function Marks({ student }) {
  const [results] = useResults();
  if (!results) return <div aria-hidden className="mt-8 h-64 animate-pulse bg-panel" />;
  const s = results.students[student - 1];
  return results.open ? <Everyone s={s} transcripts={results.transcripts} /> : <Mine s={s} instructors={results.instructors} />;
}

// The inspection: its points (it doesn't count towards the final), or a dash from an instructor who
// didn't inspect this student (each student is inspected once, by whoever does it).
const inspection = (p) => (p.scored ? one(p.points) : "–");

// one part's line: points out of the maximum, and the percentage (the inspection, just its points)
function partValue(part, r) {
  const p = r[KEYS[part]];
  return part === "INSPECTION" ? `${inspection(p)} / ${p.max}` : `${one(p.points)} / ${p.max} · ${pct(p.percent)}`;
}

function Mine({ s, instructors }) {
  const rows = PARTS.map((part) => [words.parts[part].name, partValue(part, s.mine)]);
  return (
    <>
      <Panel className="mt-8">
        <h2 className="text-center text-[19px] font-bold">{words.yourMarks}</h2>
        <dl className="mt-4 space-y-2 text-[17px]">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt>{label}</dt>
              <dd dir="ltr">{value}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t-2 border-edge pt-2 text-[19px] font-bold">
            <dt>{words.final}</dt>
            <dd dir="ltr">{pct(s.mine.final)}</dd>
          </div>
        </dl>
      </Panel>
      <p className="mt-6 text-center text-[16px]">{words.everyoneLater}</p>
      <ul className="mt-3 space-y-1 text-center text-[16px]">
        {instructors.map((i) => (
          <li key={i.name}>
            <bdi>{i.name}</bdi> <span className={i.finished ? "text-seal" : "text-rule"}>{i.finished ? "✓" : "…"}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Everyone({ s, transcripts }) {
  const columns = [...s.instructors.map((i) => ({ name: i.name, r: i.result })), { name: words.average, r: s.average, average: true }];
  const cell = (part, r) =>
    part === "INSPECTION" ? inspection(r.inspection) : part === "FINAL" ? pct(r.final) : pct(r[KEYS[part]].percent);

  return (
    <>
      <div className="mt-8 text-center">
        <p className="text-[17px]">{words.overall}</p>
        <p dir="ltr" className="text-[48px] leading-tight font-bold text-seal">
          {pct(s.average.final)}
        </p>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-[15px]">
          <thead>
            <tr>
              <th />
              {columns.map((c) => (
                <th key={c.name} className={`px-1 pb-2 font-bold ${c.average ? "text-seal" : ""}`}>
                  <bdi>{c.name}</bdi>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...PARTS, "FINAL"].map((part) => (
              <tr key={part} className={`border-t border-edge ${part === "FINAL" ? "font-bold" : ""}`}>
                <th className="py-2 text-start font-normal">{words.parts[part]?.name ?? words.final}</th>
                {columns.map((c) => (
                  <td key={c.name} dir="ltr" className={`px-1 text-center ${c.average ? "bg-seal/8 text-seal" : ""}`}>
                    {cell(part, c.r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {transcripts && <Transcript student={s.number} />}

      <Items s={s} />

      {s.instructors.some((i) => i.note) && (
        <Panel className="mt-6">
          <h3 className="text-[18px] font-bold">{words.notes}</h3>
          <ul className="mt-2 space-y-2 text-[16px]">
            {s.instructors
              .filter((i) => i.note)
              .map((i) => (
                <li key={i.name}>
                  <bdi className="font-bold">{i.name}:</bdi> <span dir="auto">{i.note}</span>
                </li>
              ))}
          </ul>
        </Panel>
      )}
    </>
  );
}

// each part's items with every instructor's score, folded away until tapped
function Items({ s }) {
  const { content } = useEvaluation();
  const labels = {
    THEORY: content.theory.map((q) => q.question),
    DRILL: content.drill,
    COMMANDING: content.students[s.number - 1].commands,
    INSPECTION: [words.parts.INSPECTION.name],
  };
  return (
    <div className="mt-6 space-y-3">
      {PARTS.map((part) => (
        <details key={part} className="border-2 border-edge bg-panel/90">
          <summary className="cursor-pointer px-4 py-3 text-[18px]">{words.parts[part].name}</summary>
          <table className="w-full border-collapse text-[14px]">
            <tbody>
              {labels[part].map((label, i) => (
                <tr key={i} className="border-t border-edge">
                  <th className="max-w-0 truncate px-3 py-1.5 text-start font-normal">
                    <span dir="ltr">{i + 1}.</span> {label}
                  </th>
                  {s.instructors.map((ins) => (
                    <td key={ins.name} dir="ltr" className="w-10 text-center">
                      {ins.items[part][i] ?? "–"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ))}
    </div>
  );
}

// The Platoon In-Charge's button for the student's transcript (a PDF, made on the phone; the drawing
// code loads only when it's pressed).
function Transcript({ student }) {
  const [state, setState] = useState("ready");
  const make = async () => {
    setState("making");
    try {
      const { downloadTranscript } = await import("@/lib/transcript");
      await downloadTranscript(student);
      setState("ready");
    } catch (error) {
      console.error(error);
      setState("failed");
    }
  };
  return (
    <div className="mt-6">
      <MainButton onClick={make} disabled={state === "making"}>
        {state === "making" ? words.transcript.making : words.transcript.download}
      </MainButton>
      {state === "failed" && (
        <p role="alert" className="mt-2 text-center text-[16px]">
          {words.transcript.failed}
        </p>
      )}
    </div>
  );
}
