import { afterEach, describe, expect, it, vi } from 'vitest';
import { RED_FLAGS, SIGNS, overallUrgency, screenRedFlags } from '@/lib/vet/red-flags';
import { SEASONS, seasonForDate, seasonForMonth } from '@/lib/vet/seasonal';
import { draftContentAllowed, reviewProblem, visibleEntries } from '@/lib/vet/review';

afterEach(() => vi.unstubAllEnvs());

// Everything a farmer can read in the guide, as one searchable string per entry.
const flagText = (f: (typeof RED_FLAGS)[number]) => [f.title, f.why, ...f.doNow, ...f.doNot].join(' ');
const seasonText = (s: (typeof SEASONS)[number]) => [s.name, s.summary, ...s.risks.flatMap((r) => [r.title, r.why, ...r.prevention])].join(' ');

describe('red-flag content', () => {
  it('has unique ids, and every trigger refers to a real sign', () => {
    expect(new Set(RED_FLAGS.map((f) => f.id)).size).toBe(RED_FLAGS.length);
    expect(new Set(SIGNS.map((s) => s.id)).size).toBe(SIGNS.length);
    const known = new Set(SIGNS.map((s) => s.id));
    for (const flag of RED_FLAGS) {
      expect(flag.triggers.length, flag.id).toBeGreaterThan(0);
      for (const group of flag.triggers) {
        expect(group.length, flag.id).toBeGreaterThan(0);
        for (const sign of group) expect(known.has(sign), `${flag.id}: ${sign}`).toBe(true);
      }
    }
  });

  it('shows no sign that can never lead to guidance', () => {
    const used = new Set(RED_FLAGS.flatMap((f) => f.triggers.flat()));
    for (const sign of SIGNS) expect(used.has(sign.id), sign.id).toBe(true);
  });

  it('always tells the farmer what to do, and to call a vet for anything urgent', () => {
    for (const flag of RED_FLAGS) {
      expect(flag.doNow.length, flag.id).toBeGreaterThan(0);
      expect(flag.doNot.length, flag.id).toBeGreaterThan(0);
      expect(flag.doNow.join(' ').toLowerCase(), flag.id).toMatch(/call/);
    }
  });

  it('never names a drug or a dose, and never calls milk safe', () => {
    const drugs = /\b(penicillin|penstrep|oxytetracycline|tetracycline|amoxicillin|streptomycin|ivermectin|albendazole|diclofenac|dexamethasone|flunixin|calcium borogluconate|oxytocin|\d+\s?(ml|mg|cc|iu|litres?|g|kg)\b)/i;
    for (const flag of RED_FLAGS) {
      const text = flagText(flag);
      expect(text, flag.id).not.toMatch(drugs);
      expect(text, flag.id).not.toMatch(/milk (is|are|remains?) (safe|fine|ok)/i);
    }
    for (const season of SEASONS) expect(seasonText(season), season.id).not.toMatch(drugs);
  });

  it('marks the notifiable and dangerous-to-people conditions', () => {
    const byId = Object.fromEntries(RED_FLAGS.map((f) => [f.id, f]));
    for (const id of ['fmd', 'lsd', 'sudden_death', 'rabies']) expect(byId[id].notifiable, id).toBe(true);
    for (const id of ['sudden_death', 'rabies']) expect(byId[id].humanRisk, id).toBe(true);
    // Anthrax and rabies guidance must keep people away from the animal.
    expect(flagText(byId.sudden_death)).toMatch(/do not open/i);
    expect(flagText(byId.rabies)).toMatch(/health/i);
  });
});

describe('the red-flag screen', () => {
  it('finds nothing when nothing is ticked, and ignores unknown signs', () => {
    expect(screenRedFlags([])).toEqual([]);
    expect(screenRedFlags(['not_a_sign'])).toEqual([]);
  });

  it('reaches every red flag through its own signs', () => {
    for (const flag of RED_FLAGS) {
      for (const group of flag.triggers) {
        expect(screenRedFlags(group).map((f) => f.id), `${flag.id} via ${group}`).toContain(flag.id);
      }
    }
  });

  it('flags bloat and foot-and-mouth as emergencies, with foot-and-mouth reportable', () => {
    const bloat = screenRedFlags(['swollen_left_flank']);
    expect(bloat.map((f) => f.id)).toEqual(['bloat']);
    expect(bloat[0].urgency).toBe('emergency');
    const fmd = screenRedFlags(['blisters_feet']);
    expect(fmd[0]).toMatchObject({ id: 'fmd', notifiable: true });
  });

  it('needs both signs when a flag asks for both', () => {
    expect(screenRedFlags(['hot_hard_udder'])).toEqual([]);
    expect(screenRedFlags(['hot_hard_udder', 'high_fever_dull']).map((f) => f.id)).toContain('toxic_mastitis');
    expect(screenRedFlags(['hot_hard_udder', 'not_eating']).map((f) => f.id)).toContain('toxic_mastitis');
  });

  it('lists emergencies before same-day items, and reportable ones first', () => {
    const matches = screenRedFlags(['bloody_diarrhoea', 'skin_nodules', 'swollen_left_flank', 'blisters_mouth']);
    expect(matches.map((f) => f.urgency)).toEqual(['emergency', 'emergency', 'today', 'today']);
    expect(matches[0].id).toBe('fmd'); // reportable emergency before the other emergency
    expect(matches[2].id).toBe('lsd'); // reportable same-day before the other same-day
  });

  it('reports the most urgent level, or none', () => {
    expect(overallUrgency([])).toBeNull();
    expect(overallUrgency(screenRedFlags(['bloody_diarrhoea']))).toBe('today');
    expect(overallUrgency(screenRedFlags(['bloody_diarrhoea', 'down_cannot_rise']))).toBe('emergency');
  });

  it('does not match on partial combinations', () => {
    expect(screenRedFlags(['milk_dropped'])).toEqual([]);
    expect(screenRedFlags(['high_fever_dull'])).toEqual([]);
  });
});

