import { describe, expect, it } from 'vitest';
import type { BreedingEvent, Cow, FarmReminder, MilkEntry } from '@/types';
import { addDays, farmToday } from '@/lib/dates';
import {
  BASELINE_MIN_DAYS, CALVING_QUIET_DAYS, DROP_PERCENT, DRY_OFF_QUIET_DAYS, RANK_LEVEL_PERCENT, RECENT_DAYS, STALE_DAYS,
  cowDaySeries, cowRanking, logsPerCow, milkDropAlerts,
} from '@/lib/milk-drop';
import { SNOOZE_DAYS, isHidden, snoozeAlert } from '@/lib/alert-dismissals';
import { DROP_COPY } from '@/lib/drop-copy';
import { canUse } from '@/lib/plans';
import { initialBreedingEvents, initialCows, initialMilkEntries, initialReminders } from '@/lib/mock-data';

const FARM = 'farm-test';
const TODAY = '2026-11-16';

const cow = (id: string, over: Partial<Cow> = {}): Cow => ({
  id, farmId: FARM, tag: `T-${id}`, name: id[0].toUpperCase() + id.slice(1), breed: 'Friesian' as Cow['breed'], sex: 'female', status: 'lactating', isPregnant: false, parity: 2, createdAt: '2025-01-01', ...over,
});

/** A cow-level day total for each litres value, the newest being `endDaysAgo` days before TODAY (1 = yesterday). */
function days(cowId: string, litres: number[], endDaysAgo = 1, others: Record<string, number> = {}): MilkEntry[] {
  return litres.map((l, i) => {
    const date = addDays(TODAY, -(endDaysAgo + litres.length - 1 - i));
    const rows = [{ cowId, cowTag: `T-${cowId}`, cowName: cowId, litres: l }, ...Object.entries(others).map(([id, v]) => ({ cowId: id, cowTag: `T-${id}`, cowName: id, litres: v }))];
    return {
      id: `m-${cowId}-${date}`, farmId: FARM, date, session: 'total', mode: 'cow_level', totalLitres: rows.reduce((s, r) => s + r.litres, 0), cowBreakdown: rows, synced: true, createdAt: `${date}T19:00:00Z`,
    } as MilkEntry;
  });
}
/** Several cows in the same day totals (one entry per date, as the farm records it). Each series ends yesterday. */
function together(series: Record<string, number[]>, endDaysAgo = 1): MilkEntry[] {
  const length = Math.max(...Object.values(series).map((v) => v.length));
  return Array.from({ length }, (_, i) => {
    const date = addDays(TODAY, -(endDaysAgo + length - 1 - i));
    const rows = Object.entries(series)
      .filter(([, v]) => v.length - (length - i) >= 0)
      .map(([id, v]) => ({ cowId: id, cowTag: `T-${id}`, cowName: id, litres: v[v.length - (length - i)] }));
    return { id: `m-all-${date}`, farmId: FARM, date, session: 'total', mode: 'cow_level', totalLitres: rows.reduce((s, r) => s + r.litres, 0), cowBreakdown: rows, synced: true, createdAt: `${date}T19:00:00Z` } as MilkEntry;
  });
}
const alerts = (cows: Cow[], milk: MilkEntry[], breeding: BreedingEvent[] = [], reminders: FarmReminder[] = []) => milkDropAlerts({ cows, milk, breeding, reminders, today: TODAY });
const calving = (cowId: string, date: string, outcome: BreedingEvent['calvingOutcome'] = 'heifer_calf'): BreedingEvent => ({ id: `b-${cowId}-${date}`, farmId: FARM, cowId, cowTag: `T-${cowId}`, date, type: 'calving', calvingOutcome: outcome, createdAt: date });
const dryOff = (cowId: string, dueDate: string, completed = false): FarmReminder => ({ id: `r-${cowId}`, farmId: FARM, type: 'dry_off', title: 'Dry off', description: '', dueDate, cowId, cowTag: `T-${cowId}`, severity: 'info', completed, createdAt: '2026-11-01' });

const SEVEN_THEN_DROP = [...Array(7).fill(15), 10, 10, 10]; // baseline 15, last 3 days 10: down a third

