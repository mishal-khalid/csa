"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Screen, { Heading } from "@/components/Screen";
import StudentGrid from "@/components/StudentGrid";
import { useEvaluation } from "@/lib/evaluation";
import { words } from "@/lib/words";

// The drill is done in pairs (mock, pages 5 and 8): tap two students to start their drill. Students
// whose drill is fully scored are in the seal's blue, and the heading counts the groups.
export default function Drill() {
  return (
    <Screen subtitle={words.parts.DRILL.page} back="/">
      <Pairs />
    </Screen>
  );
}

function Pairs() {
  const ev = useEvaluation();
  const router = useRouter();
  const [picked, setPicked] = useState(null);
  const done = ev.content.students.filter((s) => ev.partDone(s.number, "DRILL")).length;

  function pick(n) {
    if (picked === null) return setPicked(n);
    if (picked === n) return setPicked(null);
    router.push(`/drill/${picked}-${n}`);
  }

  return (
    <>
      <Heading>{done === ev.content.students.length ? words.allGroupsDone : words.group[Math.min(Math.floor(done / 2), 2)]}</Heading>
      <StudentGrid onPick={pick} isPicked={(n) => n === picked} isDone={(n) => ev.partDone(n, "DRILL")} />
    </>
  );
}
