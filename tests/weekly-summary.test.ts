import { describe, expect, it } from 'vitest';
import type { BreedingEvent, Delivery, FarmReminder, HealthEvent, MilkEntry, PaymentRecord } from '@/types';
import { addDays, farmToday } from '@/lib/dates';
import { lastWeekRange, mondayOf, recordersSummary, weekdayIndex, weeklySummary } from '@/lib/weekly-summary';
import { WEEKLY_COPY } from '@/lib/weekly-copy';
import { canUse } from '@/lib/plans';
import { canSeeMoney, roleOrOwner } from '@/lib/team';
import { cashReceived, salesInRange } from '@/lib/ledger';
import { productionInRange } from '@/lib/milk';
import { initialBreedingEvents, initialDeliveries, initialHealthEvents, initialMilkEntries, initialPayments, initialReminders } from '@/lib/mock-data';

const FARM = 'farm-test';
// 2026-11-16 is a Monday. "Last week" on 2026-11-23 is Monday 16 to Sunday 22 November.
const TODAY = '2026-11-23';
const WEEK = { from: '2026-11-16', to: '2026-11-22' };
const BEFORE = { from: '2026-11-09', to: '2026-11-15' };

const milk = (date: string, litres: number, over: Partial<MilkEntry> = {}): MilkEntry => ({
  id: `m-${date}-${litres}-${Math.random().toString(36).slice(2, 5)}`, farmId: FARM, date, session: 'total', mode: 'farm_total', totalLitres: litres, synced: true, createdAt: `${date}T15:00:00Z`, ...over,
});
const delivery = (date: string, litres: number, rate = 50, rejected = 0, over: Partial<Delivery> = {}): Delivery => ({
  id: `d-${date}-${litres}`, farmId: FARM, buyerId: 'b1', buyerName: 'Baraka', buyerType: 'cooperative', date, litres, ratePerLitre: rate,
  rejectedLitres: rejected, adjustmentKSh: 0, expectedAmount: (litres - rejected) * rate, amountPaid: 0, balance: 0, synced: true, createdAt: `${date}T07:00:00Z`, ...over,
});
const payment = (date: string, amount: number, over: Partial<PaymentRecord> = {}): PaymentRecord => ({
  id: `p-${date}-${amount}`, farmId: FARM, buyerId: 'b1', buyerName: 'Baraka', date, amount, paymentMethod: 'mpesa', synced: true, createdAt: `${date}T09:00:00Z`, ...over,
});
const reminder = (dueDate: string, over: Partial<FarmReminder> = {}): FarmReminder => ({
  id: `r-${dueDate}`, farmId: FARM, type: 'vaccination', title: 't', description: 'd', dueDate, severity: 'info', completed: false, createdAt: '2026-11-01', ...over,
});
const by = (id: string, name = id) => ({ id, name });

const empty = { milk: [] as MilkEntry[], deliveries: [] as Delivery[], payments: [] as PaymentRecord[], health: [] as HealthEvent[], breeding: [] as BreedingEvent[], reminders: [] as FarmReminder[], buyerBalances: [] as number[], today: TODAY };

describe('the week', () => {
  it('runs Monday to Sunday, and "last week" is the week that has just ended', () => {
    expect(weekdayIndex('2026-11-16')).toBe(0); // Monday
    expect(weekdayIndex('2026-11-22')).toBe(6); // Sunday
    expect(mondayOf('2026-11-19')).toBe('2026-11-16');
    expect(lastWeekRange('2026-11-23')).toEqual(WEEK); // on the Monday, the week that just ended
    expect(lastWeekRange('2026-11-29')).toEqual(WEEK); // on the Sunday it is still last Monday to Sunday... the week before this one
    expect(lastWeekRange('2026-11-30')).toEqual({ from: '2026-11-23', to: '2026-11-29' }); // next Monday it moves on
    expect(lastWeekRange('2026-11-16')).toEqual(BEFORE);
  });
});

