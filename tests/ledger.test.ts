import { describe, expect, it } from 'vitest';
import type { Buyer, Delivery, PaymentRecord } from '@/types';
import {
  LEDGER_VERSION,
  buyerAccount,
  cashReceived,
  deliveryCharge,
  migrateLegacyLedger,
  paymentsWithReference,
  possibleDuplicatePayments,
  receiptForDelivery,
  receivables,
  salesInRange,
} from '@/lib/ledger';

const buyer = (over: Partial<Buyer> = {}): Buyer => ({
  id: 'b1', farmId: 'f1', name: 'Co-op', type: 'cooperative', ratePerLitre: 50,
  currentBalance: 0, openingBalance: 0, ledgerVersion: LEDGER_VERSION, createdAt: '2026-10-01T08:00:00Z', ...over,
});

let n = 0;
const delivery = (over: Partial<Delivery> = {}): Delivery => {
  n += 1;
  const d: Delivery = {
    id: `d${n}`, farmId: 'f1', buyerId: 'b1', buyerName: 'Co-op', buyerType: 'cooperative', date: '2026-11-05',
    litres: 40, ratePerLitre: 50, rejectedLitres: 0, adjustmentKSh: 0, expectedAmount: 0, amountPaid: 0, balance: 0,
    synced: false, createdAt: `2026-11-05T0${n % 10}:00:00Z`, ...over,
  };
  return { ...d, expectedAmount: over.expectedAmount ?? deliveryCharge(d) };
};

const payment = (over: Partial<PaymentRecord> = {}): PaymentRecord => {
  n += 1;
  return {
    id: `p${n}`, farmId: 'f1', buyerId: 'b1', buyerName: 'Co-op', date: '2026-11-06', amount: 1000,
    paymentMethod: 'mpesa', synced: false, createdAt: `2026-11-06T0${n % 10}:00:00Z`, ...over,
  };
};

describe('delivery charges', () => {
  it('never bills rejected litres', () => {
    expect(deliveryCharge({ litres: 40, rejectedLitres: 5, ratePerLitre: 50, adjustmentKSh: 0 })).toBe(1750);
  });

  it('applies explicit deductions and never goes below zero', () => {
    expect(deliveryCharge({ litres: 40, rejectedLitres: 0, ratePerLitre: 50, adjustmentKSh: -100 })).toBe(1900);
    expect(deliveryCharge({ litres: 2, rejectedLitres: 0, ratePerLitre: 50, adjustmentKSh: -500 })).toBe(0);
  });

  it('reports accepted, not delivered, litres as sold', () => {
    const s = salesInRange([delivery({ litres: 40, rejectedLitres: 5 })], { from: '2026-11-01', to: '2026-11-30' });
    expect(s).toMatchObject({ deliveredLitres: 40, rejectedLitres: 5, acceptedLitres: 35, billed: 1750 });
  });
});

describe('buyer ledger', () => {
  it('handles partial payments', () => {
    const acct = buyerAccount(buyer(), [delivery()], [payment({ amount: 500 })]);
    expect(acct).toMatchObject({ charged: 2000, received: 500, balance: 1500 });
  });

  it('keeps an advance as a negative balance and applies later deliveries against it', () => {
    const b = buyer({ type: 'household', openingBalance: 0 });
    const advance = payment({ amount: 1800, date: '2026-11-01' });
    expect(buyerAccount(b, [], [advance]).balance).toBe(-1800);
    const acct = buyerAccount(b, [delivery({ litres: 2, ratePerLitre: 60 })], [advance]);
    expect(acct.balance).toBe(-1680);
    expect(receivables([b], [delivery({ litres: 2, ratePerLitre: 60 })], [advance])).toMatchObject({ owedToFarm: 0, advancesHeld: 1680, buyersInAdvance: 1 });
  });

  it('includes the opening balance', () => {
    expect(buyerAccount(buyer({ openingBalance: 3000 }), [delivery()], []).balance).toBe(5000);
  });

  it('excludes voided deliveries and payments (reversal instead of deletion)', () => {
    const acct = buyerAccount(buyer(), [delivery(), delivery({ voidedAt: '2026-11-07T00:00:00Z' })], [payment({ amount: 2000, voidedAt: '2026-11-07T00:00:00Z' })]);
    expect(acct.balance).toBe(2000);
  });

  it('counts money paid at delivery exactly once', () => {
    const d = delivery({ litres: 8, ratePerLitre: 55, amountPaid: 440 });
    const receipt = receiptForDelivery(d, '2026-11-05T08:00:00Z')!;
    const acct = buyerAccount(buyer({ ratePerLitre: 55 }), [d], [receipt]);
    expect(acct.balance).toBe(0);
    expect(cashReceived([receipt], { from: '2026-11-01', to: '2026-11-30' }).amount).toBe(440);
  });

  it('applies month boundaries to cash received', () => {
    const payments = [payment({ date: '2026-10-31', amount: 100 }), payment({ date: '2026-11-01', amount: 200 }), payment({ date: '2026-11-30', amount: 300 }), payment({ date: '2026-12-01', amount: 400 })];
    expect(cashReceived(payments, { from: '2026-11-01', to: '2026-11-30' })).toEqual({ amount: 500, count: 2 });
  });
});

