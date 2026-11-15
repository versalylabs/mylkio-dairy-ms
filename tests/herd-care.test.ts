import { describe, expect, it } from 'vitest';
import type { BreedingEvent, Cow, FarmReminder, HealthEvent } from '@/types';
import {
  activeWithdrawals, autoCalfTag, calvingProblems, describeCalving, healthTypeLabel, isReminderDone, liveCalves,
  planCalving, planProjection, withdrawalEndFor, withdrawalState,
} from '@/lib/herd-care';
import { initialHealthEvents } from '@/lib/mock-data';
import { assess } from '@/lib/vet/checker';
import { FOLLOW_UP_DAYS, followUpDate, healthEventFromCheck } from '@/lib/vet/record';

const cow = (over: Partial<Cow> = {}): Cow => ({
  id: 'cow-6', farmId: 'f', tag: 'GH-06', name: 'Malkia', breed: 'Friesian', sex: 'female', status: 'pregnant_heifer',
  isPregnant: true, expectedCalvingDate: '2026-11-20', parity: 1, createdAt: '2026-01-01T00:00:00Z', ...over,
});
const treatment = (over: Partial<HealthEvent> = {}): HealthEvent => ({
  id: 'h1', farmId: 'f', cowId: 'cow-4', cowTag: 'GH-04', date: '2026-10-22', type: 'treatment', medicineName: 'Course',
  withdrawalDays: 4, withdrawalEndDate: '2026-10-26', isWithdrawalActive: true, createdAt: '2026-10-22T00:00:00Z', ...over,
});
const reminder = (over: Partial<FarmReminder> = {}): FarmReminder => ({
  id: 'r1', farmId: 'f', type: 'calving', title: 'GH-06 Projected Calving Date', description: '', dueDate: '2026-11-20', cowId: 'cow-6', cowTag: 'GH-06',
  severity: 'high', completed: false, createdAt: '2026-10-01T00:00:00Z', ...over,
});
const insemination = (over: Partial<BreedingEvent> = {}): BreedingEvent => ({
  id: 'b1', farmId: 'f', cowId: 'cow-6', cowTag: 'GH-06', date: '2026-02-10', type: 'insemination', sireOrProvider: 'KAGRC Friesian #84', createdAt: '2026-02-10T00:00:00Z', ...over,
});

describe('milk withdrawal', () => {
  it('runs from the treatment date to its end date, inclusive, and then stops by itself', () => {
    const t = treatment();
    expect(withdrawalState(t, '2026-10-21')).toBe('upcoming');
    expect(withdrawalState(t, '2026-10-22')).toBe('active');
    expect(withdrawalState(t, '2026-10-26')).toBe('active');
    expect(withdrawalState(t, '2026-10-27')).toBe('ended');
    expect(withdrawalState({ date: '2026-10-22' }, '2026-10-23')).toBe('none');
  });

  it('is over for the demo cow whose withdrawal ended weeks ago, although its saved flag still says active', () => {
    const amani = initialHealthEvents.find((h) => h.isWithdrawalActive && h.withdrawalEndDate === '2026-10-26')!;
    expect(amani).toBeTruthy();
    expect(withdrawalState(amani, '2026-11-15')).toBe('ended');
    expect(activeWithdrawals(initialHealthEvents, '2026-11-15')).toEqual([]);
    expect(activeWithdrawals(initialHealthEvents, '2026-10-24').map((h) => h.cowTag)).toContain('GH-04');
  });

  it('lists one entry per cow, the treatment that ends last', () => {
    const events = [treatment({ id: 'a', withdrawalEndDate: '2026-10-26' }), treatment({ id: 'b', withdrawalEndDate: '2026-10-30' }), treatment({ id: 'c', cowId: 'cow-9', cowTag: 'GH-09' })];
    const active = activeWithdrawals(events, '2026-10-25');
    expect(active).toHaveLength(2);
    expect(active.find((h) => h.cowId === 'cow-4')?.id).toBe('b');
  });

  it('says when a cow’s milk is safe after, for the date being recorded', () => {
    const events = [treatment(), treatment({ id: 'x', cowId: 'cow-9', withdrawalEndDate: '2026-12-01' })];
    expect(withdrawalEndFor(events, 'cow-4', '2026-10-24')).toBe('2026-10-26');
    expect(withdrawalEndFor(events, 'cow-4', '2026-10-27')).toBeNull();
    expect(withdrawalEndFor(events, 'cow-4', '2026-10-21')).toBeNull();
    expect(withdrawalEndFor(events, 'cow-2', '2026-10-24')).toBeNull();
  });

  it('treats an expired withdrawal reminder as done, but never closes other reminders by date', () => {
    const expired = reminder({ type: 'withdrawal', dueDate: '2026-10-26' });
    expect(isReminderDone(expired, '2026-10-26')).toBe(false);
    expect(isReminderDone(expired, '2026-10-27')).toBe(true);
    expect(isReminderDone(reminder({ completed: true }), '2026-01-01')).toBe(true);
    expect(isReminderDone(reminder({ dueDate: '2026-01-01' }), '2026-11-15')).toBe(false);
  });

  it('gives each kind of health record a readable name', () => {
    expect(healthTypeLabel('routine_check')).toBe('Health check');
    expect(healthTypeLabel('treatment')).toBe('Treatment');
  });
});

