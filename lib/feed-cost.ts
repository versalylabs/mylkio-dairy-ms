// Feed cost: what feed costs per litre of milk, the margin left after feed, and where the feed money went.
// Feed is 55–70% of a Kenyan dairy farm's costs, so this is the figure that decides the farm's profit.
//
// Rules:
//   * Feed = expenses in the feed category for the period. Each is a feed type: the one picked when it was recorded,
//     or, for older records, a type read from its description ("dairy meal", "hay", ...), else "Other feed".
//   * Feed cost per litre = feed spend / counted litres produced (the one-counted-total rule in lib/milk.ts).
//   * Margin over feed = (price billed per accepted litre − feed cost per litre) × litres produced. It uses the price
//     from the ledger (lib/ledger.ts), like cost per litre. Milk the farm used itself is valued at the same price.
//   * Shown only when the period has at least MIN_MILK_DAYS days with milk recorded and at least one feed expense.
//   * When a feed expense gives a quantity, the card can say what one unit cost ("KSh 3,500 a bag").
// Figures are estimates from the farmer's own records. No ration advice: Mylkio records and compares, it does not
// tell a farmer what to feed.

import type { Delivery, ExpenseRecord, FeedType, FeedUnit, MilkEntry } from '@/types';
import { type DateRange, inRange } from './dates';
import { MIN_MILK_DAYS } from './cost-per-litre';
import { salesInRange } from './ledger';
import { productionInRange } from './milk';

export const FEED_TYPES: FeedType[] = ['dairy_meal', 'hay', 'silage', 'fodder', 'minerals', 'other'];
export const FEED_UNITS: FeedUnit[] = ['bag', 'bale', 'kg', 'tonne', 'load'];

const KEYWORDS: [FeedType, RegExp][] = [
  ['dairy_meal', /dairy\s*meal|meal|concentrate|pellet|cake|bran|pollard|maclick|mash|chakula cha ng/i],
  ['hay', /hay|rhodes|boma|lucerne|nyasi kavu/i],
  ['silage', /silage|sileji/i],
  ['fodder', /napier|fodder|maize stover|stover|sweet potato vine|desmodium|calliandra|majani/i],
  ['minerals', /mineral|salt|lick|chumvi/i],
];

/** The feed type of a feed expense: the one recorded, else read from the description. */
export function feedTypeOf(expense: Pick<ExpenseRecord, 'feedType' | 'description'>): FeedType {
  if (expense.feedType) return expense.feedType;
  return KEYWORDS.find(([, re]) => re.test(expense.description))?.[0] ?? 'other';
}

const counted = (e: ExpenseRecord) => !(e as { voidedAt?: string }).voidedAt;

export interface FeedLine {
  type: FeedType;
  amount: number;
  /** Whole percent of all feed spend. */
  share: number;
  /** What one unit cost, when every quantity recorded for this type uses the same unit. */
  unitPrice: { unit: FeedUnit; price: number; quantity: number } | null;
}

export interface FeedCost {
  state: 'ready' | 'not_enough';
  recordedDays: number;
  producedLitres: number;
  feedSpend: number;
  feedExpenseCount: number;
  /** Whole shillings a litre, or null until ready. */
  feedPerLitre: number | null;
  pricePerLitre: number | null;
  /** Price per litre minus feed per litre (whole shillings; negative when feed costs more than milk earns). */
  marginPerLitre: number | null;
  /** Margin over feed for all the milk produced in the period (whole shillings). */
  marginOverFeed: number | null;
  lines: FeedLine[];
}

export function feedCost(milk: MilkEntry[], deliveries: Delivery[], expenses: ExpenseRecord[], range: DateRange): FeedCost {
  const { litres: producedLitres, recordedDays } = productionInRange(milk, range);
  const feed = expenses.filter((e) => counted(e) && e.category === 'feed' && inRange(e.date, range));
  const feedSpend = feed.reduce((s, e) => s + e.amount, 0);

  const byType = new Map<FeedType, ExpenseRecord[]>();
  for (const e of feed) byType.set(feedTypeOf(e), [...(byType.get(feedTypeOf(e)) ?? []), e]);
  const lines: FeedLine[] = [...byType.entries()]
    .map(([type, items]) => {
      const amount = items.reduce((s, e) => s + e.amount, 0);
      const withQty = items.filter((e) => e.quantity && e.quantity > 0 && e.unit);
      const units = new Set(withQty.map((e) => e.unit));
      const quantity = withQty.reduce((s, e) => s + (e.quantity ?? 0), 0);
      const spentOnQty = withQty.reduce((s, e) => s + e.amount, 0);
      return {
        type,
        amount,
        share: feedSpend > 0 ? Math.round((amount / feedSpend) * 100) : 0,
        unitPrice: units.size === 1 && quantity > 0 ? { unit: [...units][0] as FeedUnit, price: Math.round(spentOnQty / quantity), quantity } : null,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const base: FeedCost = {
    state: 'not_enough', recordedDays, producedLitres, feedSpend, feedExpenseCount: feed.length,
    feedPerLitre: null, pricePerLitre: null, marginPerLitre: null, marginOverFeed: null, lines,
  };
  if (recordedDays < MIN_MILK_DAYS || feed.length === 0 || producedLitres <= 0) return base;

  const sales = salesInRange(deliveries, range);
  const feedPerLitre = Math.round(feedSpend / producedLitres);
  const pricePerLitre = sales.acceptedLitres > 0 ? Math.round(sales.billed / sales.acceptedLitres) : null;
  const marginPerLitre = pricePerLitre === null ? null : pricePerLitre - feedPerLitre;
  return {
    ...base,
    state: 'ready',
    feedPerLitre,
    pricePerLitre,
    marginPerLitre,
    marginOverFeed: pricePerLitre === null ? null : Math.round(sales.billed / sales.acceptedLitres * producedLitres - feedSpend),
  };
}