describe('the figures', () => {
  const data = {
    ...empty,
    milk: [milk('2026-11-16', 100), milk('2026-11-18', 110), milk('2026-11-21', 90), milk('2026-11-10', 100), milk('2026-11-12', 100), milk('2026-11-14', 100)],
    deliveries: [delivery('2026-11-17', 120, 50, 20), delivery('2026-11-20', 100, 50), delivery('2026-11-12', 80, 50)],
    payments: [payment('2026-11-19', 8000), payment('2026-11-21', 2000), payment('2026-11-10', 5000)],
    buyerBalances: [7000, 0, -500, 3000],
    reminders: [reminder('2026-11-20'), reminder('2026-11-10'), reminder('2026-11-30'), reminder('2026-11-01', { completed: true }), reminder('2026-11-05', { type: 'withdrawal' })],
  };

  it('works out last week by hand', () => {
    const s = weeklySummary(data);
    expect(s.weekStart).toBe('2026-11-16');
    expect(s.weekEnd).toBe('2026-11-22');
    expect(s.produced).toBe(300); // 100 + 110 + 90
    expect(s.previousProduced).toBe(300);
    expect(s.changePercent).toBe(0);
    expect(s.sold).toBe(220); // 120 + 100 delivered (accepted plus rejected)
    expect(s.notSold).toBe(80);
    expect(s.soldState).toBe('ok');
    expect(s.billed).toBe(5000 + 5000 - 0); // (120-20) x 50 + 100 x 50
    expect(s.received).toBe(10_000);
    expect(s.owedTotal).toBe(10_000); // 7,000 + 3,000: advances are not owed
    expect(s.buyersOwing).toBe(2);
    expect(s.overdueReminders).toBe(2); // 20 Nov and 10 Nov; not the future one, the finished one, or the ended withdrawal
    expect(s.hasActivity).toBe(true);
  });

  it('matches Home and Finance for the same dates', () => {
    const s = weeklySummary(data);
    expect(s.produced).toBe(productionInRange(data.milk, WEEK).litres);
    expect(s.billed).toBe(salesInRange(data.deliveries, WEEK).billed);
    expect(s.received).toBe(cashReceived(data.payments, WEEK).amount);
  });

  it('shows the change against the week before, up or down', () => {
    expect(weeklySummary({ ...data, milk: [milk('2026-11-16', 150), milk('2026-11-10', 100)] }).changePercent).toBe(50);
    expect(weeklySummary({ ...data, milk: [milk('2026-11-16', 80), milk('2026-11-10', 100)] }).changePercent).toBe(-20);
    expect(weeklySummary({ ...data, milk: [milk('2026-11-16', 80)] }).changePercent).toBeNull(); // nothing the week before to compare with
  });

  it('a voided delivery, payment or milk record changes it', () => {
    const v = weeklySummary({
      ...data,
      deliveries: [delivery('2026-11-17', 120, 50, 20, { voidedAt: 'x', voidReason: 'dup' }), delivery('2026-11-20', 100, 50)],
      payments: [payment('2026-11-19', 8000, { voidedAt: 'x', voidReason: 'dup' }), payment('2026-11-21', 2000)],
      milk: data.milk.map((m) => (m.date === '2026-11-18' ? { ...m, voidedAt: 'x', voidReason: 'typo' } : m)),
    });
    expect(v).toMatchObject({ produced: 190, sold: 100, billed: 5000, received: 2000 });
  });

  it('says sold more than recorded instead of a negative number', () => {
    const s = weeklySummary({ ...data, deliveries: [delivery('2026-11-17', 500)] });
    expect(s).toMatchObject({ soldState: 'sold_more', notSold: null, sold: 500 });
  });

  it('has nothing to show for a week with no records, and the card is not worth showing', () => {
    expect(weeklySummary(empty).hasActivity).toBe(false);
    expect(weeklySummary({ ...empty, milk: [milk('2026-11-12', 100)] }).hasActivity).toBe(false); // the week before only
  });
});

describe('who recorded what', () => {
  const week = WEEK;
  const stamped = <T extends object>(base: T, who: { id: string; name: string } | undefined, createdAt: string) => ({ ...base, recordedBy: who, createdAt }) as T & { recordedBy?: { id: string; name: string }; createdAt: string };
  const health = (who: { id: string; name: string } | undefined, createdAt: string) => stamped({ id: `h-${createdAt}-${who?.id}` } as HealthEvent, who, createdAt) as unknown as HealthEvent;
  const breeding = (who: { id: string; name: string } | undefined, createdAt: string) => stamped({ id: `b-${createdAt}-${who?.id}` } as BreedingEvent, who, createdAt) as unknown as BreedingEvent;

  it('counts each person\'s milk, health and breeding records saved last week, on a farm with a team', () => {
    const records = {
      milk: [milk('2026-11-16', 50, { recordedBy: by('owner', 'Amina') }), milk('2026-11-17', 50, { recordedBy: by('mary', 'Mary') }), milk('2026-11-18', 50, { recordedBy: by('mary', 'Mary') })],
      health: [health(by('mary', 'Mary'), '2026-11-19T08:00:00Z')],
      breeding: [breeding(by('owner', 'Amina'), '2026-11-20T08:00:00Z')],
    };
    const rows = recordersSummary(records, week, TODAY)!;
    expect(rows.map((r) => [r.name, r.milk, r.health, r.breeding, r.total])).toEqual([['Mary', 2, 1, 0, 3], ['Amina', 1, 0, 1, 2]]);
  });

  it('gives a farm with no team no such lines', () => {
    const solo = { milk: [milk('2026-11-16', 50, { recordedBy: by('owner') }), milk('2026-11-17', 50, { recordedBy: by('owner') })], health: [], breeding: [] };
    expect(recordersSummary(solo, week, TODAY)).toBeNull();
    expect(recordersSummary({ milk: [milk('2026-11-16', 50)], health: [], breeding: [] }, week, TODAY)).toBeNull(); // nobody stamped: older records
  });

  it('leaves out records saved in other weeks, voided records, and records with no name', () => {
    const records = {
      milk: [
        milk('2026-11-16', 50, { recordedBy: by('a', 'Ann') }), milk('2026-11-17', 50, { recordedBy: by('b', 'Ben') }),
        milk('2026-11-18', 50, { recordedBy: by('b', 'Ben'), voidedAt: 'x', voidReason: 'typo' }),
        milk('2026-11-10', 50, { recordedBy: by('b', 'Ben') }), // the week before
        milk('2026-11-19', 50), // saved before names were kept
      ],
      health: [], breeding: [],
    };
    const rows = recordersSummary(records, week, TODAY)!;
    expect(rows.map((r) => `${r.name}:${r.total}`)).toEqual(['Ann:1', 'Ben:1']);
  });

  it('uses the Nairobi day a record was saved on: late on Sunday in UTC is already Monday in Kenya', () => {
    const records = {
      milk: [milk('2026-11-22', 50, { recordedBy: by('a', 'Ann'), createdAt: '2026-11-22T22:30:00Z' }), milk('2026-11-21', 50, { recordedBy: by('b', 'Ben'), createdAt: '2026-11-21T20:00:00Z' })],
      health: [], breeding: [],
    };
    const rows = recordersSummary(records, week, TODAY)!;
    expect(rows.map((r) => r.name)).toEqual(['Ben']); // Ann's record was saved at 01:30 on Monday 23rd in Nairobi: next week's
  });
});

