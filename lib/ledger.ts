import type { Buyer, CoopStatement, Delivery, ExpenseRecord, PaymentRecord } from '@/types';
import { type DateRange, inRange } from './dates';

// Buyer ledger rules:
// - balance = opening balance + charges for accepted milk ± statement adjustments − receipts.
//   Positive = the buyer owes the farm; negative = advance held for the buyer.
// - A charge is accepted litres × rate ± explicit adjustments. Rejected litres are
//   never billed.
// - A cooperative statement is the authority for its period: an adjustment line
//   brings the farmer's recorded charges for that period to the statement's net
//   payout (gross − itemised deductions + bonus). The farmer's own delivery lines
//   stay visible for comparison.
// - Money received when a delivery is recorded is stored once, as a receipt linked
//   to that delivery. `Delivery.amountPaid` is never counted on its own.
// - Voided records stay visible but are excluded from every total.

export const LEDGER_VERSION = 1;

export const roundMoney = (n: number) => Math.round(n * 100) / 100;
const active = <T extends { voidedAt?: string }>(r: T) => !r.voidedAt;

export function acceptedLitres(d: Pick<Delivery, 'litres' | 'rejectedLitres'>): number {
  return Math.max(0, Math.round((d.litres - (d.rejectedLitres || 0)) * 10) / 10);
}

export function deliveryCharge(d: Pick<Delivery, 'litres' | 'rejectedLitres' | 'ratePerLitre' | 'adjustmentKSh'>): number {
  return roundMoney(Math.max(0, acceptedLitres(d) * d.ratePerLitre + (d.adjustmentKSh || 0)));
}

export function statementGross(s: Pick<CoopStatement, 'statementLitres' | 'ratePerLitre'>): number {
  return roundMoney(s.statementLitres * s.ratePerLitre);
}

export function statementDeductions(s: Pick<CoopStatement, 'deductions'>): number {
  return roundMoney(s.deductions.reduce((sum, d) => sum + d.amount, 0));
}

/** What the cooperative says it will pay for the period. */
export function statementNet(s: Pick<CoopStatement, 'statementLitres' | 'ratePerLitre' | 'bonusKSh' | 'deductions'>): number {
  return roundMoney(statementGross(s) + (s.bonusKSh || 0) - statementDeductions(s));
}

/** Active deliveries to the statement's cooperative within its period. */
export function statementDeliveries(s: Pick<CoopStatement, 'buyerId' | 'periodFrom' | 'periodTo'>, deliveries: Delivery[]): Delivery[] {
  return deliveries.filter((d) => active(d) && d.buyerId === s.buyerId && inRange(d.date, { from: s.periodFrom, to: s.periodTo }));
}

export type LedgerLine =
  | { kind: 'opening'; date: string; amount: number; balance: number }
  | { kind: 'charge'; date: string; amount: number; balance: number; delivery: Delivery }
  | { kind: 'statement'; date: string; amount: number; balance: number; statement: CoopStatement; net: number; recordedCharges: number }
  | { kind: 'receipt'; date: string; amount: number; balance: number; payment: PaymentRecord };

export interface BuyerAccount {
  buyerId: string;
  opening: number;
  /** Charges for milk, after statement adjustments. */
  charged: number;
  received: number;
  balance: number;
  lines: LedgerLine[]; // chronological
}

