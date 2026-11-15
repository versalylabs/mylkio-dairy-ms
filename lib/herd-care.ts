import type { BreedingEvent, Cow, FarmReminder, HealthEvent, HealthEventType } from '@/types';
import { addDays } from './dates';

// Herd-care rules, as plain functions so they can be tested and so every screen agrees:
//   * whether a treatment's milk withdrawal is still running (worked out from dates, never from a saved flag),
//   * what happens to the herd when a cow calves,
//   * the reminders that follow from a calving, a pregnancy or a treatment.
// Dates are YYYY-MM-DD in the farm's own (Nairobi) calendar, so they compare as plain strings.

type NewReminder = Omit<FarmReminder, 'id' | 'createdAt' | 'farmId'>;
type NewCalf = Omit<Cow, 'id' | 'createdAt' | 'farmId'>;

export const HEALTH_TYPE_LABEL: Record<HealthEventType, string> = {
  vaccination: 'Vaccination',
  treatment: 'Treatment',
  deworming: 'Deworming',
  routine_check: 'Health check',
};

export const healthTypeLabel = (type: HealthEventType) => HEALTH_TYPE_LABEL[type] ?? type;

// ───────────── Milk withdrawal ─────────────

export type WithdrawalState = 'none' | 'upcoming' | 'active' | 'ended';

/**
 * A treatment's withdrawal runs from the treatment date to its end date, inclusive: milk is safe to sell from
 * the day after the end date. Once that day has passed the withdrawal is over without anyone having to tick
 * anything. (The saved `isWithdrawalActive` flag is true forever, so nothing should read it.)
 */
export function withdrawalState(event: Pick<HealthEvent, 'date' | 'withdrawalEndDate'>, today: string): WithdrawalState {
  if (!event.withdrawalEndDate) return 'none';
  if (today < event.date) return 'upcoming';
  return today <= event.withdrawalEndDate ? 'active' : 'ended';
}

/** One entry per cow that is under withdrawal today: the treatment whose withdrawal ends last. */
export function activeWithdrawals(events: readonly HealthEvent[], today: string): HealthEvent[] {
  const latest = new Map<string, HealthEvent>();
  for (const event of events) {
    if (withdrawalState(event, today) !== 'active') continue;
    const current = latest.get(event.cowId);
    if (!current || (event.withdrawalEndDate ?? '') > (current.withdrawalEndDate ?? '')) latest.set(event.cowId, event);
  }
  return [...latest.values()];
}

/** The day a cow's milk is safe after, if a treatment's withdrawal covers `date`; otherwise null. */
export function withdrawalEndFor(events: readonly HealthEvent[], cowId: string, date: string): string | null {
  let end: string | null = null;
  for (const event of events) {
    if (event.cowId !== cowId || withdrawalState(event, date) !== 'active') continue;
    if (end === null || (event.withdrawalEndDate ?? '') > end) end = event.withdrawalEndDate ?? null;
  }
  return end;
}

/** A reminder is done when ticked, or when it is a withdrawal reminder whose end date has passed. */
export const isReminderDone = (reminder: Pick<FarmReminder, 'type' | 'completed' | 'dueDate'>, today: string) =>
  reminder.completed || (reminder.type === 'withdrawal' && reminder.dueDate < today);

// ───────────── Calving ─────────────

export type CalvingOutcome = NonNullable<BreedingEvent['calvingOutcome']>;
export type CalfSex = 'female' | 'male';

export interface CalvingEventInput {
  date: string;
  calvingOutcome?: CalvingOutcome;
  calfTag?: string;
  calfSex?: CalfSex;
  calfTag2?: string;
  calfSex2?: CalfSex;
}

export interface CalvingPlan {
  /** What changes on the dam. */
  dam: Partial<Cow>;
  /** New calf records to add to the herd. */
  calves: NewCalf[];
  reminders: NewReminder[];
  /** Open reminders this calving makes obsolete (the "calving due" ones). */
  completeReminderIds: string[];
  /** Why this calving cannot be recorded; empty when it can. */
  problems: string[];
}

/** How many calves are born alive for each outcome. */
export function liveCalves(outcome: CalvingOutcome | undefined): number {
  return outcome === 'heifer_calf' || outcome === 'bull_calf' ? 1 : outcome === 'twins' ? 2 : 0;
}

const sameTag = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The next free tag such as "GH-06-C1", counting up if that is taken. */
export function autoCalfTag(damTag: string, taken: readonly string[]): string {
  for (let n = 1; ; n++) {
    const candidate = `${damTag}-C${n}`;
    if (!taken.some((t) => sameTag(t, candidate))) return candidate;
  }
}

/** The most recent insemination on or before the calving: its sire or provider becomes the calf's sire. */
function sireFor(cowId: string, date: string, events: readonly BreedingEvent[]): string | undefined {
  return [...events]
    .filter((e) => e.cowId === cowId && e.type === 'insemination' && e.date <= date && e.sireOrProvider?.trim())
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.sireOrProvider?.trim();
}

const openCalvingProjection = (r: FarmReminder, cowId: string) =>
  r.cowId === cowId && !r.completed && (r.type === 'calving' || r.type === 'dry_off');

/**
 * What a calving does to the herd, without changing anything. A cow that calves (live or stillborn) is
 * lactating again and has had one more calving; a calf is added for each live birth, with the dam's tag and
 * the sire from her last insemination; an abortion ends the pregnancy but is not a calving. The "calving due"
 * reminders are closed and a check on the afterbirth is set for the next day.
 */