describe('who gets it, the sharing and the wording', () => {
  const live = (plan: string, status = 'active') => ({ plan, status, renewsAt: new Date(Date.now() + 5 * 86_400_000).toISOString() });

  it('is Farm Pro and Custom only, and never a worker or anyone who may not see money', () => {
    expect(canUse(live('starter'), 'weeklySummary')).toBe(false);
    expect(canUse(live('farmer'), 'weeklySummary')).toBe(false);
    expect(canUse(live('farm_pro'), 'weeklySummary')).toBe(true);
    expect(canUse(live('custom'), 'weeklySummary')).toBe(true);
    expect(canUse({ plan: 'farm_pro', status: 'active', renewsAt: new Date(Date.now() - 30 * 86_400_000).toISOString() }, 'weeklySummary')).toBe(false); // paused
    expect(canSeeMoney(roleOrOwner('worker'))).toBe(false);
    expect(canSeeMoney(roleOrOwner('manager'))).toBe(true);
    expect(canSeeMoney(roleOrOwner('owner'))).toBe(true);
  });

  it('writes the figures into a WhatsApp message in English and Kiswahili, with nothing sent for the farmer', () => {
    const s = weeklySummary({
      ...empty, milk: [milk('2026-11-16', 100), milk('2026-11-10', 80)], deliveries: [delivery('2026-11-17', 60, 50)], payments: [payment('2026-11-19', 1500)],
      buyerBalances: [1500], reminders: [reminder('2026-11-20')],
    });
    const en = WEEKLY_COPY.en.shareText('Green Hills', '16 Nov 2026 to 22 Nov 2026', s);
    expect(en).toContain('Last week on Green Hills');
    expect(en).toContain('Milk produced: 100.0 L (up 25% on the week before)');
    expect(en).toContain('Milk sold: 60.0 L, not sold: 40.0 L');
    expect(en).toContain('Billed: KSh 3,000. Received: KSh 1,500');
    expect(en).toContain('Buyers owing: KSh 1,500 (1 buyer)');
    expect(en).toContain('Reminders overdue: 1');
    const sw = WEEKLY_COPY.sw.shareText('Green Hills', '16 Nov 2026 hadi 22 Nov 2026', s);
    expect(sw).toContain('Maziwa yaliyozalishwa: 100.0 L');
    expect(sw).toContain('KSh 3,000');
  });
});

describe('the demo farm', () => {
  it('has a last week with milk, billing, cash, an overdue reminder or two, and two people recording', () => {
    const today = farmToday();
    const s = weeklySummary({
      milk: initialMilkEntries, deliveries: initialDeliveries, payments: initialPayments, health: initialHealthEvents, breeding: initialBreedingEvents,
      reminders: initialReminders, buyerBalances: [3000, 1200, 0], today,
    });
    expect(s.hasActivity).toBe(true);
    expect(s.produced).toBeGreaterThan(300);
    expect(s.billed).toBeGreaterThan(0);
    expect(s.received).toBeGreaterThanOrEqual(0);
    expect(s.recorders).not.toBeNull();
    expect(s.recorders!.map((r) => r.name).sort()).toEqual(['James Kariuki', 'Mary Wanjiku']);
    expect(addDays(s.weekStart, 6)).toBe(s.weekEnd);
  });
});
