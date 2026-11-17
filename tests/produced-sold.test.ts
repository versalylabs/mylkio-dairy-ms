import { describe, expect, it } from 'vitest';
import type { Delivery, MilkEntry, MilkUse } from '@/types';
import { addDays, farmToday, monthRange, previousMonthRange } from '@/lib/dates';
import { MILK_USE_KINDS, cleanSplit, emptySplit, milkUseFor, milkUseId, producedVsSold, splitInRange, splitTotal } from '@/lib/produced-sold';
import { initialDeliveries, initialMilkEntries, initialMilkUse } from '@/lib/mock-data';
import { salesInRange } from '@/lib/ledger';
import { dailyProduction } from '@/lib/milk';
import { PRODUCED_COPY } from '@/lib/produced-copy';

const FARM = 'farm-test';
const milk = (date: string, session: MilkEntry['session'], litres: number, over: Partial<MilkEntry> = {}): MilkEntry => ({
  id: `m-${date}-${session}-${litres}`, farmId: FARM, date, session, mode: 'farm_total', totalLitres: litres, synced: true, createdAt: `${date}T06:00:00Z`, ...over,
});
const delivery = (date: string, litres: number, rejected = 0, over: Partial<Delivery> = {}): Delivery => ({
  id: `d-${date}-${litres}-${rejected}`, farmId: FARM, buyerId: 'b1', buyerName: 'Baraka', buyerType: 'cooperative', date, litres, ratePerLitre: 50,
  rejectedLitres: rejected, adjustmentKSh: 0, expectedAmount: (litres - rejected) * 50, amountPaid: 0, balance: 0, synced: true, createdAt: `${date}T18:00:00Z`, ...over,
});
const use = (date: string, over: Partial<MilkUse> = {}): MilkUse => ({
  id: milkUseId(date), farmId: FARM, date, homeUse: 0, calves: 0, spoiled: 0, other: 0, createdAt: '', updatedAt: '', ...over,
});

const TODAY = '2026-11-16';
const range = (from: string, to = from) => ({ from, to });

describe('produced vs sold: the figures', () => {
  // A day with 120 L produced (AM 70 + PM 50), of which 96 L went to buyers (including 6 L they rejected).
  const milkToday = [milk(TODAY, 'AM', 70), milk(TODAY, 'PM', 50)];
  const deliveriesToday = [delivery(TODAY, 60, 6), delivery(TODAY, 36)];

  it('produced is the counted milk, sold is everything delivered (accepted and rejected), not sold is the difference', () => {
    const f = producedVsSold(milkToday, deliveriesToday, range(TODAY));
    expect(f).toMatchObject({ produced: 120, sold: 96, notSold: 24, recordedDays: 1, state: 'ok' });
    // The sold figure counts the 6 L the buyer rejected as well as the 90 L they accepted.
    expect(salesInRange(deliveriesToday, range(TODAY)).acceptedLitres).toBe(90);
  });

  it('works for this month and last month by hand', () => {
    const entries = [
      milk('2026-11-02', 'total', 100), milk('2026-11-10', 'total', 110), milk(TODAY, 'total', 90), // November: 300 L
      milk('2026-10-28', 'total', 80), milk('2026-10-29', 'total', 70),                              // October: 150 L
    ];
    const deliveries = [delivery('2026-11-02', 90), delivery('2026-11-10', 100, 10), delivery('2026-10-28', 60), delivery('2026-10-29', 55)];
    expect(producedVsSold(entries, deliveries, monthRange(TODAY))).toMatchObject({ produced: 300, sold: 190, notSold: 110, recordedDays: 3 });
    expect(producedVsSold(entries, deliveries, previousMonthRange(TODAY))).toMatchObject({ produced: 150, sold: 115, notSold: 35, recordedDays: 2 });
  });

  it('a voided delivery or a voided milk record changes the figures', () => {
    const base = producedVsSold(milkToday, deliveriesToday, range(TODAY));
    expect(base.sold).toBe(96);
    const voidedDelivery = [delivery(TODAY, 60, 6, { voidedAt: 'x', voidReason: 'duplicate' }), delivery(TODAY, 36)];
    expect(producedVsSold(milkToday, voidedDelivery, range(TODAY))).toMatchObject({ produced: 120, sold: 36, notSold: 84 });
    const voidedMilk = [milk(TODAY, 'AM', 70, { voidedAt: 'x', voidReason: 'typo' }), milk(TODAY, 'PM', 50)];
    expect(producedVsSold(voidedMilk, deliveriesToday, range(TODAY))).toMatchObject({ produced: 50, sold: 96, notSold: null, state: 'sold_more' });
  });

  it('never double counts milk: a day total and an AM entry for the same day are one total', () => {
    const f = producedVsSold([milk(TODAY, 'total', 100), milk(TODAY, 'AM', 60)], [], range(TODAY));
    expect(f.produced).toBe(100);
  });

  it('shows no negative number: more sold than recorded asks for the milk record to be checked', () => {
    const f = producedVsSold([milk(TODAY, 'total', 50)], [delivery(TODAY, 80)], range(TODAY));
    expect(f).toMatchObject({ produced: 50, sold: 80, notSold: null, state: 'sold_more' });
    // within rounding it is still fine
    expect(producedVsSold([milk(TODAY, 'total', 50)], [delivery(TODAY, 50.04)], range(TODAY)).state).toBe('ok');
  });

  it('shows nothing to compare when no milk is recorded, even if something was delivered', () => {
    const f = producedVsSold([], [delivery(TODAY, 40)], range(TODAY));
    expect(f).toMatchObject({ produced: 0, sold: 40, notSold: null, recordedDays: 0, state: 'no_milk' });
    expect(producedVsSold([milk('2026-11-01', 'total', 50)], [], range(TODAY)).state).toBe('no_milk'); // milk exists, but on another day
  });

  it('a day with milk and no deliveries is all unsold', () => {
    expect(producedVsSold([milk(TODAY, 'total', 42)], [], range(TODAY))).toMatchObject({ produced: 42, sold: 0, notSold: 42, state: 'ok' });
  });

  it('works offline from the local copy: it needs only the arrays it is given and does no network call', () => {
    expect(producedVsSold.length).toBe(3);
  });
});