export function buyerAccount(
  buyer: Buyer,
  deliveries: Delivery[],
  payments: PaymentRecord[],
  statements: CoopStatement[] = [],
): BuyerAccount {
  const opening = roundMoney(buyer.openingBalance ?? 0);
  type Item = { date: string; order: string; charge: number; receipt: number; line: (balance: number) => LedgerLine };
  const items: Item[] = [
    ...deliveries
      .filter((d) => d.buyerId === buyer.id && active(d))
      .map((d): Item => {
        const amount = deliveryCharge(d);
        return { date: d.date, order: `0${d.createdAt}`, charge: amount, receipt: 0, line: (balance) => ({ kind: 'charge', date: d.date, amount, balance, delivery: d }) };
      }),
    ...statements
      .filter((s) => s.buyerId === buyer.id && active(s))
      .map((s): Item => {
        const net = statementNet(s);
        const recordedCharges = roundMoney(statementDeliveries(s, deliveries).reduce((sum, d) => sum + deliveryCharge(d), 0));
        const amount = roundMoney(net - recordedCharges);
        // Placed after every delivery of the period it settles.
        return { date: s.periodTo, order: `1${s.createdAt}`, charge: amount, receipt: 0, line: (balance) => ({ kind: 'statement', date: s.periodTo, amount, balance, statement: s, net, recordedCharges }) };
      }),
    ...payments
      .filter((p) => p.buyerId === buyer.id && active(p))
      .map((p): Item => ({ date: p.date, order: `2${p.createdAt}`, charge: 0, receipt: p.amount, line: (balance) => ({ kind: 'receipt', date: p.date, amount: p.amount, balance, payment: p }) })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.order.localeCompare(b.order));

  let balance = opening;
  const lines: LedgerLine[] = [{ kind: 'opening', date: buyer.openingBalanceDate ?? buyer.createdAt.slice(0, 10), amount: opening, balance }];
  let charged = 0;
  let received = 0;
  for (const item of items) {
    balance = roundMoney(balance + item.charge - item.receipt);
    charged += item.charge;
    received += item.receipt;
    lines.push(item.line(balance));
  }
  return { buyerId: buyer.id, opening, charged: roundMoney(charged), received: roundMoney(received), balance, lines };
}

/** Buyers with `currentBalance` replaced by the ledger balance, for display. */
export function withLedgerBalances(buyers: Buyer[], deliveries: Delivery[], payments: PaymentRecord[], statements: CoopStatement[] = []): Buyer[] {
  return buyers.map((b) => ({ ...b, currentBalance: buyerAccount(b, deliveries, payments, statements).balance }));
}

export interface ReceivablesSummary {
  owedToFarm: number; // sum of positive balances
  advancesHeld: number; // sum of negative balances, as a positive number
  buyersOwing: number;
  buyersInAdvance: number;
}

export function receivables(buyers: Buyer[], deliveries: Delivery[], payments: PaymentRecord[], statements: CoopStatement[] = []): ReceivablesSummary {
  return summariseBalances(buyers.map((b) => buyerAccount(b, deliveries, payments, statements).balance));
}

/** Totals for balances already derived from the ledger (e.g. `withLedgerBalances`). */
export function summariseBalances(balances: number[]): ReceivablesSummary {
  const summary: ReceivablesSummary = { owedToFarm: 0, advancesHeld: 0, buyersOwing: 0, buyersInAdvance: 0 };
  for (const balance of balances) {
    if (balance > 0) { summary.owedToFarm += balance; summary.buyersOwing += 1; }
    if (balance < 0) { summary.advancesHeld -= balance; summary.buyersInAdvance += 1; }
  }
  summary.owedToFarm = roundMoney(summary.owedToFarm);
  summary.advancesHeld = roundMoney(summary.advancesHeld);
  return summary;
}

export function cashReceived(payments: PaymentRecord[], range: DateRange) {
  const counted = payments.filter((p) => active(p) && inRange(p.date, range));
  return { amount: roundMoney(counted.reduce((s, p) => s + p.amount, 0)), count: counted.length };
}

export function salesInRange(deliveries: Delivery[], range: DateRange) {
  const counted = deliveries.filter((d) => active(d) && inRange(d.date, range));
  return {
    count: counted.length,
    deliveredLitres: Math.round(counted.reduce((s, d) => s + d.litres, 0) * 10) / 10,
    rejectedLitres: Math.round(counted.reduce((s, d) => s + (d.rejectedLitres || 0), 0) * 10) / 10,
    acceptedLitres: Math.round(counted.reduce((s, d) => s + acceptedLitres(d), 0) * 10) / 10,
    billed: roundMoney(counted.reduce((s, d) => s + deliveryCharge(d), 0)),
  };
}

export function expensesInRange(expenses: ExpenseRecord[], range: DateRange) {
  const counted = expenses.filter((e) => inRange(e.date, range));
  return { amount: roundMoney(counted.reduce((s, e) => s + e.amount, 0)), count: counted.length };
}

const normaliseRef = (ref?: string) => (ref || '').replace(/\s+/g, '').toUpperCase();

/** Active payments already using this reference (e.g. an M-Pesa code). */
export function paymentsWithReference(payments: PaymentRecord[], ref: string | undefined, excludeId?: string): PaymentRecord[] {
  const key = normaliseRef(ref);
  if (!key) return [];
  return payments.filter((p) => active(p) && p.id !== excludeId && normaliseRef(p.referenceNo) === key);
}

/** Active payments that look like the same money recorded twice. */
export function possibleDuplicatePayments(payments: PaymentRecord[]): Set<string> {
  const flagged = new Set<string>();
  const live = payments.filter(active);
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i];
      const b = live[j];
      const sameRef = normaliseRef(a.referenceNo) !== '' && normaliseRef(a.referenceNo) === normaliseRef(b.referenceNo);
      const sameMoney = a.buyerId === b.buyerId && a.date === b.date && roundMoney(a.amount) === roundMoney(b.amount);
      if (sameRef || sameMoney) { flagged.add(a.id); flagged.add(b.id); }
    }
  }
  return flagged;
}

