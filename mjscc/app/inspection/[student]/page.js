"use client";

import { useEffect, useRef, useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import ScoreButtons from "@/components/ScoreButtons";
import Screen, { MainButton, Panel } from "@/components/Screen";
import { studentNumber } from "@/lib/cards";
import { useEvaluation } from "@/lib/evaluation";
import { words } from "@/lib/words";

// Inspection for one student: 0–5, and the issue if there was one (mock, page 12). The note saves
// as it's typed. "ނިންމާލާ" goes back to the students.
export default function InspectionStudent() {
  const student = studentNumber(useParams().student);
  if (!student) notFound();
  return (
    <Screen subtitle={words.parts.INSPECTION.page} back="/inspection">
      <Inspection student={student} />
    </Screen>
  );
}

function Inspection({ student }) {
  const ev = useEvaluation();
  const router = useRouter();
  const [note, setNote] = useState(() => ev.noteOf(student));
  const timer = useRef(null);
  const latest = useRef(note);
  const { setNote: saveNote, noteOf } = ev;

  // a moment after typing stops, and on leaving the page
  function type(text) {
    setNote(text);
    latest.current = text;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => saveNote(student, text), 600);
  }
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (latest.current !== noteOf(student)) saveNote(student, latest.current);
    },
    // only on leaving
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="mt-7 space-y-6">
      <Panel>
        <p className="text-center text-[19px] font-bold">{ev.content.students[student - 1].name}</p>
        <ScoreButtons
          top={ev.content.parts.INSPECTION.top}
          value={ev.scoreOf(student, "INSPECTION", 1)}
          disabled={ev.locked}
          onPick={(value) => ev.setScore(student, "INSPECTION", 1, value)}
        />
      </Panel>
      <Panel>
        <label className="block">
          <span className="block text-center text-[18px]">{words.issue}</span>
          <textarea
            dir="auto"
            value={note}
            onChange={(e) => type(e.target.value)}
            disabled={ev.locked}
            maxLength={1000}
            rows={3}
            className="mt-3 block w-full border-2 border-edge bg-panel px-3 py-2 text-[17px] outline-none focus:border-seal"
          />
        </label>
      </Panel>
      <MainButton onClick={() => router.push("/inspection")} className="mx-auto max-w-64">
        {words.done}
      </MainButton>
      {ev.locked && <p className="text-center text-[15px] text-rule">{ev.lockedBecause}</p>}
    </div>
  );
}
