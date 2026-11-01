"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import Deck from "@/components/Deck";
import ScoreButtons from "@/components/ScoreButtons";
import Screen, { Panel } from "@/components/Screen";
import { firstOpen, studentNumber, useCards } from "@/lib/cards";
import { useEvaluation } from "@/lib/evaluation";
import { words } from "@/lib/words";

// Commanding for one student: their three commands (drawn once, the same on every instructor's
// phone), one at a time, each 0–5 (mock, page 10). After the third, back to the students.
export default function CommandingStudent() {
  const student = studentNumber(useParams().student);
  if (!student) notFound();
  return (
    <Screen subtitle={words.parts.COMMANDING.page} back="/commanding">
      <Commands student={student} />
    </Screen>
  );
}

function Commands({ student }) {
  const ev = useEvaluation();
  const router = useRouter();
  const { name, commands } = ev.content.students[student - 1];
  const isScored = (i) => ev.scoreOf(student, "COMMANDING", i + 1) !== undefined;
  const cards = useCards({
    total: commands.length,
    first: firstOpen(commands.length, isScored),
    isScored,
    onEnd: () => router.push("/commanding"),
  });
  const item = cards.index + 1;

  return (
    <>
      <Deck index={cards.index} direction={cards.direction} onBack={cards.back} onForward={cards.forward}>
        <Panel>
          <p className="text-center text-[19px] font-bold">{name}</p>
          <p className="mt-2 text-center text-[19px] whitespace-pre-wrap">
            <span dir="ltr">{item}.</span> {commands[cards.index]}
          </p>
          <ScoreButtons
            top={ev.content.parts.COMMANDING.top}
            value={ev.scoreOf(student, "COMMANDING", item)}
            disabled={ev.locked}
            onPick={(value) => {
              ev.setScore(student, "COMMANDING", item, value);
              cards.advance();
            }}
          />
        </Panel>
      </Deck>
      {ev.locked && <p className="mt-4 text-center text-[15px] text-rule">{ev.lockedBecause}</p>}
    </>
  );
}
