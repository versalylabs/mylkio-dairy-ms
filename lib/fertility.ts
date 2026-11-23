// Fertility flags, days open and the calving interval, worked out from the breeding records the farmer already enters.
//
// Two flags (each shown in "Needs your attention" for a cow, at most one of each kind per cow):
//   * Not served: she calved NOT_SERVED_DAYS or more ago, is not recorded as pregnant, and has no insemination since
//     that calving. A new insemination closes it.
//   * Repeat service: she has had REPEAT_SERVICE_COUNT or more inseminations since her last calving and no positive
//     pregnancy check. A positive pregnancy check closes it.
// A heifer that has never calved is left out of both (there is no calving to count from), and so is a cow that has
// been sold, has died or is archived.
//
// Days open = the days from her last calving to the insemination that led to a positive pregnancy check, or to today if
// she is not pregnant. Calving interval = the days between her two most recent calvings. A stillbirth counts as a
// calving and an abortion does not, matching `planCalving` (lib/herd-care.ts). Each figure is shown only when the
// records allow it.
//
// The thresholds are named constants to be confirmed with a vet before the pilot. The wording describes what the
// records show and suggests watching for heat, asking the inseminator, or asking a vet to examine the cow; it never
// names a diagnosis or a medicine.
//
// There is no separate reminder to deduplicate against: the app has no heat or insemination follow-up reminders (its
// reminder kinds are vaccination, deworming, calving, dry-off, withdrawal, payments and statements), and a flag is
// worked out from the records, so it closes by itself when the records change.

import type { BreedingEvent, Cow } from '@/types';
import { daysBetween } from './dates';

export const NOT_SERVED_DAYS = 90;
export const REPEAT_SERVICE_COUNT = 3;

const GONE = new Set(['sold', 'deceased', 'archived']);

/** Calving dates (live birth or stillbirth), oldest first. An abortion is not a calving. */
export function calvingDates(cowId: string, breeding: BreedingEvent[]): string[] {
  return breeding
    .filter((b) => b.cowId === cowId && b.type === 'calving' && b.calvingOutcome !== 'aborted')
    .map((b) => b.date)
    .sort();
}

export interface FertilityFacts {
  /** Null for a cow with no calving recorded (a heifer, or a cow whose calvings were never entered). */
  lastCalving: string | null;
  daysSinceCalving: number | null;
  /** Inseminations after her last calving. */
  servicesSinceCalving: number;
  pregnant: boolean;
  daysOpen: number | null;
  calvingIntervalDays: number | null;
}

export function fertilityFacts(cow: Pick<Cow, 'id' | 'isPregnant'>, breeding: BreedingEvent[], today: string): FertilityFacts {
  const mine = breeding.filter((b) => b.cowId === cow.id && b.date <= today);
  const calvings = calvingDates(cow.id, mine);
  const lastCalving = calvings.length ? calvings[calvings.length - 1] : null;
  const calvingIntervalDays = calvings.length >= 2 ? daysBetween(calvings[calvings.length - 2], calvings[calvings.length - 1]) : null;
  if (!lastCalving) {
    return { lastCalving: null, daysSinceCalving: null, servicesSinceCalving: 0, pregnant: cow.isPregnant, daysOpen: null, calvingIntervalDays };
  }

  const after = mine.filter((b) => b.date > lastCalving);
  const services = after.filter((b) => b.type === 'insemination');
  const aborted = after.filter((b) => b.type === 'calving' && b.calvingOutcome === 'aborted').map((b) => b.date);
  // The latest positive result (on a pregnancy check or on the insemination itself) not followed by an abortion.
  const positives = after
    .filter((b) => (b.type === 'pregnancy_check' || b.type === 'insemination') && b.pregnancyResult === 'positive' && !aborted.some((d) => d >= b.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  const confirmed = positives.length ? positives[positives.length - 1] : null;
  const pregnant = Boolean(confirmed) || cow.isPregnant;

  let daysOpen: number | null;
  if (!pregnant) {
    daysOpen = daysBetween(lastCalving, today);
  } else if (confirmed) {
    const conception = confirmed.type === 'insemination'
      ? confirmed.date
      : services.filter((s) => s.date <= confirmed.date).map((s) => s.date).sort().pop();
    daysOpen = conception ? Math.max(0, daysBetween(lastCalving, conception)) : null;
  } else {
    daysOpen = null; // marked pregnant on her profile, but no record says which insemination
  }

  return { lastCalving, daysSinceCalving: daysBetween(lastCalving, today), servicesSinceCalving: services.length, pregnant, daysOpen, calvingIntervalDays };
}

export type FertilityFlagKind = 'not_served' | 'repeat_service';

export interface FertilityFlag {
  /** Stable id, also used to remember a dismiss or snooze. */
  id: string;
  kind: FertilityFlagKind;
  cowId: string;
  cowTag: string;
  cowName?: string;
  daysSinceCalving: number;
  services: number;
}

/** The open fertility flags, one of each kind per cow at most, "not served" cows first. */
export function fertilityFlags(input: { cows: Cow[]; breeding: BreedingEvent[]; today: string }): FertilityFlag[] {
  const { cows, breeding, today } = input;
  const flags: FertilityFlag[] = [];
  for (const cow of cows) {
    if (cow.sex !== 'female' || GONE.has(cow.status) || cow.status === 'calf') continue;
    const f = fertilityFacts(cow, breeding, today);
    if (f.lastCalving === null || f.daysSinceCalving === null || f.pregnant) continue;
    const base = { cowId: cow.id, cowTag: cow.tag, cowName: cow.name, daysSinceCalving: f.daysSinceCalving, services: f.servicesSinceCalving };
    if (f.servicesSinceCalving === 0 && f.daysSinceCalving >= NOT_SERVED_DAYS) flags.push({ ...base, id: `fert-not:${cow.id}`, kind: 'not_served' });
    if (f.servicesSinceCalving >= REPEAT_SERVICE_COUNT) flags.push({ ...base, id: `fert-rep:${cow.id}`, kind: 'repeat_service' });
  }
  const order: Record<FertilityFlagKind, number> = { not_served: 0, repeat_service: 1 };
  return flags.sort((a, b) => order[a.kind] - order[b.kind] || b.daysSinceCalving - a.daysSinceCalving || a.cowTag.localeCompare(b.cowTag));
}
