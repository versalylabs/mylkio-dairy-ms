import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Buyer, Cow, Delivery, ExpenseRecord, MilkEntry, PaymentRecord } from '@/types';
import { farmToday, monthRange } from '@/lib/dates';
import { REPORT_MONTHS, farmReport, herdToday, reportMonthKeys } from '@/lib/farm-report';
import { REPORT_COPY } from '@/lib/report-copy';
import { canUse } from '@/lib/plans';
import { cashReceived, expensesInRange, salesInRange } from '@/lib/ledger';
import { productionInRange } from '@/lib/milk';
import { initialBuyers, initialCows, initialDeliveries, initialExpenses, initialFarm, initialMilkEntries, initialPayments } from '@/lib/mock-data';

const FARM = 'farm-test';
const farm = { name: 'Green Hills Dairy', county: 'Nakuru', ownerName: 'Amina Wanjiru', phone: '0712 345 678' };
const TODAY = '2026-11-16';

const milk = (date: string, litres: number): MilkEntry => ({ id: `m-${date}`, farmId: FARM, date, session: 'total', mode: 'farm_total', totalLitres: litres, synced: true, createdAt: `${date}T15:00:00Z` });
const delivery = (date: string, litres: number, rate = 50, rejected = 0): Delivery => ({
  id: `d-${date}-${litres}`, farmId: FARM, buyerId: 'b1', buyerName: 'Baraka', buyerType: 'cooperative', date, litres, ratePerLitre: rate,
  rejectedLitres: rejected, adjustmentKSh: 0, expectedAmount: 0, amountPaid: 0, balance: 0, synced: true, createdAt: `${date}T07:00:00Z`,
});
const payment = (date: string, amount: number, over: Partial<PaymentRecord> = {}): PaymentRecord => ({ id: `p-${date}-${amount}`, farmId: FARM, buyerId: 'b1', buyerName: 'Baraka', date, amount, paymentMethod: 'mpesa', synced: true, createdAt: `${date}T09:00:00Z`, ...over });
const expense = (date: string, amount: number): ExpenseRecord => ({ id: `e-${date}-${amount}`, farmId: FARM, date, category: 'feed', description: 'x', amount, paymentMethod: 'cash', createdAt: `${date}T10:00:00Z` });
const cow = (id: string, over: Partial<Cow> = {}): Cow => ({ id, farmId: FARM, tag: `TAG-${id}`, name: `Name${id}`, breed: 'Friesian' as Cow['breed'], sex: 'female', status: 'lactating', isPregnant: false, parity: 1, createdAt: '2025-01-01', ...over });
const buyer = (name: string, type: Buyer['type']) => ({ name, type });

const base = { farm, cows: [] as Cow[], buyers: [] as Pick<Buyer, 'name' | 'type'>[], milk: [] as MilkEntry[], deliveries: [] as Delivery[], payments: [] as PaymentRecord[], expenses: [] as ExpenseRecord[], includeBuyerNames: false, today: TODAY };

describe('the 12 months', () => {
  it('are the 12 months up to and including the one the owner chooses, oldest first', () => {
    const keys = reportMonthKeys('2026-11');
    expect(keys).toHaveLength(REPORT_MONTHS);
    expect(keys[0]).toBe('2025-12');
    expect(keys[11]).toBe('2026-11');
    expect(reportMonthKeys('2026-02')[0]).toBe('2025-03');
    expect(reportMonthKeys('2026-01')[0]).toBe('2025-02');
    const r = farmReport({ ...base, endMonth: '2026-06' });
    expect(r.from).toBe('2025-07-01');
    expect(r.to).toBe('2026-06-30');
    expect(r.months.map((m) => m.key)[0]).toBe('2025-07');
  });
});