/** Deterministic ID for the receipt created from money paid at delivery. */
export const deliveryPaymentId = (deliveryId: string) => `pay-dlv-${deliveryId}`;

export function receiptForDelivery(delivery: Delivery, createdAt: string): PaymentRecord | null {
  if (!(delivery.amountPaid > 0)) return null;
  return {
    id: deliveryPaymentId(delivery.id),
    farmId: delivery.farmId,
    buyerId: delivery.buyerId,
    buyerName: delivery.buyerName,
    date: delivery.date,
    amount: roundMoney(delivery.amountPaid),
    paymentMethod: 'cash',
    notes: 'Paid at delivery',
    synced: false,
    createdAt,
    source: 'delivery',
    deliveryId: delivery.id,
    ...(delivery.voidedAt ? { voidedAt: delivery.voidedAt, voidReason: 'Delivery voided' } : {}),
  };
}

/**
 * One-time conversion of legacy running balances into the ledger.
 *
 * Legacy data kept a mutable `currentBalance` that was changed on every delivery
 * and payment, and kept delivery-time payments only on the delivery. This:
 * 1. creates one linked receipt for each delivery-time payment that has none;
 * 2. sets `openingBalance` so the ledger reproduces the balance the farmer saw.
 *    That opening amount captures anything recorded before the ledger existed
 *    (including earlier clamping errors) and is shown for review, never hidden.
 * Running it again changes nothing.
 */
export function migrateLegacyLedger(
  buyers: Buyer[],
  deliveries: Delivery[],
  payments: PaymentRecord[],
  nowIso: string,
): { buyers: Buyer[]; payments: PaymentRecord[]; changed: boolean } {
  let changed = false;
  const paymentIds = new Set(payments.map((p) => p.id));
  const linked = new Set(payments.filter((p) => p.deliveryId).map((p) => p.deliveryId));
  const legacyBuyerIds = new Set(buyers.filter((b) => b.ledgerVersion !== LEDGER_VERSION).map((b) => b.id));
  const nextPayments = [...payments];
  for (const d of deliveries) {
    if (!legacyBuyerIds.has(d.buyerId) || linked.has(d.id)) continue;
    const receipt = receiptForDelivery(d, nowIso);
    if (receipt && !paymentIds.has(receipt.id)) {
      nextPayments.push(receipt);
      paymentIds.add(receipt.id);
      changed = true;
    }
  }
  const nextBuyers = buyers.map((b) => {
    if (b.ledgerVersion === LEDGER_VERSION) return b;
    changed = true;
    const withoutOpening = buyerAccount({ ...b, openingBalance: 0 }, deliveries, nextPayments).balance;
    return {
      ...b,
      openingBalance: roundMoney((b.currentBalance || 0) - withoutOpening),
      openingBalanceDate: b.openingBalanceDate ?? b.createdAt.slice(0, 10),
      ledgerVersion: LEDGER_VERSION,
    };
  });
  return { buyers: nextBuyers, payments: nextPayments, changed };
}
