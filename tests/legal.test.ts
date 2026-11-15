import { describe, expect, it } from 'vitest';
import { PRIVACY, TERMS, type LegalDocument } from '@/lib/legal';
import { SUPPORT_EMAIL } from '@/lib/contact';
import { GRACE_DAYS } from '@/lib/billing';
import { TRIAL_DAYS } from '@/lib/plans';

const text = (doc: LegalDocument) => doc.sections.flatMap((s) => [s.heading, ...(s.paragraphs ?? []), ...(s.bullets ?? [])]).join('\n');

describe('privacy notice and terms of use', () => {
  it('have a real body: every section has a heading and something to read, with no blanks', () => {
    for (const doc of [PRIVACY, TERMS]) {
      expect(doc.sections.length).toBeGreaterThanOrEqual(8);
      for (const section of doc.sections) {
        expect(section.heading.trim()).not.toBe('');
        expect((section.paragraphs?.length ?? 0) + (section.bullets?.length ?? 0)).toBeGreaterThan(0);
        for (const line of [...(section.paragraphs ?? []), ...(section.bullets ?? [])]) expect(line.trim().length).toBeGreaterThan(20);
      }
    }
  });

  it('tell people how to reach us, and use the same address as the website', () => {
    expect(text(PRIVACY)).toContain(SUPPORT_EMAIL);
    expect(text(TERMS)).toContain(SUPPORT_EMAIL);
  });

  it('say where the data is kept and who handles it, because that is what a privacy notice is for', () => {
    const privacy = text(PRIVACY);
    expect(privacy).toMatch(/Neon/);
    expect(privacy).toMatch(/Vercel/);
    expect(privacy).toMatch(/Frankfurt/);
    expect(privacy).toMatch(/outside Kenya/);
    expect(privacy).toMatch(/Data Protection Act, 2019/);
    expect(privacy).toMatch(/Data Protection Commissioner/);
    expect(privacy).toMatch(/do not sell/i);
  });

  it('match what the product really does: the trial length and the grace period', () => {
    const terms = text(TERMS);
    expect(terms).toContain(`${TRIAL_DAYS}-day free trial`);
    expect(GRACE_DAYS).toBe(7); // the terms say "more than a week late"
    expect(terms).toContain('more than a week late');
    expect(terms).toMatch(/never lock you out of your records/);
  });

  it('keep the medical and money limits in plain view', () => {
    const terms = text(TERMS);
    expect(terms).toMatch(/not a substitute for a veterinarian/);
    expect(terms).toMatch(/call a vet/);
    expect(terms).toMatch(/responsible for checking medicine labels/);
  });
});