describe('the monthly table', () => {
  const data = {
    ...base,
    milk: [milk('2026-10-03', 100), milk('2026-10-20', 120), milk('2026-11-02', 90)],
    deliveries: [delivery('2026-10-05', 150, 50, 10), delivery('2026-11-03', 80, 50)],
    payments: [payment('2026-10-25', 5000), payment('2026-11-05', 2000), payment('2026-11-06', 900, { voidedAt: 'x', voidReason: 'dup' })],
    expenses: [expense('2026-10-10', 3000), expense('2026-10-11', 1000)],
  };

  it('works each month out by hand', () => {
    const r = farmReport({ ...data, endMonth: '2026-11' });
    const oct = r.months.find((m) => m.key === '2026-10')!;
    expect(oct).toEqual({ key: '2026-10', produced: 220, sold: 150, billed: 7000, received: 5000, expenses: 4000 }); // billed: (150-10) x 50
    const nov = r.months.find((m) => m.key === '2026-11')!;
    expect(nov).toEqual({ key: '2026-11', produced: 90, sold: 80, billed: 4000, received: 2000, expenses: null }); // the voided payment is left out
  });

  it('shows a dash, never a zero, for a month with no records of a kind', () => {
    const r = farmReport({ ...data, endMonth: '2026-11' });
    const quiet = r.months.find((m) => m.key === '2026-05')!;
    expect(quiet).toEqual({ key: '2026-05', produced: null, sold: null, billed: null, received: null, expenses: null });
    expect(JSON.stringify(r.months.filter((m) => m.key < '2026-10'))).not.toMatch(/:0[,}]/);
  });

  it('adds up the months that have figures, and has no total where there are none', () => {
    const r = farmReport({ ...data, endMonth: '2026-11' });
    expect(r.totals).toEqual({ produced: 310, sold: 230, billed: 11_000, received: 7000, expenses: 4000 });
    expect(farmReport({ ...base, endMonth: '2026-11' }).totals).toEqual({ produced: null, sold: null, billed: null, received: null, expenses: null });
  });

  it('matches Finance and Sales for the same months', () => {
    const r = farmReport({ ...data, endMonth: '2026-11' });
    for (const m of r.months) {
      const range = monthRange(`${m.key}-01`);
      const production = productionInRange(data.milk, range);
      const sales = salesInRange(data.deliveries, range);
      expect(m.produced).toBe(production.recordedDays ? production.litres : null);
      expect(m.billed).toBe(sales.count ? sales.billed : null);
      expect(m.sold).toBe(sales.count ? sales.deliveredLitres : null);
      expect(m.received).toBe(cashReceived(data.payments, range).count ? cashReceived(data.payments, range).amount : null);
      expect(m.expenses).toBe(expensesInRange(data.expenses, range).count ? expensesInRange(data.expenses, range).amount : null);
    }
  });

  it('leaves out records outside the 12 months', () => {
    const r = farmReport({ ...data, milk: [...data.milk, milk('2025-05-01', 999)], endMonth: '2026-11' });
    expect(r.totals.produced).toBe(310);
  });
});

