"use client";

import Screen, { Heading } from "@/components/Screen";
import StudentGrid from "@/components/StudentGrid";
import { useEvaluation } from "@/lib/evaluation";
import { words } from "@/lib/words";

// A part's page (mock, page 2): the students, each opening their evaluation in this part. Those
// this instructor has finished scoring are in the seal's blue.
export default function PartStudents({ part, path }) {
  return (
    <Screen subtitle={words.parts[part].page} back="/">
      <Heading>{words.students}</Heading>
      <Grid part={part} path={path} />
    </Screen>
  );
}

function Grid({ part, path }) {
  const ev = useEvaluation();
  return <StudentGrid hrefOf={(n) => `${path}/${n}`} isDone={(n) => ev.partDone(n, part)} />;
}