describe('what a calving does', () => {
  const base = { cow: cow(), cows: [cow(), cow({ id: 'cow-2', tag: 'GH-02' })], event: { date: '2026-11-18', calvingOutcome: 'heifer_calf' as const } };

  it('makes the dam lactating with one more calving, and adds a heifer calf to the herd', () => {
    const plan = planCalving({ ...base, breedingEvents: [insemination()] });
    expect(plan.problems).toEqual([]);
    expect(plan.dam).toEqual({ status: 'lactating', isPregnant: false, expectedCalvingDate: undefined, parity: 2 });
    expect(plan.calves).toEqual([{ tag: 'GH-06-C1', breed: 'Friesian', sex: 'female', dob: '2026-11-18', status: 'calf', isPregnant: false, parity: 0, damId: 'GH-06', sire: 'KAGRC Friesian #84' }]);
  });

  it('closes the open calving and dry-off reminders for that cow only, and asks for an afterbirth check the next day', () => {
    const reminders = [
      reminder({ id: 'mine-calving' }),
      reminder({ id: 'mine-dry', type: 'dry_off' }),
      reminder({ id: 'mine-done', completed: true }),
      reminder({ id: 'other-cow', cowId: 'cow-2', cowTag: 'GH-02' }),
      reminder({ id: 'mine-vacc', type: 'vaccination' }),
    ];
    const plan = planCalving({ ...base, reminders });
    expect(plan.completeReminderIds.sort()).toEqual(['mine-calving', 'mine-dry']);
    expect(plan.reminders).toHaveLength(1);
    expect(plan.reminders[0]).toMatchObject({ type: 'calving', title: 'GH-06: check the afterbirth', dueDate: '2026-11-19', severity: 'high', cowId: 'cow-6' });
    expect(plan.reminders[0].description).toMatch(/within 24 hours/);
    expect(plan.reminders[0].description).toMatch(/call a vet/i);
  });

  it('makes a bull calf male, and honours a chosen tag and sex', () => {
    expect(planCalving({ ...base, event: { date: '2026-11-18', calvingOutcome: 'bull_calf' } }).calves[0].sex).toBe('male');
    const chosen = planCalving({ ...base, event: { date: '2026-11-18', calvingOutcome: 'heifer_calf', calfTag: ' GH-30 ', calfSex: 'female' } });
    expect(chosen.calves[0]).toMatchObject({ tag: 'GH-30', sex: 'female' });
  });

  it('adds two calves for twins, with their own tags and sexes', () => {
    const auto = planCalving({ ...base, event: { date: '2026-11-18', calvingOutcome: 'twins' } });
    expect(auto.calves.map((c) => [c.tag, c.sex])).toEqual([['GH-06-C1', 'female'], ['GH-06-C2', 'male']]);
    const chosen = planCalving({ ...base, event: { date: '2026-11-18', calvingOutcome: 'twins', calfTag: 'A1', calfSex: 'male', calfTag2: 'A2', calfSex2: 'male' } });
    expect(chosen.calves.map((c) => [c.tag, c.sex])).toEqual([['A1', 'male'], ['A2', 'male']]);
  });

  it('never reuses a tag, whatever its capitals', () => {
    const cows = [cow(), cow({ id: 'cow-2', tag: 'GH-02' }), cow({ id: 'cow-7', tag: 'gh-06-c1' })];
    expect(planCalving({ ...base, cows }).calves[0].tag).toBe('GH-06-C2');
    expect(autoCalfTag('GH-06', ['GH-06-C1', 'GH-06-C2'])).toBe('GH-06-C3');
    expect(calvingProblems({ ...base, event: { date: '2026-11-18', calvingOutcome: 'heifer_calf', calfTag: 'gh-02' } })[0]).toMatch(/already used/);
    expect(calvingProblems({ ...base, event: { date: '2026-11-18', calvingOutcome: 'twins', calfTag: 'Z9', calfTag2: 'z9' } })[0]).toMatch(/already used/);
  });

  it('counts a stillbirth as a calving but adds no calf', () => {
    const plan = planCalving({ ...base, event: { date: '2026-11-18', calvingOutcome: 'stillborn' } });
    expect(plan.dam).toMatchObject({ status: 'lactating', parity: 2, isPregnant: false });
    expect(plan.calves).toEqual([]);
    expect(plan.reminders).toHaveLength(1);
  });

  it('ends the pregnancy on an abortion without counting a calving or changing her milking status', () => {
    const plan = planCalving({ ...base, event: { date: '2026-11-18', calvingOutcome: 'aborted' }, reminders: [reminder()] });
    expect(plan.dam).toEqual({ isPregnant: false, expectedCalvingDate: undefined });
    expect(plan.dam).not.toHaveProperty('parity');
    expect(plan.dam).not.toHaveProperty('status');
    expect(plan.calves).toEqual([]);
    expect(plan.reminders).toEqual([]);
    expect(plan.completeReminderIds).toEqual(['r1']);
  });

  it('refuses a calving with no outcome, or for a bull', () => {
    expect(calvingProblems({ ...base, event: { date: '2026-11-18' } })[0]).toMatch(/Choose what happened/);
    expect(calvingProblems({ ...base, cow: cow({ sex: 'male' }) })[0]).toMatch(/bull/);
  });

  it('takes the calf’s sire from the latest insemination on or before the calving, for that cow only', () => {
    const events = [
      insemination({ id: 'old', date: '2025-03-01', sireOrProvider: 'Old sire' }),
      insemination({ id: 'right', date: '2026-02-10', sireOrProvider: ' Right sire ' }),
      insemination({ id: 'future', date: '2026-12-01', sireOrProvider: 'Future sire' }),
      insemination({ id: 'other', cowId: 'cow-2', date: '2026-03-01', sireOrProvider: 'Other cow sire' }),
      insemination({ id: 'blank', date: '2026-04-01', sireOrProvider: '  ' }),
    ];
    expect(planCalving({ ...base, breedingEvents: events }).calves[0].sire).toBe('Right sire');
    expect(planCalving({ ...base, breedingEvents: [] }).calves[0].sire).toBeUndefined();
  });

  it('counts the live births for each outcome', () => {
    expect(['heifer_calf', 'bull_calf', 'twins', 'stillborn', 'aborted', undefined].map((o) => liveCalves(o as never))).toEqual([1, 1, 2, 0, 0, 0]);
  });

  it('describes what will happen in plain sentences before saving', () => {
    const c = cow();
    const lines = describeCalving(c, planCalving({ ...base, breedingEvents: [insemination()], reminders: [reminder()] }), 'heifer_calf');
    expect(lines).toEqual([
      'Add heifer calf GH-06-C1 to the herd, with GH-06 as its dam and KAGRC Friesian #84 as its sire.',
      'Mark GH-06 as lactating, at calving number 2.',
      'Close the "calving due" reminder.',
      'Remind you tomorrow to check the afterbirth.',
    ]);
    expect(describeCalving(c, planCalving({ ...base, event: { date: '2026-11-18', calvingOutcome: 'aborted' } }), 'aborted')[0]).toMatch(/no longer pregnant/);
    expect(describeCalving(c, planCalving({ ...base, event: { date: '2026-11-18' } }), undefined)).toEqual([]);
  });
});

