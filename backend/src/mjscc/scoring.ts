import { COMMANDS_PER_STUDENT, drill, theory } from './content.js';

// How the evaluation is marked, as the user set it out (2026-11-01):
// - every item is scored from 0: a theory answer up to 3, a drill movement, a command and the
//   inspection up to 5;
// - each part is a percentage of its maximum, and the final is 30% theory, 50% drill, 20% commanding;
// - the inspection is scored but doesn't count towards the final: the user took its bonus out on
//   2026-11-01;
// - each student's inspection is done once, by whichever instructor does it (the user, 2026-11-05),
//   so an instructor who didn't inspect a student has no inspection score for them.
// Every instructor's final is worked out from their own scores; a student's overall is the average
// of the instructors' finals.

export type PartName = 'THEORY' | 'DRILL' | 'COMMANDING' | 'INSPECTION';

export const parts: Record<PartName, { items: number; top: number }> = {
  THEORY: { items: theory.length, top: 3 },
  DRILL: { items: drill.length, top: 5 },
  COMMANDING: { items: COMMANDS_PER_STUDENT, top: 5 },
  INSPECTION: { items: 1, top: 5 },
};

export const weights = { THEORY: 0.3, DRILL: 0.5, COMMANDING: 0.2 } as const;

export interface ItemScore {
  part: PartName;
  item: number;
  value: number;
}

export interface PartResult {
  points: number;
  max: number;
  percent: number;
  // how many of the part's items have a score
  scored: number;
  items: number;
}

export interface Result {
  theory: PartResult;
  drill: PartResult;
  commanding: PartResult;
  inspection: PartResult;
  final: number;
  // every item scored (the inspection: by someone)
  complete: boolean;
}

function part(name: PartName, scores: ItemScore[]): PartResult {
  const { items, top } = parts[name];
  const mine = scores.filter((s) => s.part === name);
  const points = mine.reduce((sum, s) => sum + s.value, 0);
  const max = items * top;
  return { points, max, percent: (points / max) * 100, scored: mine.length, items };
}

// One instructor's result for one student. Unscored items count as nothing yet, so a result in
// progress only grows; `complete` says when it's whole (the inspection aside, being someone's).
export function evaluate(scores: ItemScore[]): Result {
  const theoryPart = part('THEORY', scores);
  const drillPart = part('DRILL', scores);
  const commandingPart = part('COMMANDING', scores);
  const inspection = part('INSPECTION', scores);
  const own = [theoryPart, drillPart, commandingPart];
  return {
    theory: theoryPart,
    drill: drillPart,
    commanding: commandingPart,
    inspection,
    final: weights.THEORY * theoryPart.percent + weights.DRILL * drillPart.percent + weights.COMMANDING * commandingPart.percent,
    complete: own.every((p) => p.scored === p.items),
  };
}

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

function averagePart(results: PartResult[]): PartResult {
  return {
    points: mean(results.map((r) => r.points)),
    max: results[0].max,
    percent: mean(results.map((r) => r.percent)),
    scored: Math.min(...results.map((r) => r.scored)),
    items: results[0].items,
  };
}

// A student's average across the instructors: each part averaged, and the overall as the average of
// the instructors' finals. The inspection is averaged over the instructors who gave one (usually the
// one who did it), not counted as 0 for the rest.
export function average(results: Result[]): Result | null {
  if (!results.length) return null;
  const inspected = results.filter((r) => r.inspection.scored > 0);
  return {
    theory: averagePart(results.map((r) => r.theory)),
    drill: averagePart(results.map((r) => r.drill)),
    commanding: averagePart(results.map((r) => r.commanding)),
    inspection: averagePart((inspected.length ? inspected : results).map((r) => r.inspection)),
    final: mean(results.map((r) => r.final)),
    complete: results.every((r) => r.complete) && inspected.length > 0,
  };
}
