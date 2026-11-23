// The farm report: one printable page a farmer can give a bank or a SACCO, prepared from the farm's own records.
//
// Contents: the farm and its owner, the report date and the 12 months covered, a month-by-month table (litres
// produced, litres sold, amount billed, amount received, expenses), the herd today, how many buyers there are of each
// type (their names only if the owner chooses), and for how many months in a row milk has been recorded.
//
// Rules: a month with no records of a kind shows a dash, never a zero. The report carries no health or treatment
// detail and no individual cow's data. Figures use the same rules as Home, Sales and Finance (the counted milk, the
// ledger, voided records left out), so a month's figure matches those screens. It says plainly that it is not audited.
// For owners and managers on the Farm Pro plan and above.

import type { Buyer, Cow, Delivery, ExpenseRecord, Farm, MilkEntry, PaymentRecord } from '@/types';
import { addDays, monthRange } from './dates';
import { cashReceived, expensesInRange, salesInRange } from './ledger';
import { productionInRange } from './milk';

export const REPORT_MONTHS = 12;

export interface ReportMonth {
  /** YYYY-MM */
  key: string;
  /** Null (shown as a dash) when nothing of that kind was recorded in the month. */
  produced: number | null;
  sold: number | null;
  billed: number | null;
  received: number | null;
  expenses: number | null;
}

export interface HerdToday {
  total: number;
  lactating: number;
  dry: number;
  inCalf: number;
  heifers: number;
  calves: number;
}

export interface FarmReport {
  farmName: string;
  county: string;
  ownerName: string;
  ownerPhone: string;
  reportDate: string;
  /** First and last day covered. */
  from: string;
  to: string;
  months: ReportMonth[];
  totals: Omit<ReportMonth, 'key'>;
  herd: HerdToday;
  buyersByType: { cooperative: number; household: number; trader: number; total: number };
  /** Only when the owner asked for them. */
  buyerNames: string[] | null;
  /** Months in a row, counting back from the last month of the report, that have milk recorded. */
  continuousMilkMonths: number;
}

const GONE = new Set(['sold', 'deceased', 'archived']);

/** The 12 months ending at `endMonth` (YYYY-MM), oldest first. */
export function reportMonthKeys(endMonth: string, count = REPORT_MONTHS): string[] {
  const keys: string[] = [];
  let first = monthRange(`${endMonth}-01`).from;
  for (let i = 0; i < count; i++) {
    keys.unshift(first.slice(0, 7));
    first = addDays(first, -1).slice(0, 8) + '01'; // the first day of the month before
  }
  return keys;
}

export function herdToday(cows: Cow[]): HerdToday {
  const live = cows.filter((c) => !GONE.has(c.status));
  return {
    total: live.length,
    lactating: live.filter((c) => c.status === 'lactating').length,
    dry: live.filter((c) => c.status === 'dry').length,
    inCalf: live.filter((c) => c.isPregnant || c.status === 'pregnant_heifer').length,
    heifers: live.filter((c) => c.status === 'pregnant_heifer').length,
    calves: live.filter((c) => c.status === 'calf').length,
  };
}

const sumKnown = (values: (number | null)[]) => {
  const known = values.filter((v): v is number => v !== null);
  return known.length ? Math.round(known.reduce((s, v) => s + v, 0) * 100) / 100 : null;
};

export function farmReport(input: {
  farm: Pick<Farm, 'name' | 'county' | 'ownerName' | 'phone'>;
  cows: Cow[];
  buyers: Pick<Buyer, 'name' | 'type'>[];
  milk: MilkEntry[];
  deliveries: Delivery[];
  payments: PaymentRecord[];
  expenses: ExpenseRecord[];
  endMonth: string;
  includeBuyerNames: boolean;
  today: string;
}): FarmReport {
  const { farm, cows, buyers, milk, deliveries, payments, expenses, endMonth, includeBuyerNames, today } = input;
  const keys = reportMonthKeys(endMonth);

  const rows = keys.map((key) => {
    const range = monthRange(`${key}-01`);
    const production = productionInRange(milk, range);
    const sales = salesInRange(deliveries, range);
    const cash = cashReceived(payments, range);
    const spent = expensesInRange(expenses, range);
    return {
      row: {
        key,
        produced: production.recordedDays > 0 ? production.litres : null,
        sold: sales.count > 0 ? sales.deliveredLitres : null,
        billed: sales.count > 0 ? sales.billed : null,
        received: cash.count > 0 ? cash.amount : null,
        expenses: spent.count > 0 ? spent.amount : null,
      } satisfies ReportMonth,
      hasMilk: production.recordedDays > 0,
    };
  });

  let continuous = 0;
  for (let i = rows.length - 1; i >= 0 && rows[i].hasMilk; i--) continuous++;

  const months = rows.map((r) => r.row);
  const byType = (type: Buyer['type']) => buyers.filter((b) => b.type === type).length;
  return {
    farmName: farm.name,
    county: farm.county,
    ownerName: farm.ownerName,
    ownerPhone: farm.phone,
    reportDate: today,
    from: monthRange(`${keys[0]}-01`).from,
    to: monthRange(`${keys[keys.length - 1]}-01`).to,
    months,
    totals: {
      produced: sumKnown(months.map((m) => m.produced)),
      sold: sumKnown(months.map((m) => m.sold)),
      billed: sumKnown(months.map((m) => m.billed)),
      received: sumKnown(months.map((m) => m.received)),
      expenses: sumKnown(months.map((m) => m.expenses)),
    },
    herd: herdToday(cows),
    buyersByType: { cooperative: byType('cooperative'), household: byType('household'), trader: byType('trader'), total: buyers.length },
    buyerNames: includeBuyerNames ? buyers.map((b) => b.name).sort((a, b) => a.localeCompare(b)) : null,
    continuousMilkMonths: continuous,
  };
}