describe('pregnancy and dry-off reminders', () => {
  const c = { id: 'cow-6', tag: 'GH-06' };

  it('sets the calving reminder and one to dry her off about 60 days before', () => {
    const { reminders } = planProjection({ cow: c, expectedCalvingDate: '2027-02-01', today: '2026-11-15' });
    expect(reminders.map((r) => [r.type, r.dueDate])).toEqual([['calving', '2027-02-01'], ['dry_off', '2026-12-03']]);
    expect(reminders[1].title).toBe('GH-06: plan to dry her off');
  });

  it('skips the dry-off reminder when that day has already passed', () => {
    const { reminders } = planProjection({ cow: c, expectedCalvingDate: '2026-12-20', today: '2026-11-15' });
    expect(reminders.map((r) => r.type)).toEqual(['calving']);
    expect(planProjection({ cow: c, expectedCalvingDate: '2027-01-14', today: '2026-11-15' }).reminders.map((r) => r.type)).toEqual(['calving', 'dry_off']);
  });

  it('closes the earlier projection for the same cow when the date changes, and leaves others alone', () => {
    const existing = [reminder({ id: 'old-calving' }), reminder({ id: 'old-dry', type: 'dry_off' }), reminder({ id: 'done', completed: true }), reminder({ id: 'other', cowId: 'cow-2' })];
    expect(planProjection({ cow: c, expectedCalvingDate: '2027-02-01', today: '2026-11-15', reminders: existing }).completeReminderIds.sort()).toEqual(['old-calving', 'old-dry']);
  });
});

