import { describe, expect, it } from 'vitest';
import type { Delivery, ExpenseRecord, MilkEntry } from '@/types';
import { MIN_MILK_DAYS, costPerLitre } from '@/lib/cost-per-litre';
import { COST_COPY } from '@/lib/cost-copy';
import { PLANS, canUse } from '@/lib/plans';
import { farmToday, monthRange, previousMonthRange } from '@/lib/dates';
import { initialDeliveries, initialExpenses, initialMilkEntries } from '@/lib/mock-data';
import { roleOrOwner, tabsFor } from '@/lib/team';

const FARM = 'farm-test';
const MONTH = { from: '2026-10-01', to: '2026-10-31' };
const day = (n: number) => `2026-10-${String(n).padStart(2, '0')}`;

const milk = (date: string, litres: number, over: Partial<MilkEntry> = {}): MilkEntry => ({
  id: `m-${date}-${litres}`, farmId: FARM, date, session: 'total', mode: 'farm_total', totalLitres: litres, synced: true, createdAt: `${date}T18:00:00Z`, ...over,
});
const delivery = (date: string, litres: number, rate = 50, rejected = 0, over: Partial<Delivery> = {}): Delivery => ({
  id: `d-${date}-${litres}-${rejected}`, farmId: FARM, buyerId: 'b1', buyerName: 'Baraka', buyerType: 'cooperative', date, litres, ratePerLitre: rate,
  rejectedLitres: rejected, adjustmentKSh: 0, expectedAmount: (litres - rejected) * rate, amountPaid: 0, balance: 0, synced: true, createdAt: `${date}T07:00:00Z`, ...over,
});
const expense = (date: string, amount: number, category: ExpenseRecord['category'] = 'feed'): ExpenseRecord => ({
  id: `e-${date}-${amount}-${category}`, farmId: FARM, date, category, description: 'x', amount, paymentMethod: 'cash', createdAt: `${date}T10:00:00Z`,
});

/** 20 days of 100 L = 2,000 L produced. */
const fullMonth = Array.from({ length: 20 }, (_, i) => milk(day(i + 1), 100));

describe('cost per litre', () => {
  it('works out a normal month by hand', () => {
    // 2,000 L produced; expenses 76,000 (61% feed would be 46,360, so use round figures): feed 60,000, vet 10,000, labour 6,000.
    const expenses = [expense(day(3), 60_000, 'feed'), expense(day(9), 10_000, 'veterinary'), expense(day(20), 6_000, 'labor')];
    // Billed: 1,500 L delivered at KSh 52, 20 L of it rejected: 1,480 accepted x 52 = 76,960; price = 52.
    const deliveries = [delivery(day(5), 800, 52, 20), delivery(day(15), 700, 52)];
    const f = costPerLitre(fullMonth, deliveries, expenses, MONTH);
    expect(f.state).toBe('ready');
    expect(f.recordedDays).toBe(20);
    expect(f.producedLitres).toBe(2000);
    expect(f.totalExpenses).toBe(76_000);
    expect(f.costPerLitre).toBe(38); // 76,000 / 2,000
    expect(f.pricePerLitre).toBe(52); // 76,960 billed / 1,480 accepted
    expect(f.feedSharePercent).toBe(79); // 60,000 / 76,000
    expect(f.costHigherThanPrice).toBe(false);
  });

  it('uses what was billed for accepted litres, not what was received in cash, and ignores rejected litres', () => {
    const paid = [delivery(day(5), 1000, 50, 100, { amountPaid: 45_000 })]; // 900 accepted x 50 = 45,000 billed
    const unpaid = [delivery(day(5), 1000, 50, 100, { amountPaid: 0 })];
    const a = costPerLitre(fullMonth, paid, [expense(day(2), 1000)], MONTH);
    const b = costPerLitre(fullMonth, unpaid, [expense(day(2), 1000)], MONTH);
    expect(a.pricePerLitre).toBe(50);
    expect(b.pricePerLitre).toBe(50);
  });

  it('shows no figure for a month with no expenses', () => {
    const f = costPerLitre(fullMonth, [delivery(day(5), 800)], [], MONTH);
    expect(f).toMatchObject({ state: 'not_enough', costPerLitre: null, pricePerLitre: null, feedSharePercent: null, expenseCount: 0 });
  });

  it(`shows no figure for a month with fewer than ${MIN_MILK_DAYS} days of milk`, () => {
    const thirteen = Array.from({ length: MIN_MILK_DAYS - 1 }, (_, i) => milk(day(i + 1), 100));
    expect(costPerLitre(thirteen, [], [expense(day(2), 5000)], MONTH).state).toBe('not_enough');
    const fourteen = Array.from({ length: MIN_MILK_DAYS }, (_, i) => milk(day(i + 1), 100));
    expect(costPerLitre(fourteen, [], [expense(day(2), 5000)], MONTH).state).toBe('ready');
  });

  it('counts a day only once however many records it has, and not at all when its milk was voided', () => {
    const doubled = [...fullMonth, milk(day(1), 100, { id: 'dup', createdAt: `${day(1)}T19:00:00Z` })]; // a second day total for day 1: still one counted day
    expect(costPerLitre(doubled, [], [expense(day(2), 5000)], MONTH).recordedDays).toBe(20);
    expect(costPerLitre(doubled, [], [expense(day(2), 5000)], MONTH).producedLitres).toBe(2000);
    const voided = fullMonth.map((m, i) => (i < 7 ? { ...m, voidedAt: 'x', voidReason: 'typo' } : m)); // 13 days left
    expect(costPerLitre(voided, [], [expense(day(2), 5000)], MONTH)).toMatchObject({ state: 'not_enough', recordedDays: 13 });
  });

  it('a voided delivery changes the price, and expenses outside the month do not count', () => {
    const deliveries = [delivery(day(5), 1000, 50), delivery(day(6), 1000, 70, 0, { voidedAt: 'x', voidReason: 'duplicate' })];
    const f = costPerLitre(fullMonth, deliveries, [expense(day(2), 4000), expense('2026-09-30', 99_999), expense('2026-11-01', 99_999)], MONTH);
    expect(f.pricePerLitre).toBe(50);
    expect(f.totalExpenses).toBe(4000);
    expect(f.costPerLitre).toBe(2);
  });

  it('says plainly when it cost more than the price, without alarm', () => {
    const f = costPerLitre(fullMonth, [delivery(day(5), 1000, 40)], [expense(day(2), 100_000)], MONTH); // 50 a litre to produce, billed 40
    expect(f).toMatchObject({ costPerLitre: 50, pricePerLitre: 40, costHigherThanPrice: true, costAbovePrice: 10 });
    expect(COST_COPY.en.higher(10)).toBe('Your costs were about KSh 10 per litre more than the price you were billed.');
    expect(COST_COPY.en.higher(10)).not.toMatch(/loss|danger|warning|!/i);
  });

  it('leaves out the price when nothing was billed, and the feed share when there is no feed', () => {
    const f = costPerLitre(fullMonth, [], [expense(day(2), 8000, 'veterinary')], MONTH);
    expect(f.pricePerLitre).toBeNull();
    expect(f.costHigherThanPrice).toBe(false);
    expect(f.feedSharePercent).toBe(0);
  });

  it('runs on the phone from the arrays it is given and calls nothing', () => {
    expect(costPerLitre.length).toBe(4);
  });
});

