import { describe, expect, it } from 'vitest';
import { REPORT_LIMITS, flagsForSigns, outbreakReportsOpen, redFlagsForSign, signById, signGroups, signLabel, SIGN_IDS } from '@/lib/community-outbreak';
import { OUTBREAK_COPY } from '@/lib/outbreak-copy';
import { answerInput, reportInput } from '@/lib/server/community-schemas';
import { PRIVACY } from '@/lib/legal';
import { RED_FLAGS, SIGNS } from '@/lib/vet/red-flags';
import { contactsFor } from '@/lib/vet/contacts';

const ok = { signs: ['blisters_mouth'], animals: 3, days: 2, seenOn: '2026-11-23', vetSeen: 'called' };

describe('the signs come from the vet guide\'s own list', () => {
  it('offers every sign of the guide once, in its own groups, with its own wording', () => {
    const flat = signGroups().flatMap((g) => g.signs);
    expect(flat.map((s) => s.id).sort()).toEqual(SIGNS.map((s) => s.id).sort());
    expect(signLabel('blisters_mouth')).toBe(signById('blisters_mouth')!.label);
    expect(signLabel('not_a_sign')).toBe('not_a_sign');
    expect(SIGN_IDS.size).toBe(SIGNS.length);
  });

  it('accepts only ids in that list, at most 8 and no repeats', () => {
    expect(reportInput.safeParse(ok).success).toBe(true);
    expect(reportInput.safeParse({ ...ok, signs: ['made_up_sign'] }).success).toBe(false);
    expect(reportInput.safeParse({ ...ok, signs: [] }).success).toBe(false);
    expect(reportInput.safeParse({ ...ok, signs: ['cough', 'cough'] }).success).toBe(false);
    expect(reportInput.safeParse({ ...ok, signs: SIGNS.slice(0, REPORT_LIMITS.maxSigns).map((s) => s.id) }).success).toBe(true);
    expect(reportInput.safeParse({ ...ok, signs: SIGNS.slice(0, REPORT_LIMITS.maxSigns + 1).map((s) => s.id) }).success).toBe(false);
  });

  it('limits the numbers and has no free text, so a report cannot name anyone', () => {
    for (const bad of [{ animals: 0 }, { animals: REPORT_LIMITS.maxAnimals + 1 }, { animals: 1.5 }, { days: -1 }, { days: REPORT_LIMITS.maxDays + 1 }, { seenOn: 'yesterday' }, { vetSeen: 'maybe' }, { note: 'Farm X has it' }, { farmName: 'Farm X' }, { area: 'Rongai' }]) {
      expect(reportInput.safeParse({ ...ok, ...bad }).success, JSON.stringify(bad)).toBe(false);
    }
  });

  it('takes an answer only as "also", "not_here" or nothing, for a known sign', () => {
    expect(answerInput.safeParse({ areaKey: 'rongai', sign: 'cough', answer: 'also' }).success).toBe(true);
    expect(answerInput.safeParse({ areaKey: 'rongai', sign: 'cough', answer: null }).success).toBe(true);
    expect(answerInput.safeParse({ areaKey: 'rongai', sign: 'cough', answer: 'maybe' }).success).toBe(false);
    expect(answerInput.safeParse({ areaKey: 'rongai', sign: 'nope', answer: 'also' }).success).toBe(false);
    expect(answerInput.safeParse({ areaKey: '', sign: 'cough', answer: 'also' }).success).toBe(false);
  });
});

describe('red flags come first, and only the content a vet has approved is shown to farmers', () => {
  it('shows nothing from the draft guide on live farms, and the emergency steps where drafts are allowed', () => {
    expect(redFlagsForSign('blisters_mouth', false)).toEqual([]);
    expect(outbreakReportsOpen(false)).toBe(false);
    const flags = redFlagsForSign('blisters_mouth', true);
    expect(flags.map((f) => f.id)).toEqual(['fmd']);
    expect(flags[0].doNow.length).toBeGreaterThan(0);
  });

  it('knows when the signs ticked include a notifiable disease or a risk to people', () => {
    expect(flagsForSigns(['blisters_mouth'], true)).toMatchObject({ notifiable: true, humanRisk: false });
    expect(flagsForSigns(['sudden_death'], true)).toMatchObject({ notifiable: true, humanRisk: true });
    expect(flagsForSigns(['cough'], true)).toMatchObject({ notifiable: false, flags: [] });
    expect(flagsForSigns(['blisters_mouth'], false).flags).toEqual([]);
  });

  it('opens reporting once any entry is approved with a named reviewer, not before', () => {
    const approved = RED_FLAGS.map((f, i) => (i === 0 ? { ...f, review: { status: 'approved' as const, reviewedBy: 'Dr Example', reviewedOn: '2026-12-01' } } : f));
    expect(outbreakReportsOpen(false, approved)).toBe(true);
    expect(outbreakReportsOpen(false, RED_FLAGS)).toBe(false); // the real list is still all drafts
  });
});

describe('the wording of alerts', () => {
  for (const lang of ['en', 'sw'] as const) {
    const t = OUTBREAK_COPY[lang];
    it(`says in ${lang} that it is neighbours' guidance, not a diagnosis, and that a notifiable disease goes to the authorities`, () => {
      expect(t.safety.length).toBeGreaterThan(40);
      expect(t.reportingNote.length).toBeGreaterThan(40);
      expect(t.notifiable.length).toBeGreaterThan(20);
      expect(t.farmsReport(3, 'Rongai')).toContain('Rongai');
      expect(t.farmsReport(3, 'Rongai')).toContain('3');
      expect(t.farmsReport(1, 'Rongai')).toContain('1');
    });
  }

  it('says "counts, not names" in English', () => {
    const t = OUTBREAK_COPY.en;
    expect(t.safety).toMatch(/not a diagnosis/);
    expect(t.safety).toMatch(/Call a vet/);
    expect(t.safety).toMatch(/hold back treatment/);
    expect(t.reportingNote).toMatch(/not a reporting channel/);
    expect(t.reportingNote).toMatch(/must be reported/);
    expect(t.farmsReport(3, 'Rongai')).toBe('3 farms in Rongai report this week:');
    expect(t.counts(2, 1)).toBe('2 say they see this too · 1 say not here');
  });

  it('shows the reporting contacts the vet guide already has, for the farm\'s own county', () => {
    expect(contactsFor('Nairobi County')?.reporting.length).toBeGreaterThan(0);
    expect(contactsFor('Nakuru')).toBeNull(); // then the form shows the guide's general reporting note
  });
});

describe('the Privacy notice covers outbreak reports', () => {
  const text = PRIVACY.sections.flatMap((s) => [s.heading, ...(s.paragraphs ?? []), ...(s.bullets ?? [])]).join('\n');
  it('says what a report holds, who sees the farm, how long it is kept and that it does not replace reporting', () => {
    expect(text).toMatch(/Outbreak reports/);
    expect(text).toMatch(/counts by area, never your farm/);
    expect(text).toMatch(/admin.*can see which farm made a report/);
    expect(text).toMatch(/Reports are deleted after 90 days and answers after 30 days/);
    expect(text).toMatch(/does not replace reporting a notifiable disease/);
  });
});
