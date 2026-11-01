import { COMMANDS_PER_STUDENT, drill, theory } from './content.js';

// How the evaluation is marked, as the user set it out (2026-11-01):
// - every item is scored from 0: a theory answer up to 3, a drill movement, a command and the
//   inspection up to 5;
// - each part is a percentage of its maximum, and the base is 30% theory, 50% drill, 20% commanding;
// - the inspection is a bonus on top: each point multiplies the base by another 5% (0 is ×1, 5 is
//   ×1.25), and the final is capped at 100%.
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
export const BONUS_PER_INSPECTION_POINT = 0.05;

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
  base: number;
  multiplier: number;
  final: number;
  // every item scored
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
// progress only grows; `complete` says when it's whole.
export function evaluate(scores: ItemScore[]): Result {
  const theoryPart = part('THEORY', scores);
  const drillPart = part('DRILL', scores);
  const commandingPart = part('COMMANDING', scores);
  const inspection = part('INSPECTION', scores);
  const base =
    weights.THEORY * theoryPart.percent + weights.DRILL * drillPart.percent + weights.COMMANDING * commandingPart.percent;
  const multiplier = 1 + BONUS_PER_INSPECTION_POINT * inspection.points;
  const all = [theoryPart, drillPart, commandingPart, inspection];
  return {
    theory: theoryPart,
    drill: drillPart,
    commanding: commandingPart,
    inspection,
    base,
    multiplier,
    final: Math.min(100, base * multiplier),
    complete: all.every((p) => p.scored === p.items),
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

// A student's average across the instructors: each part, the base and the multiplier averaged, and
// the overall as the average of the instructors' finals (which, with the cap, isn't always the
// formula applied to the averaged parts).
export function average(results: Result[]): Result | null {
  if (!results.length) return null;
  return {
    theory: averagePart(results.map((r) => r.theory)),
    drill: averagePart(results.map((r) => r.drill)),
    commanding: averagePart(results.map((r) => r.commanding)),
    inspection: averagePart(results.map((r) => r.inspection)),
    base: mean(results.map((r) => r.base)),
    multiplier: mean(results.map((r) => r.multiplier)),
    final: mean(results.map((r) => r.final)),
    complete: results.every((r) => r.complete),
  };
}
