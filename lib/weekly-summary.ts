// The weekly owner summary: how the farm did last week (Monday to Sunday, Africa/Nairobi), worked out on the phone from
// the farm's own records, the same way as Home and Finance, so the figures always match them.
//
//   * Milk produced (counted milk, the one-counted-total rule) and its change against the week before.
//   * Milk sold (litres delivered, accepted plus rejected) and not sold, with the same rules as "Produced vs sold".
//   * Money billed (accepted litres at the rate recorded) and money received (cash, from payments), kept apart.
//   * Buyers owing now, with the total, from the ledger balances.
//   * Reminders overdue today, by count.
//   * Who recorded what: for each person on a team farm, how many milk, health and breeding records they saved last
//     week. A record carries the name of whoever saved it (`recordedBy`, stamped when it is saved on that person's
//     phone), because the phone's copy of a record does not carry the server's `updated_by`. Records saved before this
//     existed have no name and are not counted. A farm with no team gets no such lines.
//
// Owners and managers on the Farm Pro plan and above. A worker never sees it: it is built from money.

import type { BreedingEvent, Delivery, FarmReminder, HealthEvent, MilkEntry, PaymentRecord, RecordedBy } from '@/types';
import { type DateRange, addDays, toFarmDate } from './dates';
import { cashReceived, salesInRange, summariseBalances } from './ledger';
import { isReminderDone } from './herd-care';
import { productionInRange } from './milk';
import { producedVsSold, type ProducedSoldState } from './produced-sold';

/** How many weeks back the app looks to tell whether this farm has a team (two or more people saving records). */
export const TEAM_LOOKBACK_WEEKS = 8;

/** 0 = Monday ... 6 = Sunday, for a YYYY-MM-DD farm date. */
export function weekdayIndex(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export const mondayOf = (ymd: string): string => addDays(ymd, -weekdayIndex(ymd));

/** The last full week, Monday to Sunday, as at `today`. On a Monday it is the week that just ended. */
export function lastWeekRange(today: string): DateRange {
  const monday = mondayOf(today);
  return { from: addDays(monday, -7), to: addDays(monday, -1) };
}

export interface RecorderRow { id: string; name: string; milk: number; health: number; breeding: number; total: number }

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  produced: number;
  previousProduced: number;
  /** Whole percent against the week before, or null when the week before had no milk recorded. */
  changePercent: number | null;
  sold: number;
  notSold: number | null;
  soldState: ProducedSoldState;
  billed: number;
  received: number;
  owedTotal: number;
  buyersOwing: number;
  overdueReminders: number;
  /** Null for a farm with no team (nothing to compare), otherwise the people who saved records last week. */
  recorders: RecorderRow[] | null;
  /** True when anything at all was recorded last week; otherwise the card is not worth showing. */
  hasActivity: boolean;
}

const inWeek = (record: { createdAt: string }, range: DateRange) => {
  const day = toFarmDate(record.createdAt);
  return day >= range.from && day <= range.to;
};

type Stamped = { recordedBy?: RecordedBy; createdAt: string; voidedAt?: string };

export function recordersSummary(
  records: { milk: (MilkEntry & Stamped)[]; health: (HealthEvent & Stamped)[]; breeding: (BreedingEvent & Stamped)[] },
  week: DateRange,
  today: string,
): RecorderRow[] | null {
  const lookback: DateRange = { from: addDays(week.to, -7 * TEAM_LOOKBACK_WEEKS + 1), to: today };
  const people = new Set<string>();
  for (const list of [records.milk, records.health, records.breeding] as Stamped[][]) {
    for (const r of list) if (r.recordedBy && !r.voidedAt && inWeek(r, lookback)) people.add(r.recordedBy.id);
  }
  if (people.size < 2) return null;

  const rows = new Map<string, RecorderRow>();
  const add = (kind: 'milk' | 'health' | 'breeding', list: Stamped[]) => {
    for (const r of list) {
      if (!r.recordedBy || r.voidedAt || !inWeek(r, week)) continue;
      const row = rows.get(r.recordedBy.id) ?? { id: r.recordedBy.id, name: r.recordedBy.name, milk: 0, health: 0, breeding: 0, total: 0 };
      row[kind] += 1; row.total += 1;
      rows.set(r.recordedBy.id, row);
    }
  };
  add('milk', records.milk); add('health', records.health); add('breeding', records.breeding);
  return [...rows.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

export function weeklySummary(input: {
  milk: MilkEntry[];
  deliveries: Delivery[];
  payments: PaymentRecord[];
  health: HealthEvent[];
  breeding: BreedingEvent[];
  reminders: FarmReminder[];
  /** The ledger balance of each buyer (positive = owes the farm). */
  buyerBalances: number[];
  today: string;
}): WeeklySummary {
  const { milk, deliveries, payments, health, breeding, reminders, buyerBalances, today } = input;
  const week = lastWeekRange(today);
  const before: DateRange = { from: addDays(week.from, -7), to: addDays(week.from, -1) };

  const production = productionInRange(milk, week);
  const previous = productionInRange(milk, before);
  const figures = producedVsSold(milk, deliveries, week);
  const sales = salesInRange(deliveries, week);
  const cash = cashReceived(payments, week);
  const owed = summariseBalances(buyerBalances);
  const overdue = reminders.filter((r) => !isReminderDone(r, today) && r.dueDate < today).length;

  return {
    weekStart: week.from,
    weekEnd: week.to,
    produced: production.litres,
    previousProduced: previous.litres,
    changePercent: previous.recordedDays > 0 && previous.litres > 0 ? Math.round(((production.litres - previous.litres) / previous.litres) * 100) : null,
    sold: figures.sold,
    notSold: figures.notSold,
    soldState: figures.state,
    billed: sales.billed,
    received: cash.amount,
    owedTotal: owed.owedToFarm,
    buyersOwing: owed.buyersOwing,
    overdueReminders: overdue,
    recorders: recordersSummary({ milk, health, breeding }, week, today),
    hasActivity: production.recordedDays > 0 || sales.count > 0 || cash.count > 0,
  };
}
