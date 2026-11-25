import { describe, expect, it } from 'vitest';
import type { Buyer, CoopStatement, Delivery, PaymentRecord } from '@/types';
import { LEDGER_VERSION, buyerAccount, deliveryCharge } from '@/lib/ledger';
import { ageBucket, deductionsSummary, deliveryDueDate, moneyOwed, moneyOwedSummary, statementDueDate } from '@/lib/money-owed';

const TODAY = '2026-11-25';

const buyer = (over: Partial<Buyer> = {}): Buyer => ({
  id: 'b1', farmId: 'f1', name: 'Co-op', type: 'cooperative', ratePerLitre: 50, paymentCycle: 'monthly',
  currentBalance: 0, openingBalance: 0, ledgerVersion: LEDGER_VERSION, createdAt: '2026-08-01T08:00:00Z', ...over,
});

let n = 0;
const delivery = (date: string, litres: number, over: Partial<Delivery> = {}): Delivery => {
  n += 1;
  const d: Delivery = {
    id: `d${n}`, farmId: 'f1', buyerId: 'b1', buyerName: 'Co-op', buyerType: 'cooperative', date,
    litres, ratePerLitre: 50, rejectedLitres: 0, adjustmentKSh: 0, expectedAmount: 0, amountPaid: 0, balance: 0,
    synced: false, createdAt: `${date}T06:00:0${n % 10}Z`, ...over,
  };
  return { ...d, expectedAmount: deliveryCharge(d) };
};

const payment = (date: string, amount: number, over: Partial<PaymentRecord> = {}): PaymentRecord => {
  n += 1;
  return { id: `p${n}`, farmId: 'f1', buyerId: 'b1', buyerName: 'Co-op', date, amount, paymentMethod: 'mpesa', synced: false, createdAt: `${date}T09:00:0${n % 10}Z`, ...over };
};

const statement = (over: Partial<CoopStatement> = {}): CoopStatement => ({
  id: `s${++n}`, farmId: 'f1', buyerId: 'b1', buyerName: 'Co-op', periodFrom: '2026-10-01', periodTo: '2026-10-31',
  statementLitres: 100, ratePerLitre: 50, bonusKSh: 0, deductions: [], synced: false, createdAt: '2026-11-05T08:00:00Z', ...over,
});

describe('when money is due', () => {
  it('follows the buyer payment cycle, monthly when not set', () => {
    const d = delivery('2026-10-10', 10);
    expect(deliveryDueDate(d, buyer({ paymentCycle: 'daily' }), [])).toBe('2026-10-10');
    expect(deliveryDueDate(d, buyer({ paymentCycle: 'weekly' }), [])).toBe('2026-10-17');
    expect(deliveryDueDate(d, buyer({ paymentCycle: 'monthly' }), [])).toBe('2026-11-15');
    expect(deliveryDueDate(d, buyer({ paymentCycle: undefined }), [])).toBe('2026-11-15');
    expect(deliveryDueDate(delivery('2026-02-03', 10), buyer(), [])).toBe('2026-03-15');
  });

  it('uses the co-op statement payment date for deliveries it covers', () => {
    const s = statement({ expectedPaymentDate: '2026-11-20' });
    expect(deliveryDueDate(delivery('2026-10-10', 10), buyer(), [s])).toBe('2026-11-20');
    expect(statementDueDate({ periodTo: '2026-10-31' })).toBe('2026-11-15');
  });

  it('sorts lateness into buckets', () => {
    expect([0, -3, 1, 30, 31, 60, 61, 90, 91].map(ageBucket)).toEqual([
      'notDue', 'notDue', 'late1to30', 'late1to30', 'late31to60', 'late31to60', 'late61to90', 'late61to90', 'late90plus',
    ]);
  });
});