describe('milk drop alert: the rule', () => {
  it('raises an alert when the last 3 recorded days are well below the 7 before', () => {
    const [a] = alerts([cow('zawadi')], days('zawadi', SEVEN_THEN_DROP));
    expect(a).toMatchObject({ cowId: 'zawadi', percent: 33, recentAverage: 10, baselineAverage: 15 });
  });

  it('uses the named thresholds: the drop must be at least 25%', () => {
    expect(DROP_PERCENT).toBe(25);
    expect(alerts([cow('a')], days('a', [...Array(7).fill(20), 15, 15, 15]))).toHaveLength(1); // exactly 25%
    expect(alerts([cow('a')], days('a', [...Array(7).fill(20), 15.2, 15.2, 15.2]))).toHaveLength(0); // 24%
  });

  it('needs all 3 recent days and at least 5 baseline days', () => {
    expect(RECENT_DAYS).toBe(3);
    expect(BASELINE_MIN_DAYS).toBe(5);
    expect(alerts([cow('a')], days('a', [...Array(4).fill(15), 10, 10, 10]))).toHaveLength(0); // only 4 baseline days
    expect(alerts([cow('a')], days('a', [...Array(5).fill(15), 10, 10, 10]))).toHaveLength(1); // 5 is enough
    expect(alerts([cow('a')], days('a', [...Array(9).fill(15), 10, 10]))).toHaveLength(0); // only 2 low days: the 3-day average is still high
  });

  it('works from recorded days, so days she was not recorded do not count against her', () => {
    // 5 baseline days and 3 low days, with gaps in the calendar between them
    const entries = days('a', [15, 15, 15, 15, 15, 10, 10, 10]).filter((e) => e.date !== addDays(TODAY, -6)); // one day missing in the baseline
    expect(alerts([cow('a')], entries)).toHaveLength(0); // baseline now only 4 recorded days
    const withExtra = [...entries, ...days('a', [15], 9)];
    expect(alerts([cow('a')], withExtra)).toHaveLength(1);
  });

  it('one alert per cow, and several cows are listed biggest drop first', () => {
    const milk = together({ a: SEVEN_THEN_DROP, b: [...Array(7).fill(20), 8, 8, 8] });
    const found = alerts([cow('a'), cow('b')], milk);
    expect(found.map((x) => x.cowId)).toEqual(['b', 'a']);
    expect(new Set(found.map((x) => x.cowId)).size).toBe(found.length);
  });

  it('does not alert for a cow whose milk is steady, rising, or only slightly down', () => {
    for (const series of [Array(10).fill(15), [...Array(7).fill(12), 16, 16, 16], [...Array(7).fill(15), 13, 13, 13]]) {
      expect(alerts([cow('a')], days('a', series as number[]))).toHaveLength(0);
    }
  });
});

describe('milk drop alert: who is skipped', () => {
  const low = days('a', SEVEN_THEN_DROP);

  it('skips a cow that is not lactating', () => {
    for (const status of ['dry', 'sick', 'calf', 'pregnant_heifer'] as const) expect(alerts([cow('a', { status })], low), status).toHaveLength(0);
  });

  it(`skips a cow within ${CALVING_QUIET_DAYS} days of calving, and not after`, () => {
    expect(alerts([cow('a')], low, [calving('a', addDays(TODAY, -(CALVING_QUIET_DAYS - 1)))])).toHaveLength(0);
    expect(alerts([cow('a')], low, [calving('a', addDays(TODAY, -CALVING_QUIET_DAYS))])).toHaveLength(1);
    expect(alerts([cow('a')], low, [calving('a', addDays(TODAY, -5), 'aborted')])).toHaveLength(1); // an abortion is not a calving
    expect(alerts([cow('a')], low, [calving('other', addDays(TODAY, -5))])).toHaveLength(1); // another cow's calving
  });

  it(`skips a cow with a dry-off reminder due within ${DRY_OFF_QUIET_DAYS} days (or overdue), not a far-off or finished one`, () => {
    expect(alerts([cow('a')], low, [], [dryOff('a', addDays(TODAY, 29))])).toHaveLength(0);
    expect(alerts([cow('a')], low, [], [dryOff('a', addDays(TODAY, DRY_OFF_QUIET_DAYS))])).toHaveLength(0);
    expect(alerts([cow('a')], low, [], [dryOff('a', addDays(TODAY, -3))])).toHaveLength(0);
    expect(alerts([cow('a')], low, [], [dryOff('a', addDays(TODAY, DRY_OFF_QUIET_DAYS + 1))])).toHaveLength(1);
    expect(alerts([cow('a')], low, [], [dryOff('a', addDays(TODAY, 5), true)])).toHaveLength(1);
  });

  it(`skips a cow whose latest recorded day is more than ${STALE_DAYS} days old`, () => {
    expect(alerts([cow('a')], days('a', SEVEN_THEN_DROP, STALE_DAYS + 1))).toHaveLength(0);
    expect(alerts([cow('a')], days('a', SEVEN_THEN_DROP, STALE_DAYS))).toHaveLength(1);
  });
});

