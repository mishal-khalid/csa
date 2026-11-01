"use client";

import { useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import AnswerPicture from "@/components/AnswerPicture";
import Deck from "@/components/Deck";
import ScoreButtons from "@/components/ScoreButtons";
import Screen, { MainButton, Panel } from "@/components/Screen";
import { firstOpen, studentNumber, useCards } from "@/lib/cards";
import { useEvaluation } from "@/lib/evaluation";
import { words } from "@/lib/words";

// Theory for one student: the student's name and "start" (mock, page 3), then the 40 questions one
// at a time, each with its answer and 0–3 (mock, page 4).
export default function TheoryStudent() {
  const student = studentNumber(useParams().student);
  if (!student) notFound();
  return (
    <Screen subtitle={words.parts.THEORY.page} back="/theory">
      <Theory student={student} />
    </Screen>
  );
}

function Theory({ student }) {
  const ev = useEvaluation();
  const [started, setStarted] = useState(false);
  const name = ev.content.students[student - 1].name;

  if (!started) {
    return (
      <div className="mt-12 text-center">
        <p className="text-[24px] font-bold">{name}</p>
        <MainButton onClick={() => setStarted(true)} className="mx-auto mt-9 max-w-64">
          {words.start}
        </MainButton>
      </div>
    );
  }
  return <Questions student={student} name={name} />;
}

function Questions({ student, name }) {
  const ev = useEvaluation();
  const router = useRouter();
  const questions = ev.content.theory;
  const isScored = (i) => ev.scoreOf(student, "THEORY", i + 1) !== undefined;
  const cards = useCards({
    total: questions.length,
    first: firstOpen(questions.length, isScored),
    isScored,
    onEnd: () => router.push("/theory"),
  });
  const q = questions[cards.index];

  return (
    <>
      <p className="mt-6 text-center text-[17px] font-bold">{name}</p>
      <Deck index={cards.index} direction={cards.direction} onBack={cards.back} onForward={cards.forward}>
        <Panel>
          <p className="text-center text-[19px] leading-[1.9] font-bold">
            <span dir="ltr">{q.number}.</span> {q.question}
          </p>
          {q.answer && <p className="mt-4 text-center text-[16px] leading-[1.9] whitespace-pre-line">{q.answer}</p>}
          {q.image && <AnswerPicture question={q.number} />}
          <ScoreButtons
            top={ev.content.parts.THEORY.top}
            value={ev.scoreOf(student, "THEORY", q.number)}
            disabled={ev.locked}
            onPick={(value) => {
              ev.setScore(student, "THEORY", q.number, value);
              cards.advance();
            }}
          />
        </Panel>
      </Deck>
      {ev.locked && <p className="mt-4 text-center text-[15px] text-rule">{ev.lockedBecause}</p>}
    </>
  );
}
