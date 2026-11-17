// Cost per litre: what it cost to produce a litre of milk, against what buyers were billed for it.
//
// Rules (build spec, F2; every figure is worked out on the phone from the farm's own records):
//   * Cost per litre = the period's expenses (voided or removed ones never count) divided by the counted litres
//     produced in the period (the one-counted-total rule in lib/milk.ts).
//   * Price per litre = the period's charges for accepted litres divided by the accepted litres, from the ledger
//     (lib/ledger.ts). It uses what was billed, not what was received in cash.
//   * Feed share = expenses in the feed category divided by all the period's expenses.
//   * Shown only when the period has at least MIN_MILK_DAYS days with a milk record and at least one expense.
//     Otherwise the farmer is asked to record milk and expenses for two weeks.
//   * Figures are estimates ("about") and say they rest on the expenses the farmer recorded.
//
// This is a figure for owners and managers on the Farmer plan and above. It uses expenses and billing, so a worker
// is never shown it (Finance is not a worker screen) and the plan gate is checked with the other plan features.

import type { Delivery, ExpenseRecord, MilkEntry } from '@/types';
import { type DateRange, inRange } from './dates';
import { salesInRange } from './ledger';
import { productionInRange } from './milk';

/** Days with a milk record needed in the period before a cost per litre is worth showing. Tune after the pilot. */
export const MIN_MILK_DAYS = 14;

export type CostPerLitreState = 'ready' | 'not_enough';

export interface CostPerLitre {
  state: CostPerLitreState;
  /** Days in the period with milk recorded, and how many expenses were recorded. */
  recordedDays: number;
  expenseCount: number;
  producedLitres: number;
  totalExpenses: number;
  /** Whole shillings, or null until the card is ready. */
  costPerLitre: number | null;
  /** Whole shillings, or null when nothing was billed for accepted milk in the period. */
  pricePerLitre: number | null;
  /** Whole percent of all expenses, or null until the card is ready. */
  feedSharePercent: number | null;
  /** True when it cost more to produce a litre than it was billed for. Said plainly, never as an alarm. */
  costHigherThanPrice: boolean;
  /** How many shillings a litre the cost is above the price (whole shillings; 0 when it is not). */
  costAbovePrice: number;
}

const isCounted = (expense: ExpenseRecord) => !(expense as { voidedAt?: string }).voidedAt;

export function costPerLitre(milk: MilkEntry[], deliveries: Delivery[], expenses: ExpenseRecord[], range: DateRange): CostPerLitre {
  const { litres: producedLitres, recordedDays } = productionInRange(milk, range);
  const counted = expenses.filter((e) => isCounted(e) && inRange(e.date, range));
  const totalExpenses = counted.reduce((sum, e) => sum + e.amount, 0);
  const sales = salesInRange(deliveries, range);

  const base: CostPerLitre = {
    state: 'not_enough', recordedDays, expenseCount: counted.length, producedLitres, totalExpenses,
    costPerLitre: null, pricePerLitre: null, feedSharePercent: null, costHigherThanPrice: false, costAbovePrice: 0,
  };
  if (recordedDays < MIN_MILK_DAYS || counted.length === 0 || producedLitres <= 0) return base;

  const cost = Math.round(totalExpenses / producedLitres);
  const price = sales.acceptedLitres > 0 ? Math.round(sales.billed / sales.acceptedLitres) : null;
  const feed = counted.filter((e) => e.category === 'feed').reduce((sum, e) => sum + e.amount, 0);
  return {
    ...base,
    state: 'ready',
    costPerLitre: cost,
    pricePerLitre: price,
    feedSharePercent: totalExpenses > 0 ? Math.round((feed / totalExpenses) * 100) : null,
    costHigherThanPrice: price !== null && cost > price,
    costAbovePrice: price !== null && cost > price ? cost - price : 0,
  };
}