export function planCalving(args: {
  cow: Cow;
  cows: readonly Cow[];
  event: CalvingEventInput;
  breedingEvents?: readonly BreedingEvent[];
  reminders?: readonly FarmReminder[];
}): CalvingPlan {
  const { cow, cows, event, breedingEvents = [], reminders = [] } = args;
  const plan: CalvingPlan = { dam: {}, calves: [], reminders: [], completeReminderIds: [], problems: [] };
  const outcome = event.calvingOutcome;

  if (!outcome) { plan.problems.push('Choose what happened at the calving.'); return plan; }
  if (cow.sex === 'male') { plan.problems.push('A bull cannot calve.'); return plan; }

  plan.completeReminderIds = reminders.filter((r) => openCalvingProjection(r, cow.id)).map((r) => r.id);

  if (outcome === 'aborted') {
    plan.dam = { isPregnant: false, expectedCalvingDate: undefined };
    return plan;
  }

  plan.dam = { status: 'lactating', isPregnant: false, expectedCalvingDate: undefined, parity: cow.parity + 1 };
  plan.reminders.push({
    type: 'calving',
    title: `${cow.tag}: check the afterbirth`,
    description: 'The afterbirth should come away within 24 hours of calving. If it has not, call a vet.',
    dueDate: addDays(event.date, 1),
    cowId: cow.id,
    cowTag: cow.tag,
    severity: 'high',
    completed: false,
  });

  const taken = cows.map((c) => c.tag);
  const born = liveCalves(outcome);
  const calves: { tag?: string; sex: CalfSex }[] = [
    { tag: event.calfTag, sex: event.calfSex ?? (outcome === 'bull_calf' ? 'male' : 'female') },
    ...(outcome === 'twins' ? [{ tag: event.calfTag2, sex: event.calfSex2 ?? ('male' as CalfSex) }] : []),
  ].slice(0, born);

  const sire = sireFor(cow.id, event.date, breedingEvents);
  const used: string[] = [];
  for (const calf of calves) {
    const given = calf.tag?.trim();
    if (given && [...taken, ...used].some((t) => sameTag(t, given))) {
      plan.problems.push(`The tag ${given} is already used by another animal.`);
      continue;
    }
    const tag = given || autoCalfTag(cow.tag, [...taken, ...used]);
    used.push(tag);
    plan.calves.push({
      tag,
      breed: cow.breed,
      sex: calf.sex,
      dob: event.date,
      status: 'calf',
      isPregnant: false,
      parity: 0,
      damId: cow.tag,
      sire,
    });
  }
  return plan;
}

/** Why a calving cannot be saved (an empty list means it can); the same check the plan makes. */
export const calvingProblems = (args: Parameters<typeof planCalving>[0]) => planCalving(args).problems;

const OUTCOME_WORDS: Record<CalvingOutcome, string> = {
  heifer_calf: 'a heifer calf', bull_calf: 'a bull calf', twins: 'twins', stillborn: 'a stillborn calf', aborted: 'an abortion',
};

/** Plain sentences for "what will happen when you save", shown before the farmer confirms. */
export function describeCalving(cow: Pick<Cow, 'tag' | 'parity'>, plan: CalvingPlan, outcome: CalvingOutcome | undefined): string[] {
  if (!outcome || plan.problems.length) return [];
  const lines: string[] = [];
  for (const calf of plan.calves) lines.push(`Add ${calf.sex === 'male' ? 'bull' : 'heifer'} calf ${calf.tag} to the herd, with ${cow.tag} as its dam${calf.sire ? ` and ${calf.sire} as its sire` : ''}.`);
  if (outcome === 'aborted') lines.push(`Mark ${cow.tag} as no longer pregnant (${OUTCOME_WORDS[outcome]}).`);
  else lines.push(`Mark ${cow.tag} as lactating, at calving number ${cow.parity + 1}.`);
  if (plan.completeReminderIds.length) lines.push('Close the "calving due" reminder.');
  if (plan.reminders.length) lines.push('Remind you tomorrow to check the afterbirth.');
  return lines;
}

// ───────────── Pregnancy and dry-off ─────────────

export const DRY_OFF_DAYS_BEFORE_CALVING = 60;

/**
 * Reminders for a confirmed or pending pregnancy with an expected calving date: the calving itself, and
 * about 60 days earlier a prompt to dry her off. Earlier projections for the same cow are closed so changing
 * the date never leaves two reminders for one calving. A past date gets no dry-off reminder.
 */
export function planProjection(args: {
  cow: Pick<Cow, 'id' | 'tag'>;
  expectedCalvingDate: string;
  today: string;
  reminders?: readonly FarmReminder[];
}): { reminders: NewReminder[]; completeReminderIds: string[] } {
  const { cow, expectedCalvingDate, today, reminders = [] } = args;
  const out: NewReminder[] = [{
    type: 'calving',
    title: `${cow.tag} Projected Calving Date`,
    description: `Projected delivery date: ${expectedCalvingDate}. Prepare a clean maternity pen and transition feed.`,
    dueDate: expectedCalvingDate,
    cowId: cow.id,
    cowTag: cow.tag,
    severity: 'high',
    completed: false,
  }];
  const dryOff = addDays(expectedCalvingDate, -DRY_OFF_DAYS_BEFORE_CALVING);
  if (dryOff >= today) {
    out.push({
      type: 'dry_off',
      title: `${cow.tag}: plan to dry her off`,
      description: `Expected calving is ${expectedCalvingDate}. Cows are usually dried off about ${DRY_OFF_DAYS_BEFORE_CALVING} days before calving.`,
      dueDate: dryOff,
      cowId: cow.id,
      cowTag: cow.tag,
      severity: 'medium',
      completed: false,
    });
  }
  return { reminders: out, completeReminderIds: reminders.filter((r) => openCalvingProjection(r, cow.id)).map((r) => r.id) };
}
