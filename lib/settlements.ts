// Cooperative statements, customer bills, payment allocations and buyer statements.
// Pure functions: storage and UI call these, and tests cover them directly.

import type { Buyer, CoopStatement, CustomerBill, Delivery, PaymentAllocation, PaymentRecord } from '@/types';
import { type DateRange, inRange } from './dates';
import {
  acceptedLitres,
  buyerAccount,
  deliveryCharge,
  roundMoney,
  statementDeductions,
  statementDeliveries,
  statementGross,
  statementNet,
  type LedgerLine,
} from './ledger';

const active = <T extends { voidedAt?: string }>(r: T) => !r.voidedAt;
const round1 = (n: number) => Math.round(n * 10) / 10;

// ------------------------------------------------------------------
// Cooperative statement reconciliation
// ------------------------------------------------------------------

export interface StatementReconciliation {
  deliveryCount: number;
  recordedDelivered: number;
  recordedRejected: number;
  recordedAccepted: number;
  recordedCharges: number;
  statementLitres: number;
  statementGross: number;
  bonus: number;
  deductions: number;
  net: number;
  /** Statement litres − litres the farmer recorded as accepted. Negative = the co-op credited less. */
  litreDifference: number;
  /** Net payout − the farmer's own recorded charges for the period. */
  amountDifference: number;
  matches: boolean;
}

export function reconcileStatement(statement: CoopStatement, deliveries: Delivery[]): StatementReconciliation {
  const period = statementDeliveries(statement, deliveries);
  const recordedAccepted = round1(period.reduce((s, d) => s + acceptedLitres(d), 0));
  const recordedCharges = roundMoney(period.reduce((s, d) => s + deliveryCharge(d), 0));
  const net = statementNet(statement);
  const litreDifference = round1(statement.statementLitres - recordedAccepted);
  return {
    deliveryCount: period.length,
    recordedDelivered: round1(period.reduce((s, d) => s + d.litres, 0)),
    recordedRejected: round1(period.reduce((s, d) => s + (d.rejectedLitres || 0), 0)),
    recordedAccepted,
    recordedCharges,
    statementLitres: statement.statementLitres,
    statementGross: statementGross(statement),
    bonus: statement.bonusKSh || 0,
    deductions: statementDeductions(statement),
    net,
    litreDifference,
    amountDifference: roundMoney(net - recordedCharges),
    matches: Math.abs(litreDifference) < 0.05,
  };
}

/** An active statement for the same cooperative whose period overlaps. */
export function overlappingStatement(
  statements: CoopStatement[],
  buyerId: string,
  range: DateRange,
  excludeId?: string,
): CoopStatement | undefined {
  return statements.find(
    (s) => active(s) && s.id !== excludeId && s.buyerId === buyerId && s.periodFrom <= range.to && s.periodTo >= range.from,
  );
}

// ------------------------------------------------------------------
// Customer bills
// ------------------------------------------------------------------

/** IDs of deliveries already on an active bill. */
export function billedDeliveryIds(bills: CustomerBill[]): Set<string> {
  return new Set(bills.filter(active).flatMap((b) => b.deliveryIds));
}