describe('seasonal calendar', () => {
  it('covers every month exactly once', () => {
    const months = SEASONS.flatMap((s) => s.months).sort((a, b) => a - b);
    expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (let m = 1; m <= 12; m++) expect(seasonForMonth(m).months).toContain(m);
  });

  it('rejects a month that does not exist', () => {
    expect(() => seasonForMonth(0)).toThrow(RangeError);
    expect(() => seasonForMonth(13)).toThrow(RangeError);
  });

  it('picks the season from a farm date', () => {
    expect(seasonForDate('2026-11-14').id).toBe('short_rains');
    expect(seasonForDate('2026-04-02').id).toBe('long_rains');
    expect(seasonForDate('2026-01-31').id).toBe('short_dry');
    expect(seasonForDate('2026-07-09').id).toBe('long_dry');
  });

  it('gives every risk a reason and at least one thing to do', () => {
    for (const season of SEASONS) {
      expect(season.risks.length, season.id).toBeGreaterThan(0);
      for (const risk of season.risks) {
        expect(risk.why.length, risk.title).toBeGreaterThan(10);
        expect(risk.prevention.length, risk.title).toBeGreaterThan(0);
      }
    }
  });

  it('warns about Rift Valley fever only after the heavy rains', () => {
    const has = (id: string) => seasonText(SEASONS.find((s) => s.id === id)!).includes('Rift Valley fever');
    expect(has('short_rains')).toBe(true);
    expect(has('long_dry')).toBe(false);
  });
});

describe('veterinary review gate', () => {
  it('currently contains only drafts, so nothing reaches live farms', () => {
    expect(RED_FLAGS.every((f) => f.review.status === 'draft')).toBe(true);
    expect(SEASONS.every((s) => s.review.status === 'draft')).toBe(true);
    expect(visibleEntries(RED_FLAGS, false)).toEqual([]);
    expect(visibleEntries(SEASONS, false)).toEqual([]);
  });

  it('shows drafts only where drafts are switched on', () => {
    expect(visibleEntries(RED_FLAGS, true)).toHaveLength(RED_FLAGS.length);
    expect(draftContentAllowed()).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_SHOW_DRAFT_VET_CONTENT', 'true');
    expect(draftContentAllowed()).toBe(true);
    vi.stubEnv('NEXT_PUBLIC_SHOW_DRAFT_VET_CONTENT', 'yes');
    expect(draftContentAllowed()).toBe(false);
  });

  it('shows approved entries everywhere', () => {
    const entries = [
      { id: 'a', review: { status: 'approved' as const, reviewedBy: 'Dr Example', reviewedOn: '2026-12-01' } },
      { id: 'b', review: { status: 'draft' as const } },
    ];
    expect(visibleEntries(entries, false).map((e) => e.id)).toEqual(['a']);
    expect(visibleEntries(entries, true).map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('refuses an approval without a named reviewer and a date, and a draft that claims one', () => {
    expect(reviewProblem({ status: 'draft' })).toBeNull();
    expect(reviewProblem({ status: 'approved', reviewedBy: 'Dr Example', reviewedOn: '2026-12-01' })).toBeNull();
    expect(reviewProblem({ status: 'approved' })).toMatch(/reviewer/);
    expect(reviewProblem({ status: 'approved', reviewedBy: 'Dr Example' })).toMatch(/date/);
    expect(reviewProblem({ status: 'approved', reviewedBy: 'Dr Example', reviewedOn: '1 Dec' })).toMatch(/date/);
    expect(reviewProblem({ status: 'draft', reviewedBy: 'Dr Example' })).toMatch(/draft/);
  });

  it('holds every entry in the content files to that rule', () => {
    for (const entry of [...RED_FLAGS, ...SEASONS]) expect(reviewProblem(entry.review), entry.id).toBeNull();
  });
});
