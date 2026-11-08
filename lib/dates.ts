// Farm calendar dates. Every operational record uses a plain YYYY-MM-DD date in
// Kenya time (Africa/Nairobi, UTC+3, no daylight saving). Never derive a farm date
// from `toISOString()`, which is UTC and is still "yesterday" until 03:00 in Kenya.

export const FARM_TIME_ZONE = 'Africa/Nairobi';

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: FARM_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The farm calendar date (YYYY-MM-DD) of an instant. */
export function toFarmDate(instant: Date | string | number = new Date()): string {
  const date = instant instanceof Date ? instant : new Date(instant);
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Today's farm date in Kenya. */
export function farmToday(now: Date = new Date()): string {
  return toFarmDate(now);
}

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isFarmDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = YMD.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

/** Calendar arithmetic on YYYY-MM-DD strings (independent of the device time zone). */
export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

export interface DateRange {
  from: string; // inclusive
  to: string; // inclusive
}

export function inRange(ymd: string, range: DateRange): boolean {
  return ymd >= range.from && ymd <= range.to;
}

export function monthRange(ymd: string): DateRange {
  const [y, m] = ymd.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, '0');
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, '0')}` };
}

export function previousMonthRange(ymd: string): DateRange {
  return monthRange(addDays(monthRange(ymd).from, -1));
}

/** The `days`-long window ending on `end` (inclusive). */
export function trailingRange(end: string, days: number): DateRange {
  return { from: addDays(end, -(days - 1)), to: end };
}

/** "8 Nov 2026" style label for a farm date. */
export function formatFarmDate(ymd: string, lang: 'en' | 'sw' = 'en'): string {
  if (!isFarmDate(ymd)) return ymd;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Intl.DateTimeFormat(lang === 'sw' ? 'sw-KE' : 'en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
