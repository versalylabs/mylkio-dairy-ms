// Money owed: how long each buyer's unpaid money has been waiting, and what co-ops take off before they pay.
// Built only from the buyer ledger (lib/ledger.ts), so the totals always agree with the buyer balances.
// Pure functions: the Sales screen calls them and tests/money-owed.test.ts covers them.

import type { Buyer, CoopStatement, Delivery, PaymentRecord } from '@/types';
import { addDays, daysBetween, inRange, monthRange, type DateRange } from './dates';
import { buyerAccount, roundMoney, statementGross } from './ledger';

const active = <T extends { voidedAt?: string }>(r: T) => !r.voidedAt;

/** Days after its due date that a co-op is assumed to pay when the statement gives no payment date. */
export const COOP_PAY_DAYS = 15;

/** When a statement's money is due: the date the co-op printed, or a fortnight after the period ends. */
export const statementDueDate = (s: Pick<CoopStatement, 'periodTo' | 'expectedPaymentDate'>) => s.expectedPaymentDate || addDays(s.periodTo, COOP_PAY_DAYS);

/**
 * When the money for a delivery is due. A delivery covered by a co-op statement is due when that statement is;
 * otherwise it follows the buyer's payment cycle (monthly when not set, the usual co-op and hotel terms).
 */
export function deliveryDueDate(delivery: Pick<Delivery, 'date' | 'buyerId'>, buyer: Pick<Buyer, 'paymentCycle'>, statements: CoopStatement[]): string {
  const statement = statements.find((s) => active(s) && s.buyerId === delivery.buyerId && inRange(delivery.date, { from: s.periodFrom, to: s.periodTo }));
  if (statement) return statementDueDate(statement);
  switch (buyer.paymentCycle) {
    case 'daily': case 'advance': return delivery.date;
    case 'weekly': return addDays(delivery.date, 7);
    default: return addDays(monthRange(delivery.date).to, COOP_PAY_DAYS);
  }
}

/** One amount still unpaid, with when it was earned and when it should have been paid. */
export interface UnpaidItem {
  date: string;
  dueDate: string;
  amount: number;
  /** Days past the due date; 0 or less means not yet due. */
  daysLate: number;
}

export type AgeBucket = 'notDue' | 'late1to30' | 'late31to60' | 'late61to90' | 'late90plus';
export const AGE_BUCKETS: AgeBucket[] = ['notDue', 'late1to30', 'late31to60', 'late61to90', 'late90plus'];

export const ageBucket = (daysLate: number): AgeBucket =>
  daysLate <= 0 ? 'notDue' : daysLate <= 30 ? 'late1to30' : daysLate <= 60 ? 'late31to60' : daysLate <= 90 ? 'late61to90' : 'late90plus';

export interface MoneyOwed {
  buyerId: string;
  buyerName: string;
  /** The ledger balance: what the buyer owes (negative = an advance the farm holds). */
  balance: number;
  unpaid: UnpaidItem[];
  overdue: number;
  buckets: Record<AgeBucket, number>;
  oldestUnpaidDate: string | null;
  /** The longest any unpaid amount is past its due date (0 when nothing is late). */
  mostDaysLate: number;
}

/**
 * What a buyer still owes, oldest first. Payments and credits (a statement that pays less than the farmer recorded,
 * an advance) clear the oldest amounts first, the way a buyer settles an account. The unpaid items always add up to
 * the ledger balance when the buyer owes money.
 */