describe('milk drop alert: it closes by itself', () => {
  it('stays open while she is still well down, and closes when her 3-day average is back within 10% of where it was', () => {
    const open = days('a', [...SEVEN_THEN_DROP]);
    expect(alerts([cow('a')], open)).toHaveLength(1);
    // two days later: 12 and 12 with the low day still in the window: avg(10,12,12)=11.3, 25% down: still open
    expect(alerts([cow('a')], days('a', [...SEVEN_THEN_DROP, 12, 12]))).toHaveLength(1);
    // partly better: avg(12,12,12) = 12 is 20% down, still open (not yet within 10%)
    expect(alerts([cow('a')], days('a', [...SEVEN_THEN_DROP, 12, 12, 12]))).toHaveLength(1);
    // recovered: avg(14,14,14) = 14, within 10% of 15: closed
    expect(alerts([cow('a')], days('a', [...SEVEN_THEN_DROP, 14, 14, 14]))).toHaveLength(0);
  });

  it('a later, new drop raises a fresh alert', () => {
    const series = [...SEVEN_THEN_DROP, 15, 15, 15, 15, 15, 9, 9, 9];
    const [a] = alerts([cow('a')], days('a', series));
    expect(a).toBeDefined();
    expect(a.recentAverage).toBe(9);
  });
});

describe('milk drop alert: only for farms that log milk per cow', () => {
  const totals = (litres: number[]): MilkEntry[] => litres.map((l, i) => ({
    id: `t-${i}`, farmId: FARM, date: addDays(TODAY, -(litres.length - i)), session: 'total', mode: 'farm_total', totalLitres: l, synced: true, createdAt: `${addDays(TODAY, -(litres.length - i))}T18:00:00Z`,
  } as MilkEntry));

  it('never raises an alert from farm-total records, however far the totals fall', () => {
    const milk = totals(SEVEN_THEN_DROP.map((x) => x * 4));
    expect(logsPerCow(milk)).toBe(false);
    expect(alerts([cow('a'), cow('b')], milk)).toEqual([]);
    expect(cowRanking({ cows: [cow('a')], milk, today: TODAY })).toEqual([]);
  });

  it('ignores a day that is only partly per cow, and today until its milk is complete', () => {
    // morning per cow, evening a farm total: that day says nothing reliable about one cow
    const am = { ...days('a', [10], 1)[0], id: 'am', session: 'AM' } as MilkEntry;
    const pm = { id: 'pm', farmId: FARM, date: am.date, session: 'PM', mode: 'farm_total', totalLitres: 30, synced: true, createdAt: `${am.date}T17:00:00Z` } as MilkEntry;
    expect(cowDaySeries([am, pm]).size).toBe(0);
    const todayAmOnly = { ...days('a', [4], 0)[0], session: 'AM', id: 'today-am' } as MilkEntry;
    expect(alerts([cow('a')], [...days('a', Array(10).fill(15), 1), todayAmOnly])).toEqual([]); // half a day today is not a drop
  });

  it('a voided record is not counted', () => {
    const milk = days('a', SEVEN_THEN_DROP).map((e, i) => (i >= 7 ? { ...e, voidedAt: 'x', voidReason: 'typo' } : e));
    expect(alerts([cow('a')], milk)).toHaveLength(0); // the low days are voided: she is just a cow with 7 steady days
  });
});