describe('duplicate receipts', () => {
  it('finds an M-Pesa reference already used, ignoring case and spaces', () => {
    const existing = payment({ referenceNo: 'TKR729910Q' });
    expect(paymentsWithReference([existing], 'tkr 729910q')).toEqual([existing]);
    expect(paymentsWithReference([existing], '')).toEqual([]);
    expect(paymentsWithReference([{ ...existing, voidedAt: 'x' }], 'TKR729910Q')).toEqual([]);
  });

  it('flags the same amount from the same buyer on the same day (a retried save)', () => {
    const a = payment({ amount: 440, date: '2026-11-05' });
    const b = payment({ amount: 440, date: '2026-11-05' });
    const c = payment({ amount: 440, date: '2026-11-06' });
    expect(Array.from(possibleDuplicatePayments([a, b, c])).sort()).toEqual([a.id, b.id].sort());
  });
});

describe('legacy balance migration', () => {
  it('reproduces the balance the farmer saw and records delivery-time payments once', () => {
    // Legacy: opening 1000 typed when the buyer was created, then a 2000 delivery with
    // 500 paid on the spot (balance +1500), then a 700 receipt. Shown balance = 1800.
    const legacyBuyer = buyer({ currentBalance: 1800, openingBalance: undefined, ledgerVersion: undefined });
    const d = delivery({ amountPaid: 500, balance: 1500 });
    const r = payment({ amount: 700 });
    const out = migrateLegacyLedger([legacyBuyer], [d], [r], '2026-11-08T00:00:00Z');
    expect(out.changed).toBe(true);
    expect(out.payments).toHaveLength(2);
    expect(out.buyers[0].openingBalance).toBe(1000);
    expect(buyerAccount(out.buyers[0], [d], out.payments).balance).toBe(1800);
  });

  it('is idempotent', () => {
    const legacyBuyer = buyer({ currentBalance: 1800, openingBalance: undefined, ledgerVersion: undefined });
    const d = delivery({ amountPaid: 500 });
    const first = migrateLegacyLedger([legacyBuyer], [d], [], '2026-11-08T00:00:00Z');
    const second = migrateLegacyLedger(first.buyers, [d], first.payments, '2026-11-09T00:00:00Z');
    expect(second.changed).toBe(false);
    expect(second.payments).toEqual(first.payments);
    expect(second.buyers).toEqual(first.buyers);
  });

  it('keeps a legacy balance that was clamped to zero visible as an opening amount', () => {
    // Legacy deleteDelivery clamped a -500 advance to 0. The ledger keeps 0, and the
    // opening amount explains the gap instead of silently inventing an advance.
    const legacyBuyer = buyer({ currentBalance: 0, openingBalance: undefined, ledgerVersion: undefined });
    const out = migrateLegacyLedger([legacyBuyer], [], [payment({ amount: 500 })], '2026-11-08T00:00:00Z');
    expect(out.buyers[0].openingBalance).toBe(500);
    expect(buyerAccount(out.buyers[0], [], [payment({ amount: 500 })]).balance).toBe(0);
  });
});
