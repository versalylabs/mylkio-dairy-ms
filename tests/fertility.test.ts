import { describe, expect, it } from 'vitest';
import type { BreedingEvent, Cow } from '@/types';
import { addDays, farmToday } from '@/lib/dates';
import { NOT_SERVED_DAYS, REPEAT_SERVICE_COUNT, calvingDates, fertilityFacts, fertilityFlags } from '@/lib/fertility';
import { FERTILITY_COPY } from '@/lib/fertility-copy';
import { canUse } from '@/lib/plans';
import { initialBreedingEvents, initialCows } from '@/lib/mock-data';

const FARM = 'farm-test';
const TODAY = '2026-11-16';
const ago = (n: number) => addDays(TODAY, -n);

const cow = (id: string, over: Partial<Cow> = {}): Cow => ({
  id, farmId: FARM, tag: `T-${id}`, name: id[0].toUpperCase() + id.slice(1), breed: 'Friesian' as Cow['breed'], sex: 'female', status: 'lactating', isPregnant: false, parity: 2, createdAt: '2025-01-01', ...over,
});
const ev = (cowId: string, type: BreedingEvent['type'], date: string, over: Partial<BreedingEvent> = {}): BreedingEvent => ({
  id: `${cowId}-${type}-${date}-${Math.random().toString(36).slice(2, 6)}`, farmId: FARM, cowId, cowTag: `T-${cowId}`, date, type, createdAt: date, ...over,
});
const calved = (cowId: string, date: string, calvingOutcome: BreedingEvent['calvingOutcome'] = 'heifer_calf') => ev(cowId, 'calving', date, { calvingOutcome });
const served = (cowId: string, date: string, over: Partial<BreedingEvent> = {}) => ev(cowId, 'insemination', date, over);
const check = (cowId: string, date: string, pregnancyResult: 'positive' | 'negative' | 'pending') => ev(cowId, 'pregnancy_check', date, { pregnancyResult });
const flags = (cows: Cow[], breeding: BreedingEvent[]) => fertilityFlags({ cows, breeding, today: TODAY });

describe('not served', () => {
  it(`flags a cow that calved ${NOT_SERVED_DAYS} or more days ago with no insemination since, and not before`, () => {
    expect(NOT_SERVED_DAYS).toBe(90);
    expect(flags([cow('a')], [calved('a', ago(NOT_SERVED_DAYS - 1))])).toEqual([]);
    const [f] = flags([cow('a')], [calved('a', ago(NOT_SERVED_DAYS))]);
    expect(f).toMatchObject({ kind: 'not_served', cowId: 'a', daysSinceCalving: 90 });
    expect(flags([cow('a')], [calved('a', ago(104))])[0].daysSinceCalving).toBe(104);
  });

  it('is closed by a new insemination, even one dated the day after the calving', () => {
    expect(flags([cow('a')], [calved('a', ago(120)), served('a', ago(2))])).toEqual([]);
    expect(flags([cow('a')], [calved('a', ago(120)), served('a', ago(119))])).toEqual([]);
  });

  it('only counts inseminations since her last calving, not earlier ones', () => {
    const f = flags([cow('a')], [served('a', ago(400)), calved('a', ago(300)), served('a', ago(290)), calved('a', ago(100))]);
    expect(f.map((x) => x.kind)).toEqual(['not_served']);
  });

  it('is not raised for a cow recorded as pregnant, on her profile or by a positive pregnancy check', () => {
    expect(flags([cow('a', { isPregnant: true })], [calved('a', ago(200))])).toEqual([]);
    expect(flags([cow('a')], [calved('a', ago(200)), served('a', ago(150)), check('a', ago(100), 'positive')])).toEqual([]);
  });

  it('never flags a heifer that has never calved, a calf, a bull, or an animal that has gone', () => {
    expect(flags([cow('heifer', { status: 'pregnant_heifer', parity: 0 })], [])).toEqual([]);
    expect(flags([cow('noRecords')], [])).toEqual([]); // a cow whose calvings were never entered: nothing to count from
    for (const over of [{ status: 'calf' as const }, { sex: 'male' as const }, { status: 'sold' as const }, { status: 'deceased' as const }, { status: 'archived' as const }]) {
      expect(flags([cow('a', over)], [calved('a', ago(200))]), JSON.stringify(over)).toEqual([]);
    }
  });

  it('counts a stillbirth as a calving but not an abortion', () => {
    expect(flags([cow('a')], [calved('a', ago(100), 'stillborn')]).map((x) => x.kind)).toEqual(['not_served']);
    expect(flags([cow('a')], [calved('a', ago(300)), calved('a', ago(100), 'aborted')])[0].daysSinceCalving).toBe(300); // counted from the last real calving
    expect(calvingDates('a', [calved('a', ago(300)), calved('a', ago(100), 'aborted'), calved('a', ago(10), 'stillborn')])).toEqual([ago(300), ago(10)]);
  });
});