describe('saving a symptom check to the cow’s health record', () => {
  const c = { id: 'cow-6', tag: 'GH-06', name: 'Malkia' };
  const input = { signs: ['hot_hard_udder', 'abnormal_milk', 'not_a_sign'], animal: 'adult' as const, calved: 'no' as const };

  it('records a health check with a follow-up, and never a diagnosis or a medicine', () => {
    const event = healthEventFromCheck({ cow: c, date: '2026-11-15', signs: input.signs, assessment: assess(input) });
    expect(event).toMatchObject({ cowId: 'cow-6', cowTag: 'GH-06', cowName: 'Malkia', date: '2026-11-15', type: 'routine_check', nextDueDate: '2026-11-16' });
    expect(event.diagnosis).toBeUndefined();
    expect(event.medicineName).toBeUndefined();
    expect(event.withdrawalDays).toBeUndefined();
    expect(event.notes).toContain('not a diagnosis');
    expect(event.notes).toContain('Udder is hot, hard and swollen');
    expect(event.notes).toContain('See a vet today');
    expect(event.notes).toContain('Mastitis (udder infection) (fits closely)');
    expect(event.notes).not.toContain('not_a_sign');
  });

  it('looks again sooner for more urgent checks', () => {
    expect(FOLLOW_UP_DAYS).toEqual({ emergency: 1, today: 1, soon: 2, none: 3 });
    expect(followUpDate('2026-11-15', 'emergency')).toBe('2026-11-16');
    expect(followUpDate('2026-11-15', 'soon')).toBe('2026-11-17');
    expect(followUpDate('2026-11-15', null)).toBe('2026-11-18');
    const emergency = healthEventFromCheck({ cow: c, date: '2026-11-15', signs: ['swollen_left_flank'], assessment: assess({ signs: ['swollen_left_flank'], animal: 'adult', calved: 'no' }) });
    expect(emergency.nextDueDate).toBe('2026-11-16');
    expect(emergency.notes).toContain('EMERGENCY');
  });

  it('says so when no signs matched anything', () => {
    const event = healthEventFromCheck({ cow: c, date: '2026-11-15', signs: ['milk_dropped'], assessment: assess({ signs: ['milk_dropped'], animal: 'adult', calved: 'no' }) });
    expect(event.nextDueDate).toBe('2026-11-18');
    expect(event.notes).not.toContain('The signs fit');
  });
});
