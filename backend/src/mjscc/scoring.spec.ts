import { average, evaluate, type ItemScore, type PartName } from './scoring.js';

// every item of a part given the same score
const all = (part: PartName, items: number, value: number): ItemScore[] =>
  Array.from({ length: items }, (_, i) => ({ part, item: i + 1, value }));

// a full set of scores worth the given points in each part (spread over the items, top first)
function marks(theory: number, drill: number, commanding: number, inspection: number): ItemScore[] {
  const spread = (part: PartName, items: number, top: number, points: number) =>
    Array.from({ length: items }, (_, i) => ({ part, item: i + 1, value: Math.max(0, Math.min(top, points - i * top)) }));
  return [
    ...spread('THEORY', 40, 3, theory),
    ...spread('DRILL', 27, 5, drill),
    ...spread('COMMANDING', 3, 5, commanding),
    { part: 'INSPECTION', item: 1, value: inspection },
  ];
}

describe('the MJSCC marking', () => {
  it('has the parts the user set out', () => {
    const r = evaluate([]);
    expect([r.theory.max, r.drill.max, r.commanding.max, r.inspection.max]).toEqual([120, 135, 15, 5]);
    expect(r.complete).toBe(false);
    expect(r.final).toBe(0);
  });

  it('weights the parts 30/50/20 and adds 5% per inspection point', () => {
    // 84/120 = 70%, 108/135 = 80%, 9/15 = 60% → 21 + 40 + 12 = 73; inspection 4 → ×1.2 = 87.6
    const r = evaluate(marks(84, 108, 9, 4));
    expect(r.complete).toBe(true);
    expect(r.theory.percent).toBeCloseTo(70);
    expect(r.drill.percent).toBeCloseTo(80);
    expect(r.commanding.percent).toBeCloseTo(60);
    expect(r.base).toBeCloseTo(73);
    expect(r.multiplier).toBeCloseTo(1.2);
    expect(r.final).toBeCloseTo(87.6);
  });

  it('gives no bonus for an inspection of 0', () => {
    const r = evaluate(marks(84, 108, 9, 0));
    expect(r.multiplier).toBe(1);
    expect(r.final).toBeCloseTo(73);
  });

  it('caps the final at 100%', () => {
    // 85% everywhere, inspection 5 → 85 × 1.25 = 106.25 → 100
    const r = evaluate(marks(102, 114.75, 12.75, 5));
    expect(r.final).toBe(100);
    const perfect = evaluate([...all('THEORY', 40, 3), ...all('DRILL', 27, 5), ...all('COMMANDING', 3, 5), ...all('INSPECTION', 1, 5)]);
    expect(perfect.base).toBe(100);
    expect(perfect.final).toBe(100);
  });

  it('averages the instructors’ finals for the overall', () => {
    const a = evaluate(marks(84, 108, 9, 4)); // 87.6
    const b = evaluate(marks(120, 135, 15, 5)); // 100 (capped from 125)
    const avg = average([a, b])!;
    expect(avg.final).toBeCloseTo(93.8);
    expect(avg.theory.percent).toBeCloseTo(85);
    expect(avg.inspection.points).toBeCloseTo(4.5);
    expect(average([])).toBeNull();
  });
});