describe('repeat service', () => {
  const base = [calved('a', ago(150))];

  it(`flags ${REPEAT_SERVICE_COUNT} or more inseminations since the last calving with no positive pregnancy check`, () => {
    expect(REPEAT_SERVICE_COUNT).toBe(3);
    expect(flags([cow('a')], [...base, served('a', ago(90)), served('a', ago(69))])).toEqual([]);
    const [f] = flags([cow('a')], [...base, served('a', ago(90)), served('a', ago(69)), served('a', ago(48))]);
    expect(f).toMatchObject({ kind: 'repeat_service', cowId: 'a', services: 3 });
    expect(flags([cow('a')], [...base, ...[100, 80, 60, 40].map((d) => served('a', ago(d)))])[0].services).toBe(4);
  });

  it('is closed by a positive pregnancy check, but not by a negative one', () => {
    const three = [...base, served('a', ago(90)), served('a', ago(69)), served('a', ago(48))];
    expect(flags([cow('a')], [...three, check('a', ago(20), 'negative')]).map((x) => x.kind)).toEqual(['repeat_service']);
    expect(flags([cow('a')], [...three, check('a', ago(20), 'positive')])).toEqual([]);
    // a positive result recorded on the insemination itself counts as well
    expect(flags([cow('a')], [...base, served('a', ago(90)), served('a', ago(69)), served('a', ago(48), { pregnancyResult: 'positive' })])).toEqual([]);
  });

  it('does not count inseminations from before her last calving', () => {
    const f = flags([cow('a')], [served('a', ago(500)), served('a', ago(480)), served('a', ago(460)), calved('a', ago(200)), served('a', ago(150))]);
    expect(f).toEqual([]);
  });

  it('a pregnancy that ended in an abortion no longer protects her', () => {
    const f = flags([cow('a')], [...base, served('a', ago(100)), check('a', ago(60), 'positive'), calved('a', ago(30), 'aborted')]);
    expect(f).toEqual([]); // one service, calved 150 days ago: not served is false (served), repeat needs three
    const g = flags([cow('a')], [...base, served('a', ago(110)), served('a', ago(100)), served('a', ago(90)), check('a', ago(60), 'positive'), calved('a', ago(30), 'aborted')]);
    expect(g.map((x) => x.kind)).toEqual(['repeat_service']);
  });

  it('there is at most one flag of each kind per cow, and the kinds never overlap', () => {
    const all = flags([cow('a'), cow('b')], [calved('a', ago(120)), calved('b', ago(150)), served('b', ago(90)), served('b', ago(70)), served('b', ago(50))]);
    expect(all.map((x) => `${x.cowId}:${x.kind}`)).toEqual(['a:not_served', 'b:repeat_service']);
    expect(new Set(all.map((x) => x.id)).size).toBe(all.length);
  });
});

