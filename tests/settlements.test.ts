import { describe, expect, it } from 'vitest';
import type { Buyer, CoopStatement, CustomerBill, Delivery, PaymentAllocation, PaymentRecord } from '@/types';
import { buyerAccount, statementNet } from '@/lib/ledger';
import {
  allowedAllocation,
  assertBillable,
  billSettlement,
  buyerStatement,
  draftBill,
  openTargets,
  overlappingStatement,
  reconcileStatement,
  statementSettlement,
  unallocatedAmount,
  unbilledDeliveries,
  type AllocationContext,
} from '@/lib/settlements';

const OCT = { from: '2026-10-01', to: '2026-10-31' };
const buyer = (over: Partial<Buyer> = {}): Buyer => ({
  id: 'coop', farmId: 'f', name: 'Baraka Co-op', type: 'cooperative', ratePerLitre: 48, currentBalance: 0,
  openingBalance: 0, ledgerVersion: 1, createdAt: '2026-09-01T00:00:00Z', openingBalanceDate: '2026-09-30', ...over,
});
let n = 0;
const delivery = (over: Partial<Delivery> = {}): Delivery => ({
  id: `d${++n}`, farmId: 'f', buyerId: 'coop', buyerName: 'Baraka Co-op', buyerType: 'cooperative', date: '2026-10-10',
  litres: 30, ratePerLitre: 48, rejectedLitres: 0, adjustmentKSh: 0, expectedAmount: 1440, amountPaid: 0, balance: 1440,
  synced: false, createdAt: `2026-10-10T0${n % 10}:00:00Z`, ...over,
});
const statement = (over: Partial<CoopStatement> = {}): CoopStatement => ({
  id: 's1', farmId: 'f', buyerId: 'coop', buyerName: 'Baraka Co-op', periodFrom: OCT.from, periodTo: OCT.to,
  statementLitres: 905, ratePerLitre: 48, bonusKSh: 0,
  deductions: [{ id: 'a', label: 'Transport', amount: 900 }, { id: 'b', label: 'Feed advance', amount: 4600 }],
  synced: false, createdAt: '2026-11-02T00:00:00Z', ...over,
});
const payment = (over: Partial<PaymentRecord> = {}): PaymentRecord => ({
  id: `p${++n}`, farmId: 'f', buyerId: 'coop', buyerName: 'Baraka Co-op', date: '2026-11-15', amount: 1000,
  paymentMethod: 'bank', synced: false, createdAt: '2026-11-15T10:00:00Z', ...over,
});
const ctxOf = (over: Partial<AllocationContext> = {}): AllocationContext => ({ payments: [], allocations: [], statements: [], bills: [], ...over });

// 31 deliveries: 30 × 30 L plus one of 40 L with 10 L rejected = 930 L accepted.
const october = () => Array.from({ length: 31 }, (_, i) => delivery({
  date: `2026-10-${String(i + 1).padStart(2, '0')}`, litres: i === 0 ? 40 : 30, rejectedLitres: i === 0 ? 10 : 0,
}));

describe('co-op statement reconciliation', () => {
  it('compares "you recorded 930 L" with "the statement shows 905 L"', () => {
    const rec = reconcileStatement(statement(), october());
    expect(rec).toMatchObject({ recordedAccepted: 930, recordedRejected: 10, statementLitres: 905 });
    expect(rec.litreDifference).toBe(-25);
    expect(rec.matches).toBe(false);
  });

  it('computes the net payout as gross + bonus − itemised deductions', () => {
    expect(statementNet(statement({ bonusKSh: 500 }))).toBe(905 * 48 + 500 - 5500);
  });

  it('makes the statement the authority for its period in the buyer balance', () => {
    const ds = october();
    const without = buyerAccount(buyer(), ds, []).balance;
    const withStatement = buyerAccount(buyer(), ds, [], [statement()]);
    expect(without).toBe(930 * 48);
    expect(withStatement.balance).toBe(statementNet(statement()));
    // The farmer's delivery lines stay visible; one adjustment line reconciles them.
    expect(withStatement.lines.filter((l) => l.kind === 'charge')).toHaveLength(31);
    expect(withStatement.lines.filter((l) => l.kind === 'statement')).toHaveLength(1);
  });

  it('keeps following the statement even if a delivery for that month is added later', () => {
    const ds = october();
    const late = [...ds, delivery({ date: '2026-10-31', litres: 25 })];
    expect(buyerAccount(buyer(), late, [], [statement()]).balance).toBe(statementNet(statement()));
  });

  it('ignores voided statements', () => {
    expect(buyerAccount(buyer(), october(), [], [statement({ voidedAt: 'x' })]).balance).toBe(930 * 48);
  });

  it('finds an overlapping statement for the same co-op only', () => {
    const s = [statement()];
    expect(overlappingStatement(s, 'coop', { from: '2026-10-20', to: '2026-11-19' })).toBeDefined();
    expect(overlappingStatement(s, 'other', OCT)).toBeUndefined();
    expect(overlappingStatement(s, 'coop', { from: '2026-11-01', to: '2026-11-30' })).toBeUndefined();
  });
});