describe('the weekly ranking', () => {
  it('lists lactating cows with milk this week, highest first, with up, down or level', () => {
    const milk = together({
      a: [...Array(7).fill(10), ...Array(6).fill(14)], // up 40%
      b: [...Array(7).fill(20), ...Array(6).fill(16)], // down 20%
      c: [...Array(7).fill(12), ...Array(6).fill(12.3)], // level (2.5%)
      d: Array(6).fill(8), // no earlier week: new
    });
    const rows = cowRanking({ cows: [cow('a'), cow('b'), cow('c'), cow('d'), cow('e', { status: 'dry' })], milk, today: TODAY });
    expect(rows.map((r) => [r.cowId, r.average, r.trend])).toEqual([['b', 16, 'down'], ['a', 14, 'up'], ['c', 12.3, 'level'], ['d', 8, 'new']]);
    expect(RANK_LEVEL_PERCENT).toBe(5);
  });

  it('leaves out a dry cow and a cow with no milk recorded this week', () => {
    const milk = [...days('a', Array(5).fill(10), 1), ...days('old', Array(5).fill(10), 20)];
    const rows = cowRanking({ cows: [cow('a', { status: 'dry' }), cow('old')], milk, today: TODAY });
    expect(rows).toEqual([]);
  });
});

describe('dismiss and snooze', () => {
  it('hides a dismissed alert, and a snoozed one until the snooze is over', () => {
    expect(isHidden(undefined, TODAY)).toBe(false);
    expect(isHidden({ mode: 'dismissed' }, TODAY)).toBe(true);
    const snoozed = snoozeAlert('farm-x', 'a', TODAY).a;
    expect(snoozed).toEqual({ mode: 'snoozed', until: addDays(TODAY, SNOOZE_DAYS) });
    expect(isHidden(snoozed, TODAY)).toBe(true);
    expect(isHidden(snoozed, addDays(TODAY, SNOOZE_DAYS - 1))).toBe(true);
    expect(isHidden(snoozed, addDays(TODAY, SNOOZE_DAYS))).toBe(false);
  });
});

describe('plans, wording and the demo farm', () => {
  const live = (plan: string, status = 'active') => ({ plan, status, renewsAt: new Date(Date.now() + 5 * 86_400_000).toISOString() });

  it('is Farmer and up (and a trial), not Starter', () => {
    expect(canUse(live('starter'), 'milkDrop')).toBe(false);
    expect(canUse(live('farmer'), 'milkDrop')).toBe(true);
    expect(canUse(live('farm_pro'), 'milkDrop')).toBe(true);
    expect(canUse(live('starter', 'trial'), 'milkDrop')).toBe(true);
  });

  it('describes what the records show and suggests calling a vet, never a diagnosis or a medicine', () => {
    const text = DROP_COPY.en.alert('Zawadi', 30);
    expect(text).toBe("Zawadi's milk is down about 30% this week. Check her feed and health; call a vet if she looks unwell.");
    expect(text).not.toMatch(/mastitis|fever|antibiotic|disease|treat/i);
    expect(DROP_COPY.sw.alert('Zawadi', 30)).toContain('30');
  });

  it('the demo farm shows one cow with a milk drop and a ranking with each kind of mark', () => {
    const today = farmToday();
    const found = milkDropAlerts({ cows: initialCows, milk: initialMilkEntries, breeding: initialBreedingEvents, reminders: initialReminders, today });
    expect(found.map((x) => x.cowName)).toEqual(['Zawadi']);
    expect(found[0].percent).toBeGreaterThanOrEqual(25);
    const rows = cowRanking({ cows: initialCows, milk: initialMilkEntries, today });
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(new Set(rows.map((r) => r.trend))).toEqual(new Set(['up', 'down', 'level']));
    expect(rows[0].average).toBeGreaterThanOrEqual(rows[rows.length - 1].average);
  });
});
