// Milk drop alerts and the weekly cow ranking.
//
// Both apply only to farms that log milk per cow. A farm that logs farm totals only sees nothing new: there is no
// per-cow series for it, so no alert is ever raised from farm-total records.
//
// What counts as a cow's day: a date on which the farm's counted milk is complete (a day total, or AM and PM) AND every
// counted entry for that date was recorded per cow. A day that is only partly per cow (for example the morning is per
// cow and the evening is a farm total) says nothing reliable about one cow's day, so it is left out rather than read
// as a drop. Today is therefore left out until its milk is complete.
//
// Drop alert (a cow's own history, never a farm-wide figure):
//   * Compare her average over her last RECENT_DAYS recorded days with her average over the (up to) BASELINE_DAYS
//     recorded days before those. She needs all RECENT_DAYS and at least BASELINE_MIN_DAYS of the baseline.
//   * Raise the alert when the recent average is DROP_PERCENT or more below the baseline.
//   * Skip cows that are not lactating, are within CALVING_QUIET_DAYS of calving, or have a dry-off reminder due within
//     DRY_OFF_QUIET_DAYS, and cows whose latest recorded day is older than STALE_DAYS.
//   * One open alert per cow. It closes by itself when her recent average is back within RECOVERY_PERCENT of the baseline
//     it was raised against.
//
// The thresholds are named constants so they can be tuned after the pilot, once a vet has confirmed them. The wording
// describes what the records show and suggests calling a vet; it never names a diagnosis or a medicine.

import type { BreedingEvent, Cow, FarmReminder, MilkEntry } from '@/types';
import { addDays, daysBetween, trailingRange } from './dates';
import { dailyProduction, isActive, recordedDates } from './milk';

export const RECENT_DAYS = 3;
export const BASELINE_DAYS = 7;
export const BASELINE_MIN_DAYS = 5;
export const DROP_PERCENT = 25;
export const RECOVERY_PERCENT = 10;
export const CALVING_QUIET_DAYS = 14;
export const DRY_OFF_QUIET_DAYS = 30;
/** A cow whose latest recorded day is older than this is not being milked per cow any more: no alert. */
export const STALE_DAYS = 7;
/** The ranking compares a cow's average this week with the week before; within this many percent counts as level. */
export const RANK_LEVEL_PERCENT = 5;
export const RANK_WINDOW_DAYS = 7;

const round1 = (n: number) => Math.round(n * 10) / 10;
const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

export interface CowDay { date: string; litres: number }

/** Every cow's complete days, oldest first. Empty for a farm that only logs farm totals. */
export function cowDaySeries(entries: MilkEntry[]): Map<string, { tag: string; name?: string; days: CowDay[] }> {
  const series = new Map<string, { tag: string; name?: string; days: CowDay[] }>();
  for (const date of [...recordedDates(entries)].sort()) {
    const day = dailyProduction(entries, date);
    const complete = day.dayTotal !== null || (day.am !== null && day.pm !== null);
    const counted = entries.filter((e) => isActive(e) && day.countedIds.includes(e.id));
    if (!complete || counted.length === 0 || counted.some((e) => !e.cowBreakdown?.length)) continue;
    const perCow = new Map<string, { tag: string; name?: string; litres: number }>();
    for (const entry of counted) {
      for (const row of entry.cowBreakdown ?? []) {
        const cur = perCow.get(row.cowId) ?? { tag: row.cowTag, name: row.cowName, litres: 0 };
        cur.litres += row.litres;
        perCow.set(row.cowId, cur);
      }
    }
    for (const [cowId, cow] of perCow) {
      const s = series.get(cowId) ?? { tag: cow.tag, name: cow.name, days: [] };
      s.tag = cow.tag; s.name = cow.name ?? s.name;
      s.days.push({ date, litres: round1(cow.litres) });
      series.set(cowId, s);
    }
  }
  return series;
}

export interface MilkDropAlert {
  cowId: string;
  cowTag: string;
  cowName?: string;
  /** How far below her earlier average she is now, in whole percent. */
  percent: number;
  recentAverage: number;
  baselineAverage: number;
  /** The date the alert was first raised, and her latest recorded day. */
  openedOn: string;
  latestDate: string;
}

/**
 * Walks one cow's days in order so an alert, once raised, stays open until she has recovered (rather than flickering
 * around the threshold). Returns the open alert at her latest day, or null.
 */
function openAlertFor(days: CowDay[]): { baseline: number; recent: number; openedOn: string; latestDate: string } | null {
  let open: { baseline: number; openedOn: string } | null = null;
  for (let i = RECENT_DAYS - 1; i < days.length; i++) {
    const recent = average(days.slice(i - RECENT_DAYS + 1, i + 1).map((d) => d.litres));
    if (open) {
      if (recent >= open.baseline * (1 - RECOVERY_PERCENT / 100)) open = null;
      continue;
    }
    const older = days.slice(Math.max(0, i - RECENT_DAYS + 1 - BASELINE_DAYS), i - RECENT_DAYS + 1);
    if (older.length < BASELINE_MIN_DAYS) continue;
    const baseline = average(older.map((d) => d.litres));
    if (baseline > 0 && (baseline - recent) / baseline >= DROP_PERCENT / 100) open = { baseline, openedOn: days[i].date };
  }
  if (!open) return null;
  const recent = average(days.slice(-RECENT_DAYS).map((d) => d.litres));
  return { baseline: open.baseline, recent, openedOn: open.openedOn, latestDate: days[days.length - 1].date };
}