describe('what a buyer still owes', () => {
  it('clears the oldest money first and always adds up to the ledger balance', () => {
    const deliveries = [delivery('2026-08-10', 20), delivery('2026-09-10', 20), delivery('2026-11-10', 20)]; // KSh 1,000 each
    const payments = [payment('2026-10-01', 1500)];
    const owed = moneyOwed(buyer(), deliveries, payments, [], TODAY);
    expect(owed.unpaid.map((i) => [i.date, i.amount])).toEqual([['2026-09-10', 500], ['2026-11-10', 1000]]);
    expect(owed.unpaid.reduce((s, i) => s + i.amount, 0)).toBe(buyerAccount(buyer(), deliveries, payments).balance);
    // September's milk was due 15 Oct: 41 days late. November's is not due until 15 Dec.
    expect(owed).toMatchObject({ overdue: 500, mostDaysLate: 41, oldestUnpaidDate: '2026-09-10' });
    expect(owed.buckets).toMatchObject({ notDue: 1000, late31to60: 500, late1to30: 0 });
  });

  it('owes nothing when paid up, and keeps an advance for the next milk', () => {
    const advance = moneyOwed(buyer(), [delivery('2026-11-01', 10)], [payment('2026-10-20', 800)], [], TODAY);
    expect(advance.unpaid).toEqual([]);
    expect(advance.balance).toBe(-300);
    const used = moneyOwed(buyer(), [delivery('2026-10-01', 10), delivery('2026-10-05', 10)], [payment('2026-09-20', 800)], [], TODAY);
    expect(used.unpaid.map((i) => i.amount)).toEqual([200]);
  });

  it('follows a co-op statement that pays less than the farmer recorded', () => {
    const deliveries = [delivery('2026-10-05', 60), delivery('2026-10-20', 60)]; // farmer recorded KSh 6,000
    const s = statement({ statementLitres: 110, deductions: [{ id: 'x', label: 'Transport', amount: 500 }] }); // net 5,000
    const owed = moneyOwed(buyer(), deliveries, [], [s], TODAY);
    expect(owed.balance).toBe(5000);
    expect(owed.unpaid.reduce((t, i) => t + i.amount, 0)).toBe(5000);
    expect(owed.unpaid.every((i) => i.dueDate === '2026-11-15')).toBe(true);
    expect(owed.mostDaysLate).toBe(10);
  });

  it('ignores voided records', () => {
    const owed = moneyOwed(buyer(), [delivery('2026-10-05', 20, { voidedAt: '2026-10-06T00:00:00Z' })], [], [], TODAY);
    expect(owed.unpaid).toEqual([]);
  });

  it('lists the buyers who owe, latest payer first, with farm totals', () => {
    const hotel = buyer({ id: 'b2', name: 'Hotel', type: 'trader', paymentCycle: 'weekly' });
    const deliveries = [delivery('2026-11-20', 20), delivery('2026-10-01', 10, { buyerId: 'b2', buyerName: 'Hotel' })];
    const summary = moneyOwedSummary([buyer(), hotel, buyer({ id: 'b3', name: 'Paid up' })], deliveries, [], [], TODAY);
    expect(summary.buyers.map((b) => b.buyerName)).toEqual(['Hotel', 'Co-op']);
    expect(summary).toMatchObject({ owed: 1500, overdue: 500 });
    expect(summary.buckets.late31to60).toBe(500);
  });
});

describe('what co-ops take off', () => {
  it('totals deductions by name over the statements in range, as a share of gross', () => {
    const statements = [
      statement({ deductions: [{ id: '1', label: 'Transport', amount: 300 }, { id: '2', label: 'Feed advance', amount: 1000 }] }),
      statement({ periodFrom: '2026-09-01', periodTo: '2026-09-30', deductions: [{ id: '3', label: ' transport ', amount: 200 }] }),
      statement({ periodTo: '2026-06-30', deductions: [{ id: '4', label: 'Shares', amount: 999 }] }), // out of range
      statement({ voidedAt: '2026-11-01T00:00:00Z', deductions: [{ id: '5', label: 'Shares', amount: 999 }] }),
    ];
    const s = deductionsSummary(statements, { from: '2026-08-01', to: '2026-11-30' });
    expect(s).toMatchObject({ statementCount: 2, gross: 10000, deducted: 1500, percentOfGross: 15 });
    expect(s.lines).toEqual([
      { label: 'Feed advance', amount: 1000, percentOfGross: 10 },
      { label: 'Transport', amount: 500, percentOfGross: 5 },
    ]);
  });

  it('says nothing when there are no statements', () => {
    expect(deductionsSummary([], { from: '2026-01-01', to: '2026-12-31' })).toEqual({ statementCount: 0, gross: 0, deducted: 0, percentOfGross: 0, lines: [] });
  });
});