describe('the herd, the buyers and the milk record', () => {
  it('counts the herd today without animals that are sold, dead or archived', () => {
    const cows = [cow('1'), cow('2', { isPregnant: true }), cow('3', { status: 'dry', isPregnant: true }), cow('4', { status: 'pregnant_heifer' }), cow('5', { status: 'calf' }), cow('6', { status: 'sold' }), cow('7', { status: 'deceased' }), cow('8', { status: 'archived' })];
    expect(herdToday(cows)).toEqual({ total: 5, lactating: 2, dry: 1, inCalf: 3, heifers: 1, calves: 1 });
  });

  it('carries no health detail and no individual cow data', () => {
    const r = farmReport({ ...base, cows: [cow('1'), cow('2')], endMonth: '2026-11' });
    const text = JSON.stringify(r);
    expect(text).not.toMatch(/TAG-|Name1|Name2|health|treatment|medicine|withdrawal/i);
    expect(Object.keys(r.herd).sort()).toEqual(['calves', 'dry', 'heifers', 'inCalf', 'lactating', 'total']);
  });

  it('counts buyers by type, and names them only when the owner asks', () => {
    const buyers = [buyer('Baraka Co-op', 'cooperative'), buyer('Mama Wanjiku', 'household'), buyer('Mama Njeri', 'household'), buyer('Cafe Safari', 'trader')];
    const without = farmReport({ ...base, buyers, endMonth: '2026-11' });
    expect(without.buyersByType).toEqual({ cooperative: 1, household: 2, trader: 1, total: 4 });
    expect(without.buyerNames).toBeNull();
    expect(JSON.stringify(without)).not.toMatch(/Baraka|Wanjiku|Njeri|Safari/);
    const withNames = farmReport({ ...base, buyers, includeBuyerNames: true, endMonth: '2026-11' });
    expect(withNames.buyerNames).toEqual(['Baraka Co-op', 'Cafe Safari', 'Mama Njeri', 'Mama Wanjiku']);
  });

  it('counts the months of milk records in a row, back from the last month of the report', () => {
    const run = ['2026-08-05', '2026-09-05', '2026-10-05', '2026-11-05'].map((d) => milk(d, 50));
    expect(farmReport({ ...base, milk: run, endMonth: '2026-11' }).continuousMilkMonths).toBe(4);
    expect(farmReport({ ...base, milk: [...run, milk('2026-06-05', 50)], endMonth: '2026-11' }).continuousMilkMonths).toBe(4); // a gap in July stops the count
    expect(farmReport({ ...base, milk: run, endMonth: '2026-12' }).continuousMilkMonths).toBe(0); // December has nothing yet
    expect(farmReport({ ...base, milk: run, endMonth: '2026-10' }).continuousMilkMonths).toBe(3);
  });

  it('names the farm, county, owner, phone and the dates', () => {
    const r = farmReport({ ...base, endMonth: '2026-11' });
    expect(r).toMatchObject({ farmName: 'Green Hills Dairy', county: 'Nakuru', ownerName: 'Amina Wanjiru', ownerPhone: '0712 345 678', reportDate: TODAY });
  });
});

describe('the page, the plan and the wording', () => {
  const live = (plan: string, status = 'active') => ({ plan, status, renewsAt: new Date(Date.now() + 5 * 86_400_000).toISOString() });

  it('says plainly that it is not audited, in both languages', () => {
    expect(REPORT_COPY.en.footer).toBe("Prepared from the farmer's own records in Mylkio. Not audited or verified by Mylkio.");
    expect(REPORT_COPY.sw.footer).toMatch(/Haijakaguliwa/);
  });

  it('is Farm Pro and Custom only', () => {
    expect(canUse(live('farmer'), 'farmReport')).toBe(false);
    expect(canUse(live('farm_pro'), 'farmReport')).toBe(true);
    expect(canUse(live('custom'), 'farmReport')).toBe(true);
  });

  it('prints on A4, and only the report', () => {
    const css = readFileSync(path.resolve(__dirname, '..', 'app/globals.css'), 'utf8');
    expect(css).toMatch(/@page\s*\{\s*size:\s*A4/);
    expect(css).toMatch(/\.print-area, \.print-area \*\s*\{\s*visibility: visible/);
    expect(css).toMatch(/body \* \{ visibility: hidden !important; \}/);
  });
});

describe('the demo farm', () => {
  it('has figures for the last two months and dashes before them', () => {
    const r = farmReport({
      farm: initialFarm, cows: initialCows, buyers: initialBuyers, milk: initialMilkEntries, deliveries: initialDeliveries, payments: initialPayments, expenses: initialExpenses,
      endMonth: farmToday().slice(0, 7), includeBuyerNames: false, today: farmToday(),
    });
    expect(r.months).toHaveLength(12);
    expect(r.months[0].produced).toBeNull();
    expect(r.months[11].produced).toBeGreaterThan(0);
    expect(r.months[10].produced).toBeGreaterThan(0);
    expect(r.continuousMilkMonths).toBeGreaterThanOrEqual(2);
    expect(r.herd.total).toBeGreaterThanOrEqual(7);
    expect(r.buyersByType.total).toBe(initialBuyers.length);
  });
});