/** Days since a cow's last calving (a live birth or a stillbirth; an abortion is not a calving), or null. */
export function daysSinceCalving(cowId: string, breeding: BreedingEvent[], today: string): number | null {
  const dates = breeding
    .filter((b) => b.cowId === cowId && b.type === 'calving' && b.calvingOutcome !== 'aborted' && b.date <= today)
    .map((b) => b.date)
    .sort();
  return dates.length ? daysBetween(dates[dates.length - 1], today) : null;
}

/** True when an open dry-off reminder for the cow is due within DRY_OFF_QUIET_DAYS (or is already overdue). */
export function dryOffSoon(cowId: string, reminders: FarmReminder[], today: string): boolean {
  const limit = addDays(today, DRY_OFF_QUIET_DAYS);
  return reminders.some((r) => r.cowId === cowId && r.type === 'dry_off' && !r.completed && r.dueDate <= limit);
}

/** The cows whose milk has dropped, biggest drop first. One alert per cow at most. */
export function milkDropAlerts(input: { cows: Cow[]; milk: MilkEntry[]; breeding: BreedingEvent[]; reminders: FarmReminder[]; today: string }): MilkDropAlert[] {
  const { cows, milk, breeding, reminders, today } = input;
  const series = cowDaySeries(milk);
  const alerts: MilkDropAlert[] = [];
  for (const cow of cows) {
    if (cow.status !== 'lactating') continue;
    const s = series.get(cow.id);
    if (!s || s.days.length < RECENT_DAYS + BASELINE_MIN_DAYS) continue;
    const sinceCalving = daysSinceCalving(cow.id, breeding, today);
    if (sinceCalving !== null && sinceCalving < CALVING_QUIET_DAYS) continue;
    if (dryOffSoon(cow.id, reminders, today)) continue;
    const found = openAlertFor(s.days);
    if (!found || daysBetween(found.latestDate, today) > STALE_DAYS) continue;
    alerts.push({
      cowId: cow.id, cowTag: cow.tag, cowName: cow.name ?? s.name,
      percent: Math.max(0, Math.round(((found.baseline - found.recent) / found.baseline) * 100)),
      recentAverage: round1(found.recent), baselineAverage: round1(found.baseline), openedOn: found.openedOn, latestDate: found.latestDate,
    });
  }
  return alerts.sort((a, b) => b.percent - a.percent || a.cowTag.localeCompare(b.cowTag));
}

export type RankTrend = 'up' | 'down' | 'level' | 'new';

export interface CowRank {
  cowId: string;
  cowTag: string;
  cowName?: string;
  /** Her average litres per recorded day over the last RANK_WINDOW_DAYS days. */
  average: number;
  /** Against the RANK_WINDOW_DAYS before that: 'new' when she has no days in that earlier week. */
  trend: RankTrend;
  changePercent: number | null;
}

/** Each lactating cow with milk recorded per cow this week, highest first, with an up, down or level mark. */
export function cowRanking(input: { cows: Cow[]; milk: MilkEntry[]; today: string }): CowRank[] {
  const { cows, milk, today } = input;
  const thisWeek = trailingRange(today, RANK_WINDOW_DAYS);
  const lastWeek = trailingRange(addDays(today, -RANK_WINDOW_DAYS), RANK_WINDOW_DAYS);
  const series = cowDaySeries(milk);
  const rows: CowRank[] = [];
  for (const cow of cows) {
    if (cow.status !== 'lactating') continue;
    const s = series.get(cow.id);
    if (!s) continue;
    const now = s.days.filter((d) => d.date >= thisWeek.from && d.date <= thisWeek.to);
    if (!now.length) continue;
    const before = s.days.filter((d) => d.date >= lastWeek.from && d.date <= lastWeek.to);
    const avg = average(now.map((d) => d.litres));
    let trend: RankTrend = 'new';
    let changePercent: number | null = null;
    if (before.length) {
      const prev = average(before.map((d) => d.litres));
      changePercent = prev > 0 ? Math.round(((avg - prev) / prev) * 100) : null;
      trend = changePercent === null || Math.abs(changePercent) <= RANK_LEVEL_PERCENT ? 'level' : changePercent > 0 ? 'up' : 'down';
    }
    rows.push({ cowId: cow.id, cowTag: cow.tag, cowName: cow.name ?? s.name, average: round1(avg), trend, changePercent });
  }
  return rows.sort((a, b) => b.average - a.average || a.cowTag.localeCompare(b.cowTag));
}

/** True when the farm records milk per cow at all (otherwise none of this is shown). */
export const logsPerCow = (milk: MilkEntry[]) => cowDaySeries(milk).size > 0;
