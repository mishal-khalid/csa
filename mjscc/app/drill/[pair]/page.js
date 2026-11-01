"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import Deck from "@/components/Deck";
import ScoreButtons from "@/components/ScoreButtons";
import Screen, { MainButton, Panel } from "@/components/Screen";
import { firstOpen, studentNumber, useCards } from "@/lib/cards";
import { useEvaluation } from "@/lib/evaluation";
import { words } from "@/lib/words";

// A pair's drill: one movement at a time, a card for each student with the movement and 0–5 (mock,
// page 6). Once both have a score the next movement comes in; after the last, "ނިންމާލާ" (mock,
// page 7) goes back to the pairs.
export default function DrillPair() {
  const [a, b] = String(useParams().pair).split("-").map(studentNumber);
  if (!a || !b || a === b) notFound();
  return (
    <Screen subtitle={words.parts.DRILL.page} back="/drill">
      <Movements pair={[a, b]} />
    </Screen>
  );
}

function Movements({ pair }) {
  const ev = useEvaluation();
  const router = useRouter();
  const drill = ev.content.drill;
  const both = (i) => pair.every((s) => ev.scoreOf(s, "DRILL", i + 1) !== undefined);
  const cards = useCards({ total: drill.length, first: firstOpen(drill.length, both), isScored: both });
  const item = cards.index + 1;
  const last = item === drill.length;

  function pick(student, value) {
    ev.setScore(student, "DRILL", item, value);
    const other = pair.find((s) => s !== student);
    if (!last && ev.scoreOf(other, "DRILL", item) !== undefined) cards.advance();
  }

  return (
    <>
      <Deck index={cards.index} direction={cards.direction} onBack={cards.back} onForward={cards.forward}>
        <div className="space-y-6">
          {pair.map((student) => (
            <Panel key={student}>
              <p className="text-center text-[19px] font-bold">{ev.content.students[student - 1].name}</p>
              <p className="mt-1 text-center text-[18px] whitespace-pre-wrap">
                <span dir="ltr">{item}.</span> {drill[cards.index]}
              </p>
              <ScoreButtons
                top={ev.content.parts.DRILL.top}
                value={ev.scoreOf(student, "DRILL", item)}
                disabled={ev.locked}
                onPick={(value) => pick(student, value)}
              />
            </Panel>
          ))}
        </div>
      </Deck>
      {last && (
        <MainButton onClick={() => router.push("/drill")} className="mx-auto mt-8 max-w-64">
          {words.done}
        </MainButton>
      )}
      {ev.locked && <p className="mt-4 text-center text-[15px] text-rule">{ev.lockedBecause}</p>}
    </>
  );
}
