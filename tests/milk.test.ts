import { describe, expect, it } from 'vitest';
import type { MilkEntry } from '@/types';
import { cowYields, dailyProduction, datesNeedingReview, findMilkOverlaps, productionInRange, productionTrend } from '@/lib/milk';

let seq = 0;
function entry(partial: Partial<MilkEntry> & Pick<MilkEntry, 'date' | 'session' | 'totalLitres'>): MilkEntry {
  seq += 1;
  return {
    id: partial.id ?? `m${seq}`,
    farmId: 'f1',
    mode: 'farm_total',
    synced: false,
    createdAt: partial.createdAt ?? `2026-11-08T0${seq % 10}:00:00Z`,
    ...partial,
  };
}

describe('daily milk production', () => {
  it('adds AM and PM sessions', () => {
    const day = dailyProduction([entry({ date: '2026-11-08', session: 'AM', totalLitres: 30 }), entry({ date: '2026-11-08', session: 'PM', totalLitres: 20 })], '2026-11-08');
    expect(day.litres).toBe(50);
    expect(day.needsReview).toBe(false);
  });

  it('never counts 30 L AM + 20 L PM + a 50 L day total as 100 L', () => {
    const entries = [
      entry({ date: '2026-11-08', session: 'AM', totalLitres: 30, createdAt: '2026-11-08T04:00:00Z' }),
      entry({ date: '2026-11-08', session: 'PM', totalLitres: 20, createdAt: '2026-11-08T15:00:00Z' }),
      entry({ date: '2026-11-08', session: 'total', totalLitres: 50, createdAt: '2026-11-08T16:00:00Z' }),
    ];
    const day = dailyProduction(entries, '2026-11-08');
    expect(day.litres).toBe(50);
    expect(day.dayTotal).toBe(50);
    expect(day.needsReview).toBe(true);
    expect(day.ignored.map((e) => e.totalLitres).sort()).toEqual([20, 30]);
  });

  it('does not double count farm-total and cow-level entries for the same session', () => {
    const entries = [
      entry({ date: '2026-11-08', session: 'AM', totalLitres: 37, createdAt: '2026-11-08T04:00:00Z' }),
      entry({ date: '2026-11-08', session: 'AM', totalLitres: 36.5, mode: 'cow_level', createdAt: '2026-11-08T05:00:00Z' }),
    ];
    const day = dailyProduction(entries, '2026-11-08');
    expect(day.litres).toBe(36.5); // the newest entry counts
    expect(day.needsReview).toBe(true);
  });

  it('ignores voided entries entirely', () => {
    const entries = [
      entry({ date: '2026-11-08', session: 'AM', totalLitres: 30, voidedAt: '2026-11-08T06:00:00Z' }),
      entry({ date: '2026-11-08', session: 'AM', totalLitres: 31 }),
    ];
    expect(dailyProduction(entries, '2026-11-08')).toMatchObject({ litres: 31, needsReview: false });
    expect(datesNeedingReview(entries)).toHaveLength(0);
  });

  it('finds the entries a new record would overlap', () => {
    const am = entry({ date: '2026-11-08', session: 'AM', totalLitres: 30 });
    const pm = entry({ date: '2026-11-08', session: 'PM', totalLitres: 20 });
    const other = entry({ date: '2026-11-07', session: 'AM', totalLitres: 25 });
    expect(findMilkOverlaps([am, pm, other], '2026-11-08', 'total')).toEqual([am, pm]);
    expect(findMilkOverlaps([am, pm, other], '2026-11-08', 'PM')).toEqual([pm]);
    const total = entry({ date: '2026-11-09', session: 'total', totalLitres: 50 });
    expect(findMilkOverlaps([total], '2026-11-09', 'AM')).toEqual([total]);
  });
});

describe('production over time', () => {
  const week = (start: number, litres: number[]) =>
    litres.map((l, i) => entry({ date: `2026-11-${String(start + i).padStart(2, '0')}`, session: 'total', totalLitres: l }));

  it('averages over recorded days and compares with the previous window', () => {
    const entries = [...week(1, [50, 50, 50, 50, 50, 50, 50]), ...week(8, [60, 60, 60, 60, 60, 60, 60])];
    const trend = productionTrend(entries, '2026-11-14', 7);
    expect(trend.average).toBe(60);
    expect(trend.previousAverage).toBe(50);
    expect(trend.changePercent).toBe(20);
  });

  it('reports no average instead of inventing one when nothing is recorded', () => {
    expect(productionTrend([], '2026-11-14', 7)).toMatchObject({ average: null, changePercent: null, recordedDays: 0 });
  });

  it('respects month boundaries', () => {
    const entries = [entry({ date: '2026-10-31', session: 'total', totalLitres: 40 }), entry({ date: '2026-11-01', session: 'total', totalLitres: 45 })];
    expect(productionInRange(entries, { from: '2026-11-01', to: '2026-11-30' }).litres).toBe(45);
  });
});

describe('cow yields', () => {
  it('averages per distinct day, not per milking session', () => {
    const cb = (litres: number) => [{ cowId: 'c1', cowTag: 'GH-01', litres }];
    const entries = [
      entry({ date: '2026-11-07', session: 'AM', totalLitres: 10, mode: 'cow_level', cowBreakdown: cb(10) }),
      entry({ date: '2026-11-07', session: 'PM', totalLitres: 8, mode: 'cow_level', cowBreakdown: cb(8) }),
      entry({ date: '2026-11-08', session: 'AM', totalLitres: 11, mode: 'cow_level', cowBreakdown: cb(11) }),
      entry({ date: '2026-11-08', session: 'PM', totalLitres: 9, mode: 'cow_level', cowBreakdown: cb(9) }),
    ];
    const [cow] = cowYields(entries);
    expect(cow.recordedDays).toBe(2);
    expect(cow.averagePerDay).toBe(19); // (18 + 20) / 2 days, not 38 / 4 sessions
  });

  it('excludes cow breakdowns from entries that do not count', () => {
    const entries = [
      entry({ date: '2026-11-08', session: 'AM', totalLitres: 10, mode: 'cow_level', cowBreakdown: [{ cowId: 'c1', cowTag: 'A', litres: 10 }], createdAt: '2026-11-08T04:00:00Z' }),
      entry({ date: '2026-11-08', session: 'total', totalLitres: 40, createdAt: '2026-11-08T18:00:00Z' }),
    ];
    expect(cowYields(entries)).toHaveLength(0);
  });
});