export function unbilledDeliveries(deliveries: Delivery[], bills: CustomerBill[], buyerId: string, range: DateRange): Delivery[] {
  const billed = billedDeliveryIds(bills);
  return deliveries
    .filter((d) => active(d) && d.buyerId === buyerId && inRange(d.date, range) && !billed.has(d.id))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function nextBillNumber(bills: CustomerBill[], periodFrom: string): string {
  const prefix = `B${periodFrom.slice(0, 7).replace('-', '')}`;
  const used = bills.filter((b) => b.billNumber.startsWith(prefix)).length;
  return `${prefix}-${String(used + 1).padStart(3, '0')}`;
}

export type BillDraft = Omit<CustomerBill, 'id' | 'farmId' | 'synced' | 'createdAt'>;

/**
 * A bill for a buyer's unbilled deliveries in a period. Throws when there is
 * nothing to bill or a delivery is already on another bill.
 */
export function draftBill(
  buyer: Buyer,
  deliveries: Delivery[],
  bills: CustomerBill[],
  range: DateRange,
  dueDate?: string,
): BillDraft {
  const items = unbilledDeliveries(deliveries, bills, buyer.id, range);
  if (items.length === 0) throw new Error(`${buyer.name} has no unbilled deliveries in this period.`);
  return {
    buyerId: buyer.id,
    buyerName: buyer.name,
    periodFrom: range.from,
    periodTo: range.to,
    deliveryIds: items.map((d) => d.id),
    litres: round1(items.reduce((s, d) => s + acceptedLitres(d), 0)),
    amount: roundMoney(items.reduce((s, d) => s + deliveryCharge(d), 0)),
    billNumber: nextBillNumber(bills, range.from),
    dueDate,
  };
}

/** Refuses a bill that includes a delivery already on another active bill. */
export function assertBillable(draft: Pick<CustomerBill, 'deliveryIds'>, bills: CustomerBill[], excludeId?: string) {
  const billed = billedDeliveryIds(bills.filter((b) => b.id !== excludeId));
  const clash = draft.deliveryIds.find((id) => billed.has(id));
  if (clash) throw new Error('One of these deliveries is already on another bill. A delivery can only be billed once.');
}

// ------------------------------------------------------------------
// Payment allocations
// ------------------------------------------------------------------

export interface AllocationContext {
  payments: PaymentRecord[];
  allocations: PaymentAllocation[];
  statements: CoopStatement[];
  bills: CustomerBill[];
}

/** Allocations that count: not voided, and their payment and target are not voided. */
export function effectiveAllocations(ctx: AllocationContext): PaymentAllocation[] {
  const livePayments = new Set(ctx.payments.filter(active).map((p) => p.id));
  const liveTargets = new Set([
    ...ctx.statements.filter(active).map((s) => `statement:${s.id}`),
    ...ctx.bills.filter(active).map((b) => `bill:${b.id}`),
  ]);
  return ctx.allocations.filter(
    (a) => active(a) && livePayments.has(a.paymentId) && liveTargets.has(`${a.targetKind}:${a.targetId}`),
  );
}

export function unallocatedAmount(payment: PaymentRecord, ctx: AllocationContext): number {
  if (payment.voidedAt) return 0;
  const used = effectiveAllocations(ctx).filter((a) => a.paymentId === payment.id).reduce((s, a) => s + a.amount, 0);
  return roundMoney(Math.max(0, payment.amount - used));
}

export type SettlementStatus = 'unpaid' | 'partly_paid' | 'paid' | 'overpaid';

export interface Settlement {
  due: number;
  allocated: number;
  outstanding: number;
  status: SettlementStatus;
}

export function targetSettlement(kind: 'statement' | 'bill', id: string, due: number, ctx: AllocationContext): Settlement {
  const allocated = roundMoney(
    effectiveAllocations(ctx).filter((a) => a.targetKind === kind && a.targetId === id).reduce((s, a) => s + a.amount, 0),
  );
  const outstanding = roundMoney(due - allocated);
  const status: SettlementStatus =
    allocated <= 0 ? 'unpaid' : outstanding > 0.004 ? 'partly_paid' : outstanding < -0.004 ? 'overpaid' : 'paid';
  return { due: roundMoney(due), allocated, outstanding, status };
}

export function statementSettlement(s: CoopStatement, ctx: AllocationContext): Settlement {
  return targetSettlement('statement', s.id, statementNet(s), ctx);
}

export function billSettlement(b: CustomerBill, ctx: AllocationContext): Settlement {
  return targetSettlement('bill', b.id, b.amount, ctx);
}

export interface OpenTarget {
  kind: 'statement' | 'bill';
  id: string;
  buyerId: string;
  label: string;
  outstanding: number;
}

/** Statements and bills of a buyer that still have an amount outstanding, oldest first. */
export function openTargets(buyerId: string, ctx: AllocationContext): OpenTarget[] {
  const statements = ctx.statements
    .filter((s) => active(s) && s.buyerId === buyerId)
    .map((s) => ({ kind: 'statement' as const, id: s.id, buyerId, sortKey: s.periodTo, label: `Statement ${s.statementRef || ''} ${s.periodFrom} to ${s.periodTo}`.replace(/\s+/g, ' '), outstanding: statementSettlement(s, ctx).outstanding }));
  const bills = ctx.bills
    .filter((b) => active(b) && b.buyerId === buyerId)
    .map((b) => ({ kind: 'bill' as const, id: b.id, buyerId, sortKey: b.periodTo, label: `Bill ${b.billNumber} (${b.periodFrom} to ${b.periodTo})`, outstanding: billSettlement(b, ctx).outstanding }));
  return [...statements, ...bills]
    .filter((t) => t.outstanding > 0.004)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ sortKey: _s, ...t }) => t);
}

/**
 * Checks a proposed allocation against what the payment has left and what the
 * target still owes. Returns the amount that can be allocated.
 */
export function allowedAllocation(payment: PaymentRecord, target: OpenTarget, requested: number, ctx: AllocationContext): number {
  if (payment.voidedAt) throw new Error('A voided payment cannot be allocated.');
  if (payment.buyerId !== target.buyerId) throw new Error('A payment can only be allocated to the same buyer\'s statement or bill.');
  const amount = roundMoney(Math.min(requested, unallocatedAmount(payment, ctx), target.outstanding));
  if (amount <= 0) throw new Error('Nothing left to allocate from this payment, or the item is already paid.');
  return amount;
}

// ------------------------------------------------------------------
// Buyer statement (printable account summary)
// ------------------------------------------------------------------

export interface BuyerStatement {
  range: DateRange;
  openingBalance: number;
  lines: LedgerLine[];
  charges: number;
  receipts: number;
  closingBalance: number;
}

export function buyerStatement(
  buyer: Buyer,
  deliveries: Delivery[],
  payments: PaymentRecord[],
  statements: CoopStatement[],
  range: DateRange,
): BuyerStatement {
  const account = buyerAccount(buyer, deliveries, payments, statements);
  const signed = (l: LedgerLine) => (l.kind === 'receipt' ? -l.amount : l.amount);
  const openingBalance = roundMoney(account.lines.filter((l) => l.date < range.from).reduce((sum, l) => sum + signed(l), 0));
  let running = openingBalance;
  const lines = account.lines
    .filter((l) => l.date >= range.from && l.date <= range.to && !(l.kind === 'opening' && l.amount === 0))
    .map((l) => {
      running = roundMoney(running + signed(l));
      return { ...l, balance: running };
    });
  const charges = roundMoney(lines.filter((l) => l.kind !== 'receipt').reduce((sum, l) => sum + l.amount, 0));
  const receipts = roundMoney(lines.filter((l) => l.kind === 'receipt').reduce((sum, l) => sum + l.amount, 0));
  return { range, openingBalance, lines, charges, receipts, closingBalance: roundMoney(openingBalance + charges - receipts) };
}
