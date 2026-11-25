import { describe, expect, it } from 'vitest';
import type { Delivery, ExpenseRecord, MilkEntry } from '@/types';
import { feedCost, feedTypeOf } from '@/lib/feed-cost';
import { MIN_MILK_DAYS } from '@/lib/cost-per-litre';

const FARM = 'farm-test';
const MONTH = { from: '2026-10-01', to: '2026-10-31' };
const day = (n: number) => `2026-10-${String(n).padStart(2, '0')}`;

const milk = (date: string, litres: number): MilkEntry => ({
  id: `m-${date}`, farmId: FARM, date, session: 'total', mode: 'farm_total', totalLitres: litres, synced: true, createdAt: `${date}T18:00:00Z`,
});
const delivery = (date: string, litres: number, rate = 50): Delivery => ({
  id: `d-${date}`, farmId: FARM, buyerId: 'b1', buyerName: 'Baraka', buyerType: 'cooperative', date, litres, ratePerLitre: rate,
  rejectedLitres: 0, adjustmentKSh: 0, expectedAmount: litres * rate, amountPaid: 0, balance: 0, synced: true, createdAt: `${date}T07:00:00Z`,
});
let n = 0;
const expense = (date: string, amount: number, over: Partial<ExpenseRecord> = {}): ExpenseRecord => ({
  id: `e${++n}`, farmId: FARM, date, category: 'feed', description: 'Feed', amount, paymentMethod: 'cash', createdAt: `${date}T10:00:00Z`, ...over,
});

/** 20 days of 100 L = 2,000 L produced, 1,800 L sold at KSh 50. */
const milkMonth = Array.from({ length: 20 }, (_, i) => milk(day(i + 1), 100));
const sold = Array.from({ length: 18 }, (_, i) => delivery(day(i + 1), 100));

describe('feed types', () => {
  it('uses the type picked, else reads it from the description', () => {
    expect(feedTypeOf({ feedType: 'hay', description: 'Dairy meal' })).toBe('hay');
    expect(feedTypeOf({ description: '2 bags dairy meal' })).toBe('dairy_meal');
    expect(feedTypeOf({ description: 'Rhodes grass bales' })).toBe('hay');
    expect(feedTypeOf({ description: 'Maize silage' })).toBe('silage');
    expect(feedTypeOf({ description: 'Napier from neighbour' })).toBe('fodder');
    expect(feedTypeOf({ description: 'Mineral lick' })).toBe('minerals');
    expect(feedTypeOf({ description: 'Feed' })).toBe('other');
  });
});

describe('feed cost per litre', () => {
  it('works out a month by hand', () => {
    const expenses = [
      expense(day(2), 35000, { feedType: 'dairy_meal', quantity: 10, unit: 'bag' }),
      expense(day(9), 15000, { description: 'Rhodes hay', quantity: 100, unit: 'bale' }),
      expense(day(10), 9000, { category: 'veterinary', description: 'Vet' }), // not feed
    ];
    const f = feedCost(milkMonth, sold, expenses, MONTH);
    // Feed 50,000 / 2,000 L = 25 a litre; price 50; margin 25 a litre; 50 × 2,000 − 50,000 = 50,000.
    expect(f).toMatchObject({ state: 'ready', feedSpend: 50000, feedPerLitre: 25, pricePerLitre: 50, marginPerLitre: 25, marginOverFeed: 50000 });
    expect(f.lines).toEqual([
      { type: 'dairy_meal', amount: 35000, share: 70, unitPrice: { unit: 'bag', price: 3500, quantity: 10 } },
      { type: 'hay', amount: 15000, share: 30, unitPrice: { unit: 'bale', price: 150, quantity: 100 } },
    ]);
  });

  it('gives no unit price when units are mixed or missing', () => {
    const expenses = [
      expense(day(2), 7000, { feedType: 'dairy_meal', quantity: 2, unit: 'bag' }),
      expense(day(3), 500, { feedType: 'dairy_meal', quantity: 10, unit: 'kg' }),
      expense(day(4), 300, { feedType: 'hay' }),
    ];
    const f = feedCost(milkMonth, sold, expenses, MONTH);
    expect(f.lines.map((l) => l.unitPrice)).toEqual([null, null]);
  });

  it('says when feed costs more than the milk earns', () => {
    const f = feedCost(milkMonth, sold, [expense(day(2), 120000)], MONTH);
    expect(f).toMatchObject({ feedPerLitre: 60, marginPerLitre: -10, marginOverFeed: -20000 });
  });

  it('waits for enough milk days and a feed expense, and ignores voided ones', () => {
    const short = milkMonth.slice(0, MIN_MILK_DAYS - 1);
    expect(feedCost(short, sold, [expense(day(2), 1000)], MONTH).state).toBe('not_enough');
    expect(feedCost(milkMonth, sold, [], MONTH).state).toBe('not_enough');
    const voided = { ...expense(day(2), 1000), voidedAt: '2026-10-03T00:00:00Z' } as ExpenseRecord;
    expect(feedCost(milkMonth, sold, [voided], MONTH).state).toBe('not_enough');
    expect(feedCost(milkMonth, sold, [expense('2026-09-30', 1000)], MONTH).state).toBe('not_enough');
  });

  it('has no price or margin when nothing was sold', () => {
    const f = feedCost(milkMonth, [], [expense(day(2), 10000)], MONTH);
    expect(f).toMatchObject({ state: 'ready', feedPerLitre: 5, pricePerLitre: null, marginPerLitre: null, marginOverFeed: null });
  });
});
