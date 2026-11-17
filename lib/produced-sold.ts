// Produced vs sold: how much milk was produced, how much went to buyers, and what was not sold.
//
// Rules (build spec, F1; every figure is worked out on the phone from the farm's own records):
//   * Produced = the counted milk for the period (the one-counted-total rule in lib/milk.ts; voided milk never counts).
//   * Sold = litres delivered to buyers in the period, accepted plus rejected, from deliveries that are not voided.
//   * Not sold = produced minus sold, and only where the period has a milk record. With no milk recorded there is
//     nothing to compare against, so no "not sold" figure is invented.
//   * If more was sold than was recorded, no negative number is shown: the farmer is asked to check the milk record.
//   * The optional split of what was not sold (home use, calves, spoiled, other) is its own record, one per date. It is
//     never required and never changes produced or sold: it only says where the unsold milk went.

import type { Delivery, MilkEntry, MilkUse } from '@/types';
import { type DateRange, inRange } from './dates';
import { salesInRange } from './ledger';
import { isActive, productionInRange } from './milk';

export const MILK_USE_KINDS = ['homeUse', 'calves', 'spoiled', 'other'] as const;
export type MilkUseKind = (typeof MILK_USE_KINDS)[number];

/** Litres of difference that count as "the same" (rounding of recorded figures). */
export const SOLD_TOLERANCE_LITRES = 0.05;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** One split record per date, so two phones saving the same day's split land on the same record. */
export const milkUseId = (date: string) => `milkuse-${date}`;

export type ProducedSoldState = 'no_milk' | 'ok' | 'sold_more';

export interface ProducedSold {
  produced: number;
  sold: number;
  /** Null when there is nothing to compare (no milk recorded) or more was sold than recorded. */
  notSold: number | null;
  recordedDays: number;
  state: ProducedSoldState;
}

export function producedVsSold(milk: MilkEntry[], deliveries: Delivery[], range: DateRange): ProducedSold {
  const { litres: produced, recordedDays } = productionInRange(milk, range);
  const sold = salesInRange(deliveries, range).deliveredLitres;
  if (recordedDays === 0) return { produced, sold, notSold: null, recordedDays, state: 'no_milk' };
  if (sold > produced + SOLD_TOLERANCE_LITRES) return { produced, sold, notSold: null, recordedDays, state: 'sold_more' };
  return { produced, sold, notSold: round1(Math.max(0, produced - sold)), recordedDays, state: 'ok' };
}

export type MilkUseSplit = Record<MilkUseKind, number>;

export const emptySplit = (): MilkUseSplit => ({ homeUse: 0, calves: 0, spoiled: 0, other: 0 });

export const splitTotal = (split: Partial<MilkUseSplit>) => round1(MILK_USE_KINDS.reduce((sum, kind) => sum + Math.max(0, Number(split[kind]) || 0), 0));

/** Clean what a person typed: whole tenths of a litre, never negative, never more than 100,000 L. */
export function cleanSplit(input: Partial<Record<MilkUseKind, number | string>>): MilkUseSplit {
  const out = emptySplit();
  for (const kind of MILK_USE_KINDS) {
    const value = Number(input[kind]);
    out[kind] = Number.isFinite(value) && value > 0 ? round1(Math.min(value, 100_000)) : 0;
  }
  return out;
}

export interface SplitSummary {
  byKind: MilkUseSplit;
  assigned: number;
  /** What was not sold and is not yet put under any heading (0 when nothing is left, or when the figure is unknown). */
  unassigned: number;
}

/**
 * What the farmer has said about the unsold milk in a period. Only records for dates that have milk recorded count,
 * and voided milk does not make a date count. `notSold` is the figure from producedVsSold, so a split is always shown
 * against the milk it explains.
 */
export function splitInRange(uses: MilkUse[], milk: MilkEntry[], range: DateRange, notSold: number | null): SplitSummary {
  const recorded = new Set(milk.filter(isActive).map((entry) => entry.date));
  const byKind = emptySplit();
  for (const use of uses) {
    if (!inRange(use.date, range) || !recorded.has(use.date)) continue;
    for (const kind of MILK_USE_KINDS) byKind[kind] = round1(byKind[kind] + Math.max(0, Number(use[kind]) || 0));
  }
  const assigned = splitTotal(byKind);
  return { byKind, assigned, unassigned: notSold === null ? 0 : round1(Math.max(0, notSold - assigned)) };
}

/** The split saved for one date, if any. */
export const milkUseFor = (uses: MilkUse[], date: string): MilkUse | undefined => uses.find((use) => use.date === date);