export function moneyOwed(buyer: Buyer, deliveries: Delivery[], payments: PaymentRecord[], statements: CoopStatement[], today: string): MoneyOwed {
  const account = buyerAccount(buyer, deliveries, payments, statements);
  const open: UnpaidItem[] = [];
  let credit = 0; // money received ahead of anything owed
  const owe = (date: string, dueDate: string, amount: number) => {
    const used = Math.min(credit, amount);
    credit = roundMoney(credit - used);
    const left = roundMoney(amount - used);
    if (left > 0.004) open.push({ date, dueDate, amount: left, daysLate: daysBetween(dueDate, today) });
  };
  const pay = (amount: number) => {
    let left = amount;
    while (left > 0.004 && open.length) {
      const first = open[0];
      const used = Math.min(first.amount, left);
      first.amount = roundMoney(first.amount - used);
      left = roundMoney(left - used);
      if (first.amount <= 0.004) open.shift();
    }
    credit = roundMoney(credit + left);
  };

  for (const line of account.lines) {
    const amount = line.kind === 'receipt' ? -line.amount : line.amount;
    if (amount === 0) continue;
    if (amount < 0) { pay(-amount); continue; }
    const dueDate =
      line.kind === 'charge' ? deliveryDueDate(line.delivery, buyer, statements)
      : line.kind === 'statement' ? statementDueDate(line.statement)
      : line.date; // an opening balance was already due when the ledger started
    owe(line.date, dueDate, amount);
  }

  const buckets = Object.fromEntries(AGE_BUCKETS.map((b) => [b, 0])) as Record<AgeBucket, number>;
  for (const item of open) buckets[ageBucket(item.daysLate)] = roundMoney(buckets[ageBucket(item.daysLate)] + item.amount);
  const late = open.filter((i) => i.daysLate > 0);
  return {
    buyerId: buyer.id,
    buyerName: buyer.name,
    balance: account.balance,
    unpaid: open,
    overdue: roundMoney(late.reduce((s, i) => s + i.amount, 0)),
    buckets,
    oldestUnpaidDate: open[0]?.date ?? null,
    mostDaysLate: late.reduce((m, i) => Math.max(m, i.daysLate), 0),
  };
}

export interface MoneyOwedSummary {
  buyers: MoneyOwed[];
  owed: number;
  overdue: number;
  buckets: Record<AgeBucket, number>;
}

/** Every buyer who owes something, the latest payer first, with farm totals. */
export function moneyOwedSummary(buyers: Buyer[], deliveries: Delivery[], payments: PaymentRecord[], statements: CoopStatement[], today: string): MoneyOwedSummary {
  const rows = buyers
    .map((b) => moneyOwed(b, deliveries, payments, statements, today))
    .filter((r) => r.unpaid.length > 0)
    .sort((a, b) => b.mostDaysLate - a.mostDaysLate || b.overdue - a.overdue || b.balance - a.balance);
  const buckets = Object.fromEntries(AGE_BUCKETS.map((k) => [k, roundMoney(rows.reduce((s, r) => s + r.buckets[k], 0))])) as Record<AgeBucket, number>;
  return {
    buyers: rows,
    owed: roundMoney(rows.reduce((s, r) => s + r.unpaid.reduce((t, i) => t + i.amount, 0), 0)),
    overdue: roundMoney(rows.reduce((s, r) => s + r.overdue, 0)),
    buckets,
  };
}

export interface DeductionTotal {
  label: string;
  amount: number;
  /** Share of the gross milk value of the statements counted, as a whole percent. */
  percentOfGross: number;
}

export interface DeductionsSummary {
  statementCount: number;
  gross: number;
  deducted: number;
  percentOfGross: number;
  lines: DeductionTotal[];
}

const labelKey = (label: string) => label.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * What co-ops took off before paying, over the statements whose period ends in the range, grouped by deduction name
 * ("Transport" and "transport " count as one), biggest first.
 */
export function deductionsSummary(statements: CoopStatement[], range: DateRange): DeductionsSummary {
  const counted = statements.filter((s) => active(s) && inRange(s.periodTo, range));
  const gross = roundMoney(counted.reduce((s, st) => s + statementGross(st), 0));
  const byLabel = new Map<string, { label: string; amount: number }>();
  for (const st of counted) {
    for (const d of st.deductions) {
      const key = labelKey(d.label);
      if (!key || !(d.amount > 0)) continue;
      const row = byLabel.get(key) ?? { label: d.label.trim().replace(/\s+/g, ' '), amount: 0 };
      row.amount = roundMoney(row.amount + d.amount);
      byLabel.set(key, row);
    }
  }
  const pct = (n: number) => (gross > 0 ? Math.round((n / gross) * 100) : 0);
  const lines = [...byLabel.values()].sort((a, b) => b.amount - a.amount).map((r) => ({ ...r, percentOfGross: pct(r.amount) }));
  const deducted = roundMoney(lines.reduce((s, l) => s + l.amount, 0));
  return { statementCount: counted.length, gross, deducted, percentOfGross: pct(deducted), lines };
}