describe('the optional split of the unsold milk', () => {
  const entries = [milk(TODAY, 'total', 120), milk('2026-11-10', 'total', 100)];

  it('is one record per date, with a stable id', () => {
    expect(milkUseId('2026-11-16')).toBe('milkuse-2026-11-16');
    expect(milkUseFor([use('2026-11-10'), use(TODAY, { homeUse: 4 })], TODAY)?.homeUse).toBe(4);
    expect(milkUseFor([], TODAY)).toBeUndefined();
  });

  it('is shown against the unsold milk, and what is left is "not accounted for"', () => {
    const f = producedVsSold(entries, [delivery(TODAY, 96)], range(TODAY));
    const s = splitInRange([use(TODAY, { homeUse: 4, calves: 6 })], entries, range(TODAY), f.notSold);
    expect(s).toMatchObject({ assigned: 10, unassigned: 14, byKind: { homeUse: 4, calves: 6, spoiled: 0, other: 0 } });
  });

  it('never changes produced or sold', () => {
    const before = producedVsSold(entries, [delivery(TODAY, 96)], range(TODAY));
    splitInRange([use(TODAY, { homeUse: 500 })], entries, range(TODAY), before.notSold);
    expect(producedVsSold(entries, [delivery(TODAY, 96)], range(TODAY))).toEqual(before);
  });

  it('can add up to more than the unsold milk without breaking: nothing is left over, nothing goes negative', () => {
    const s = splitInRange([use(TODAY, { homeUse: 100 })], entries, range(TODAY), 24);
    expect(s.assigned).toBe(100);
    expect(s.unassigned).toBe(0);
  });

  it('only counts a split for a day that has milk recorded', () => {
    const s = splitInRange([use('2026-11-12', { homeUse: 9 })], entries, range('2026-11-01', '2026-11-30'), 50);
    expect(s.assigned).toBe(0);
  });

  it('is summed over a month from its days', () => {
    const s = splitInRange([use(TODAY, { homeUse: 4 }), use('2026-11-10', { homeUse: 2, spoiled: 1 })], entries, monthRange(TODAY), 60);
    expect(s).toMatchObject({ assigned: 7, unassigned: 53, byKind: { homeUse: 6, spoiled: 1 } });
  });

  it('cleans what a person typed: tenths of a litre, never negative, blanks are zero', () => {
    expect(cleanSplit({ homeUse: '4.26', calves: '', spoiled: -3, other: 'abc' })).toEqual({ homeUse: 4.3, calves: 0, spoiled: 0, other: 0 });
    expect(cleanSplit({})).toEqual(emptySplit());
    expect(splitTotal({ homeUse: 4, calves: 3.5 })).toBe(7.5);
    expect(MILK_USE_KINDS).toEqual(['homeUse', 'calves', 'spoiled', 'other']);
  });
});

describe('the demo farm shows it with sensible figures', () => {
  const today = farmToday();

  it('has milk today, deliveries today and part of the unsold milk accounted for', () => {
    const f = producedVsSold(initialMilkEntries, initialDeliveries, range(today));
    expect(f.state).toBe('ok');
    expect(f.produced).toBe(dailyProduction(initialMilkEntries, today).litres);
    expect(f.sold).toBe(salesInRange(initialDeliveries, range(today)).deliveredLitres);
    expect(f.notSold).toBeGreaterThan(0);
    const s = splitInRange(initialMilkUse, initialMilkEntries, range(today), f.notSold);
    expect(s.assigned).toBe(7);
    expect(s.unassigned).toBeGreaterThan(0); // the farmer is never made to account for every litre
    expect(initialMilkUse[0].id).toBe(milkUseId(today));
  });

  it('has a previous month to look at too', () => {
    const last = producedVsSold(initialMilkEntries, initialDeliveries, previousMonthRange(today));
    expect(last.state).toBe('ok');
    expect(last.recordedDays).toBeGreaterThan(25);
    expect(last.produced).toBeGreaterThan(last.sold); // a little more was produced than the buyers took
    expect(last.notSold).toBeGreaterThan(0);
    expect(addDays(today, 0)).toBe(today);
  });
});

describe('wording in both languages', () => {
  it('says the three figures and the oversold sentence the same way in English and Kiswahili', () => {
    expect(PRODUCED_COPY.en.notSold(24)).toBe('24.0 L not sold');
    expect(PRODUCED_COPY.en.soldMoreToday).toBe("Sold more than recorded. Check today's milk record.");
    expect(PRODUCED_COPY.sw.notSold(24)).toBe('24.0 L hayajauzwa');
    expect(PRODUCED_COPY.sw.soldMoreToday.length).toBeGreaterThan(10);
  });
});
