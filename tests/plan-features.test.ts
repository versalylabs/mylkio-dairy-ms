import { describe, expect, it } from 'vitest';
import { FEATURES_COMING_SOON, PLANS, PLAN_ORDER, canUse, featuresFor, minimumPlanFor, type FeatureId } from '@/lib/plans';
import { FEATURE_NAMES, PLAN_TEXT, featureLabel, lockedLine, planFeatureLines } from '@/lib/plan-copy';
import { TEAM_LOGINS } from '@/lib/team';

const day = 86_400_000;
const NOW = new Date('2026-11-16T09:00:00+03:00');
const sub = (plan: string, status: string, offsetDays: number) => ({ plan, status, renewsAt: new Date(NOW.getTime() + offsetDays * day).toISOString() });

/** Build spec, Change 2: which plan has which feature. */
const TABLE: Record<FeatureId, 'starter' | 'farmer' | 'farm_pro'> = {
  illnessGuide: 'starter', seasonalCalendar: 'starter', producedVsSold: 'starter', reminderPush: 'starter',
  healthChecker: 'farmer', costPerLitre: 'farmer', milkDrop: 'farmer', fertility: 'farmer', reminderSms: 'farmer',
  vetFinder: 'farm_pro', teamLogins: 'farm_pro', weeklySummary: 'farm_pro', farmReport: 'farm_pro',
};
const RANK = { starter: 0, farmer: 1, farm_pro: 2 };

describe('which plan has which feature', () => {
  it('matches the plan table, one flag per feature', () => {
    for (const [feature, lowest] of Object.entries(TABLE) as [FeatureId, keyof typeof RANK][]) {
      for (const id of PLAN_ORDER) {
        expect(PLANS[id].features[feature], `${id} ${feature}`).toBe(RANK[id] >= RANK[lowest]);
      }
      expect(PLANS.custom.features[feature], `custom ${feature}`).toBe(true);
      expect(minimumPlanFor(feature), feature).toBe(lowest);
    }
  });

  it('has a flag for every feature in the table and no flag the table does not know', () => {
    const flags = Object.keys(PLANS.starter.features).filter((k) => k !== 'healthChecksPerMonth').sort();
    expect(flags).toEqual(Object.keys(TABLE).sort());
  });

  it('keeps safety information on every plan', () => {
    for (const id of [...PLAN_ORDER, 'custom'] as const) {
      expect(PLANS[id].features.illnessGuide).toBe(true);
      expect(PLANS[id].features.seasonalCalendar).toBe(true);
    }
  });

  it('agrees with the team size of each plan: team logins on exactly the plans that have more than one login', () => {
    for (const id of [...PLAN_ORDER, 'custom'] as const) expect(PLANS[id].features.teamLogins, id).toBe(TEAM_LOGINS[id] > 1);
  });

  it('gives a trial the Farmer set, so trial farms get cost per litre, milk drop, fertility and SMS', () => {
    const trial = featuresFor(sub('starter', 'trial', 5), NOW);
    expect(trial).toEqual(PLANS.farmer.features);
    for (const feature of ['costPerLitre', 'milkDrop', 'fertility', 'reminderSms'] as const) expect(trial[feature]).toBe(true);
    expect(trial.weeklySummary).toBe(false);
  });

  it('pauses every paid extra, and keeps the Starter set, when a trial has ended, a payment is over 7 days late or the plan is cancelled', () => {
    const cases = [sub('farmer', 'trial', -1), sub('farm_pro', 'active', -8), sub('farm_pro', 'cancelled', 10), sub('custom', 'active', -8)];
    for (const subscription of cases) {
      expect(featuresFor(subscription, NOW), JSON.stringify(subscription)).toEqual(PLANS.starter.features);
    }
    // ...but not while a payment is only a few days late (the grace period), and Starter features never pause
    expect(featuresFor(sub('farm_pro', 'active', -3), NOW)).toEqual(PLANS.farm_pro.features);
    expect(canUse(sub('farm_pro', 'active', -30), 'producedVsSold')).toBe(true);
    expect(canUse(sub('farm_pro', 'active', -30), 'costPerLitre')).toBe(false);
  });

  it('gives the platform administrator account everything', () => {
    expect(Object.values(featuresFor({ plan: 'admin', status: 'active' })).every(Boolean)).toBe(true);
  });
});

describe('the locked-feature line', () => {
  it('names the plan that includes the feature, in both languages', () => {
    expect(lockedLine('costPerLitre', 'en')).toBe('Cost per litre is part of the Farmer plan.');
    expect(lockedLine('weeklySummary', 'en')).toBe('Weekly owner summary is part of the Farm Pro plan.');
    expect(lockedLine('vetFinder', 'en')).toBe('Vets near you is part of the Farm Pro plan.');
    expect(lockedLine('costPerLitre', 'sw')).toBe('Gharama kwa lita ni sehemu ya mpango wa Farmer.');
  });

  it('has a name in both languages for every feature', () => {
    for (const feature of Object.keys(TABLE) as FeatureId[]) {
      expect(FEATURE_NAMES.en[feature].trim().length, feature).toBeGreaterThan(2);
      expect(FEATURE_NAMES.sw[feature].trim().length, feature).toBeGreaterThan(2);
    }
  });
});

describe('plan descriptions never promise what is not built', () => {
  it('mark a feature that is not built yet "coming soon", and the checker "coming after vet review" until a vet approves it', () => {
    expect(FEATURES_COMING_SOON.has('milkDrop')).toBe(true);
    expect(featureLabel('milkDrop', 'en', false)).toBe('Milk drop alerts and cow ranking (coming soon)');
    expect(featureLabel('costPerLitre', 'en', false)).toBe('Cost per litre'); // built
    expect(featureLabel('healthChecker', 'en', false)).toBe('Symptom checker (coming after vet review)');
    expect(featureLabel('healthChecker', 'en', true)).toBe('Symptom checker');
    expect(featureLabel('vetFinder', 'en', false)).toBe('Vets near you'); // built, and live
    expect(featureLabel('milkDrop', 'sw', false)).toContain(PLAN_TEXT.sw.comingSoon);
  });

  it('list each plan on top of the one below it', () => {
    const farmer = planFeatureLines('farmer', 'en', false);
    expect(farmer[0]).toBe('Everything in Starter');
    expect(farmer).toContain('Symptom checker (coming after vet review)');
    expect(farmer).toContain('Cost per litre');
    expect(farmer.join(' ')).not.toMatch(/Vets near you|Weekly owner summary/);
    const pro = planFeatureLines('farm_pro', 'en', false);
    expect(pro[0]).toBe('Everything in Farmer');
    expect(pro.join(' ')).toMatch(/Vets near you/);
    expect(pro.join(' ')).toMatch(/Team logins/);
    expect(planFeatureLines('custom', 'en', false)[0]).toBe('Everything in Farm Pro');
    expect(planFeatureLines('starter', 'en', false)[0]).toMatch(/^Your farm records/);
  });

  it('say the same things in Kiswahili', () => {
    expect(planFeatureLines('farmer', 'sw', false).length).toBe(planFeatureLines('farmer', 'en', false).length);
    expect(planFeatureLines('farmer', 'sw', false)[0]).toBe('Kila kitu kilicho kwenye Starter');
  });
});
