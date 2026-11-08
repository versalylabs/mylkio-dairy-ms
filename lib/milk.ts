import type { MilkEntry } from '@/types';
import { addDays, type DateRange, inRange, trailingRange } from './dates';

// Milk production rules (one authoritative figure per farm date):
// - A "day total" entry covers the whole day. If one exists, it is the day's
//   production and AM/PM entries for that date are not added to it.
// - Otherwise the day is AM + PM, using one entry per session.
// - Farm-total and cow-level entries for the same session describe the same milk,
//   so only one of them counts.
// - Where more than one entry competes, the most recently recorded one counts and
//   the date is flagged for review. Nothing is silently added twice.

export type MilkSession = MilkEntry['session'];

const round1 = (n: number) => Math.round(n * 10) / 10;

export function isActive<T extends { voidedAt?: string }>(record: T): boolean {
  return !record.voidedAt;
}

function newestFirst(a: MilkEntry, b: MilkEntry) {
  return b.createdAt.localeCompare(a.createdAt);
}

/** Entries already recorded that would describe the same milk as a new entry. */
export function findMilkOverlaps(entries: MilkEntry[], date: string, session: MilkSession): MilkEntry[] {
  return entries.filter((e) => {
    if (!isActive(e) || e.date !== date) return false;
    if (session === 'total') return true; // a day total covers every session
    return e.session === session || e.session === 'total';
  });
}

export interface DailyProduction {
  date: string;
  litres: number;
  am: number | null;
  pm: number | null;
  dayTotal: number | null;
  countedIds: string[];
  /** Active entries for the date that are NOT counted (duplicates/overlaps). */
  ignored: MilkEntry[];
  needsReview: boolean;
}

export function dailyProduction(entries: MilkEntry[], date: string): DailyProduction {
  const active = entries.filter((e) => isActive(e) && e.date === date).sort(newestFirst);
  const totals = active.filter((e) => e.session === 'total');
  let counted: MilkEntry[];
  if (totals.length > 0) {
    counted = [totals[0]];
  } else {
    counted = (['AM', 'PM'] as const)
      .map((s) => active.find((e) => e.session === s))
      .filter((e): e is MilkEntry => Boolean(e));
  }
  const countedIds = counted.map((e) => e.id);
  const ignored = active.filter((e) => !countedIds.includes(e.id));
  const pick = (s: MilkSession) => counted.find((e) => e.session === s)?.totalLitres ?? null;
  return {
    date,
    litres: round1(counted.reduce((sum, e) => sum + e.totalLitres, 0)),
    am: pick('AM'),
    pm: pick('PM'),
    dayTotal: pick('total'),
    countedIds,
    ignored,
    needsReview: ignored.length > 0,
  };
}

export function recordedDates(entries: MilkEntry[]): string[] {
  return Array.from(new Set(entries.filter(isActive).map((e) => e.date))).sort().reverse();
}

/** IDs of every entry that counts towards production. */
export function countedEntryIds(entries: MilkEntry[]): Set<string> {
  const ids = new Set<string>();
  for (const date of recordedDates(entries)) dailyProduction(entries, date).countedIds.forEach((id) => ids.add(id));
  return ids;
}

export function datesNeedingReview(entries: MilkEntry[]): DailyProduction[] {
  return recordedDates(entries).map((d) => dailyProduction(entries, d)).filter((d) => d.needsReview);
}

export function productionInRange(entries: MilkEntry[], range: DateRange) {
  const days = recordedDates(entries).filter((d) => inRange(d, range)).map((d) => dailyProduction(entries, d));
  const litres = round1(days.reduce((sum, d) => sum + d.litres, 0));
  return { litres, recordedDays: days.length, days };
}

export interface ProductionTrend {
  average: number | null; // litres per recorded day in the window
  recordedDays: number;
  windowDays: number;
  previousAverage: number | null;
  changePercent: number | null;
}

/** Average daily production over the `days` ending on `end`, compared with the window before. */
export function productionTrend(entries: MilkEntry[], end: string, days = 7): ProductionTrend {
  const current = productionInRange(entries, trailingRange(end, days));
  const previous = productionInRange(entries, trailingRange(addDays(end, -days), days));
  const average = current.recordedDays ? round1(current.litres / current.recordedDays) : null;
  const previousAverage = previous.recordedDays ? round1(previous.litres / previous.recordedDays) : null;
  const changePercent =
    average !== null && previousAverage ? Math.round(((average - previousAverage) / previousAverage) * 1000) / 10 : null;
  return { average, recordedDays: current.recordedDays, windowDays: days, previousAverage, changePercent };
}

export interface CowYield {
  cowId: string;
  cowTag: string;
  cowName?: string;
  totalLitres: number;
  recordedDays: number;
  averagePerDay: number | null;
  daily: { date: string; litres: number }[]; // newest first
}

/** Per-cow production from counted cow-level entries only (no invented allocations). */
export function cowYields(entries: MilkEntry[], range?: DateRange): CowYield[] {
  const counted = countedEntryIds(entries);
  const byCow = new Map<string, { tag: string; name?: string; days: Map<string, number> }>();
  for (const e of entries) {
    if (!counted.has(e.id) || !e.cowBreakdown?.length) continue;
    if (range && !inRange(e.date, range)) continue;
    for (const cb of e.cowBreakdown) {
      const cow = byCow.get(cb.cowId) ?? { tag: cb.cowTag, name: cb.cowName, days: new Map() };
      cow.days.set(e.date, (cow.days.get(e.date) ?? 0) + cb.litres);
      byCow.set(cb.cowId, cow);
    }
  }
  return Array.from(byCow.entries()).map(([cowId, c]) => {
    const daily = Array.from(c.days.entries())
      .map(([date, litres]) => ({ date, litres: round1(litres) }))
      .sort((a, b) => b.date.localeCompare(a.date));
    const totalLitres = round1(daily.reduce((s, d) => s + d.litres, 0));
    return {
      cowId,
      cowTag: c.tag,
      cowName: c.name,
      totalLitres,
      recordedDays: daily.length,
      averagePerDay: daily.length ? round1(totalLitres / daily.length) : null,
      daily,
    };
  });
}

export function sessionLabel(session: MilkSession, lang: 'en' | 'sw' = 'en'): string {
  if (session === 'AM') return lang === 'sw' ? 'asubuhi' : 'this morning';
  if (session === 'PM') return lang === 'sw' ? 'jioni' : 'this evening';
  return lang === 'sw' ? 'siku nzima' : 'the whole day';
}