describe('household bills', () => {
  const mama = buyer({ id: 'mama', name: 'Mama Wanjiku', type: 'household', ratePerLitre: 60 });
  const milk = () => Array.from({ length: 5 }, (_, i) => delivery({ buyerId: 'mama', buyerType: 'household', ratePerLitre: 60, litres: 2, date: `2026-10-0${i + 1}` }));

  it('bills every unbilled delivery in the month', () => {
    const draft = draftBill(mama, milk(), [], OCT);
    expect(draft).toMatchObject({ litres: 10, amount: 600, billNumber: 'B202610-001' });
    expect(draft.deliveryIds).toHaveLength(5);
  });

  it('never bills the same delivery twice', () => {
    const ds = milk();
    const bill: CustomerBill = { ...draftBill(mama, ds, [], OCT), id: 'b1', farmId: 'f', synced: false, createdAt: '' };
    expect(unbilledDeliveries(ds, [bill], 'mama', OCT)).toHaveLength(0);
    expect(() => draftBill(mama, ds, [bill], OCT)).toThrow(/no unbilled deliveries/);
    expect(() => assertBillable({ deliveryIds: [ds[0].id] }, [bill])).toThrow(/already on another bill/);
    // Voiding the bill releases its deliveries.
    expect(unbilledDeliveries(ds, [{ ...bill, voidedAt: 'x' }], 'mama', OCT)).toHaveLength(5);
  });

  it('ignores voided deliveries', () => {
    const ds = milk();
    ds[0].voidedAt = 'x';
    expect(draftBill(mama, ds, [], OCT).amount).toBe(480);
  });
});

describe('payment allocations', () => {
  const bill: CustomerBill = {
    id: 'b1', farmId: 'f', buyerId: 'coop', buyerName: 'x', periodFrom: OCT.from, periodTo: OCT.to,
    deliveryIds: [], litres: 10, amount: 1500, billNumber: 'B1', synced: false, createdAt: '',
  };
  const alloc = (over: Partial<PaymentAllocation>): PaymentAllocation => ({
    id: `a${++n}`, farmId: 'f', paymentId: 'p', buyerId: 'coop', targetKind: 'bill', targetId: 'b1', amount: 0, synced: false, createdAt: '', ...over,
  });

  it('tracks partly paid and paid bills and the unallocated remainder', () => {
    const p = payment({ id: 'p', amount: 1000 });
    const ctx = ctxOf({ payments: [p], bills: [bill], allocations: [alloc({ amount: 1000 })] });
    expect(billSettlement(bill, ctx)).toMatchObject({ allocated: 1000, outstanding: 500, status: 'partly_paid' });
    expect(unallocatedAmount(p, ctx)).toBe(0);
    const p2 = payment({ id: 'p2', amount: 2000 });
    const ctx2 = ctxOf({ payments: [p, p2], bills: [bill], allocations: [alloc({ amount: 1000 }), alloc({ paymentId: 'p2', amount: 500 })] });
    expect(billSettlement(bill, ctx2).status).toBe('paid');
    expect(unallocatedAmount(p2, ctx2)).toBe(1500);
  });

  it('caps an allocation at what the payment has left and what the bill still owes', () => {
    const p = payment({ id: 'p', amount: 1000 });
    const ctx = ctxOf({ payments: [p], bills: [bill] });
    const [target] = openTargets('coop', ctx);
    expect(allowedAllocation(p, target, 5000, ctx)).toBe(1000);
    expect(() => allowedAllocation({ ...p, voidedAt: 'x' }, target, 10, ctx)).toThrow(/voided/);
    expect(() => allowedAllocation({ ...p, buyerId: 'mama' }, target, 10, ctx)).toThrow(/same buyer/);
  });

  it('stops counting allocations of voided payments or voided targets', () => {
    const p = payment({ id: 'p', amount: 1000, voidedAt: 'x' });
    const ctx = ctxOf({ payments: [p], bills: [bill], allocations: [alloc({ amount: 1000 })] });
    expect(billSettlement(bill, ctx).status).toBe('unpaid');
    const s = statement();
    const p2 = payment({ id: 'p2', amount: 500 });
    const ctx2 = ctxOf({ payments: [p2], statements: [{ ...s, voidedAt: 'x' }], allocations: [alloc({ paymentId: 'p2', targetKind: 'statement', targetId: s.id, amount: 500 })] });
    expect(unallocatedAmount(p2, ctx2)).toBe(500);
  });

  it('lists open statements and bills oldest first, skipping paid ones', () => {
    const s = statement();
    const p = payment({ id: 'p', amount: statementNet(s) });
    const ctx = ctxOf({ payments: [p], statements: [s], bills: [bill], allocations: [alloc({ targetKind: 'statement', targetId: 's1', amount: statementNet(s) })] });
    expect(openTargets('coop', ctx).map((t) => t.id)).toEqual(['b1']);
    expect(statementSettlement(s, ctx).status).toBe('paid');
  });
});

describe('buyer account statement', () => {
  it('carries the balance forward and lists the month\'s lines with running balances', () => {
    const b = buyer({ id: 'mama', type: 'household', openingBalance: 500, openingBalanceDate: '2026-09-30' });
    const ds = [
      delivery({ buyerId: 'mama', date: '2026-09-15', litres: 2, ratePerLitre: 60 }),
      delivery({ buyerId: 'mama', date: '2026-10-02', litres: 2, ratePerLitre: 60 }),
      delivery({ buyerId: 'mama', date: '2026-10-03', litres: 2, ratePerLitre: 60 }),
      delivery({ buyerId: 'mama', date: '2026-11-01', litres: 2, ratePerLitre: 60 }),
    ];
    const ps = [payment({ buyerId: 'mama', date: '2026-10-20', amount: 400 })];
    const st = buyerStatement(b, ds, ps, [], OCT);
    expect(st.openingBalance).toBe(620); // 500 opening + Sept delivery 120
    expect(st.lines.map((l) => l.kind)).toEqual(['charge', 'charge', 'receipt']);
    expect(st.closingBalance).toBe(620 + 240 - 400);
    expect(st.lines[st.lines.length - 1].balance).toBe(st.closingBalance);
  });
});