describe('who gets it', () => {
  const live = (plan: string, status = 'active') => ({ plan, status, renewsAt: new Date(Date.now() + 5 * 86_400_000).toISOString() });
  it('is on Farmer and up, not Starter, and pauses with the other extras', () => {
    expect(canUse(live('starter'), 'costPerLitre')).toBe(false);
    expect(canUse(live('farmer'), 'costPerLitre')).toBe(true);
    expect(canUse(live('farm_pro'), 'costPerLitre')).toBe(true);
    expect(canUse(live('custom'), 'costPerLitre')).toBe(true);
    expect(canUse(live('starter', 'trial'), 'costPerLitre')).toBe(true); // a trial gets the Farmer set
    expect(canUse({ plan: 'farm_pro', status: 'active', renewsAt: new Date(Date.now() - 30 * 86_400_000).toISOString() }, 'costPerLitre')).toBe(false);
    expect(PLANS.starter.features.costPerLitre).toBe(false);
  });

  it('is never shown to a worker: Finance is not one of their screens', () => {
    expect(tabsFor(roleOrOwner('worker'))).not.toContain('finance');
    expect(tabsFor(roleOrOwner('manager'))).toContain('finance');
    expect(tabsFor(roleOrOwner('owner'))).toContain('finance');
  });
});

describe('the demo farm', () => {
  it('has last month with enough milk, expenses and billing for sensible figures', () => {
    const f = costPerLitre(initialMilkEntries, initialDeliveries, initialExpenses, previousMonthRange(farmToday()));
    expect(f.state).toBe('ready');
    expect(f.recordedDays).toBeGreaterThanOrEqual(28);
    expect(f.costPerLitre).toBeGreaterThan(20);
    expect(f.costPerLitre).toBeLessThan(80);
    expect(f.pricePerLitre).toBeGreaterThan(40);
    expect(f.feedSharePercent).toBeGreaterThan(50);
    expect(f.costHigherThanPrice).toBe(false);
  });

  it('asks this month for two weeks of milk and expenses, because the demo has only one day of milk this month', () => {
    const f = costPerLitre(initialMilkEntries, initialDeliveries, initialExpenses, monthRange(farmToday()));
    expect(f.state).toBe('not_enough');
    expect(f.costPerLitre).toBeNull();
  });
});

describe('wording in both languages', () => {
  it('says the three sentences the same way in English and Kiswahili', () => {
    expect(COST_COPY.en.cost(38)).toBe('Milk cost you about KSh 38 per litre to produce.');
    expect(COST_COPY.en.price(52)).toBe('Buyers paid you about KSh 52 per litre.');
    expect(COST_COPY.en.feed(61)).toBe('Feed was 61% of your costs.');
    expect(COST_COPY.en.note).toMatch(/Based on the expenses you have recorded/);
    expect(COST_COPY.en.notEnough).toBe('Record milk and expenses for two weeks to see your cost per litre.');
    expect(COST_COPY.sw.cost(2800)).toContain('KSh 2,800');
    expect(COST_COPY.sw.feed(61)).toContain('61');
  });
});
