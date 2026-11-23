import { describe, expect, it } from 'vitest';
import { ALL_LINKS, COMMUNITY_SECTION, FEATURES, buildFaqs } from '@/components/marketing/content';
import { FEATURES_COMING_SOON, PLANS } from '@/lib/plans';
import { planFeatureLines } from '@/lib/plan-copy';

const all = () => [
  ...FEATURES.flatMap((f) => [f.title, f.body, ...f.points]),
  COMMUNITY_SECTION.title, COMMUNITY_SECTION.intro, ...COMMUNITY_SECTION.points,
  ...buildFaqs().flatMap((f) => [f.q, f.a]),
].join('\n');

describe('the website tells people about Community and herd health', () => {
  it('has a Community feature card, a Community section, a menu link and an FAQ', () => {
    expect(FEATURES.some((f) => /Talk with the farms around you/.test(f.title))).toBe(true);
    expect(COMMUNITY_SECTION.points.length).toBeGreaterThanOrEqual(4);
    expect(ALL_LINKS.map((l) => l.href)).toContain('#community');
    expect(buildFaqs().some((f) => /Community groups/.test(f.q))).toBe(true);
  });

  it('has herd-health and vet cards', () => {
    expect(FEATURES.some((f) => /cow in trouble/.test(f.title))).toBe(true);
    expect(FEATURES.some((f) => /Reach a vet/.test(f.title))).toBe(true);
  });

  it('says the same plan as the plan table: Community is Farm Pro and Custom only', () => {
    expect(PLANS.farm_pro.features.community && PLANS.custom.features.community).toBe(true);
    expect(PLANS.farmer.features.community || PLANS.starter.features.community).toBe(false);
    expect(planFeatureLines('farm_pro', 'en', false).join(' ')).toMatch(/Community/);
    expect(planFeatureLines('farmer', 'en', false).join(' ')).not.toMatch(/Community/);
    expect(FEATURES_COMING_SOON.has('community')).toBe(false);
  });
});

describe('the website promises only what is built', () => {
  it('never says Mylkio diagnoses, and says a vet is the answer for a sick animal', () => {
    const text = all();
    expect(text).toMatch(/not a diagnosis|never a diagnosis/);
    expect(text).toMatch(/call a vet/i);
    expect(text).not.toMatch(/diagnoses your|will diagnose|AI diagnos/i);
  });

  it('says the symptom checker and emergency guide are still being reviewed, not that they are live', () => {
    expect(all()).toMatch(/being reviewed by a veterinarian/);
  });

  it('does not advertise outbreak reports, official alerts or photos, which are not built', () => {
    expect(all()).not.toMatch(/outbreak report|official alert|share (a )?photo/i);
  });
});