describe('days open and the calving interval', () => {
  it('days open is the days to today when she is not pregnant', () => {
    expect(fertilityFacts(cow('a'), [calved('a', ago(104))], TODAY)).toMatchObject({ daysOpen: 104, daysSinceCalving: 104, pregnant: false });
  });

  it('days open is the days from the calving to the insemination that led to a positive check', () => {
    const f = fertilityFacts(cow('a'), [calved('a', ago(200)), served('a', ago(130)), served('a', ago(110)), served('a', ago(90)), check('a', ago(60), 'positive')], TODAY);
    expect(f.pregnant).toBe(true);
    expect(f.daysOpen).toBe(110); // calving 200 days ago, conceived on the insemination 90 days ago, the latest before the check
    const g = fertilityFacts(cow('a'), [calved('a', ago(200)), served('a', ago(120), { pregnancyResult: 'positive' })], TODAY);
    expect(g.daysOpen).toBe(80);
  });

  it('shows no days open when the records do not say which insemination, or when she has no calving', () => {
    expect(fertilityFacts(cow('a', { isPregnant: true }), [calved('a', ago(200))], TODAY).daysOpen).toBeNull();
    expect(fertilityFacts(cow('a'), [served('a', ago(10))], TODAY)).toMatchObject({ lastCalving: null, daysOpen: null, calvingIntervalDays: null });
  });

  it('the calving interval is the days between her two most recent calvings, counting a stillbirth and not an abortion', () => {
    expect(fertilityFacts(cow('a'), [calved('a', ago(500)), calved('a', ago(100))], TODAY).calvingIntervalDays).toBe(400);
    expect(fertilityFacts(cow('a'), [calved('a', ago(900)), calved('a', ago(500)), calved('a', ago(100), 'stillborn')], TODAY).calvingIntervalDays).toBe(400);
    expect(fertilityFacts(cow('a'), [calved('a', ago(500)), calved('a', ago(300), 'aborted'), calved('a', ago(100))], TODAY).calvingIntervalDays).toBe(400);
    expect(fertilityFacts(cow('a'), [calved('a', ago(100))], TODAY).calvingIntervalDays).toBeNull(); // only one calving
  });

  it('ignores records dated after today', () => {
    expect(fertilityFacts(cow('a'), [calved('a', ago(100)), served('a', addDays(TODAY, 3))], TODAY).servicesSinceCalving).toBe(0);
  });
});

describe('who gets it, and the wording', () => {
  const live = (plan: string, status = 'active') => ({ plan, status, renewsAt: new Date(Date.now() + 5 * 86_400_000).toISOString() });

  it('is Farmer and up (and a trial), not Starter', () => {
    expect(canUse(live('starter'), 'fertility')).toBe(false);
    expect(canUse(live('farmer'), 'fertility')).toBe(true);
    expect(canUse(live('custom'), 'fertility')).toBe(true);
    expect(canUse(live('starter', 'trial'), 'fertility')).toBe(true);
  });

  it('says what the records show, in the spec wording, and never names a diagnosis or a medicine', () => {
    expect(FERTILITY_COPY.en.notServed('Malkia', 104)).toBe('Malkia calved 104 days ago and has not been served. Watch for heat or ask your inseminator.');
    expect(FERTILITY_COPY.en.repeat('Malkia', 3)).toBe('Malkia has been served 3 times without holding. Ask a vet to examine her.');
    expect(FERTILITY_COPY.en.daysOpen(104)).toBe('Days open: 104');
    expect(FERTILITY_COPY.en.interval(412)).toBe('Last calving interval: 412 days');
    for (const text of [FERTILITY_COPY.en.notServed('A', 100), FERTILITY_COPY.en.repeat('A', 3)]) expect(text).not.toMatch(/infection|disease|antibiotic|hormone|cyst|brucell|treat/i);
    expect(FERTILITY_COPY.sw.notServed('Malkia', 104)).toContain('104');
  });
});

describe('the demo farm', () => {
  it('has one cow not served, one served repeatedly, and days open and an interval on another', () => {
    const today = farmToday();
    const found = fertilityFlags({ cows: initialCows, breeding: initialBreedingEvents, today });
    expect(found.map((f) => `${f.cowName}:${f.kind}`)).toEqual(['Cheyech:not_served', 'Amani:repeat_service']);
    expect(found[0].daysSinceCalving).toBe(104);
    expect(found[1].services).toBe(3);
    const neema = initialCows.find((c) => c.name === 'Neema')!;
    expect(fertilityFacts(neema, initialBreedingEvents, today)).toMatchObject({ pregnant: true, daysOpen: 78, calvingIntervalDays: 380 });
  });
});
