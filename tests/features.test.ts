import { describe, expect, it } from 'vitest';
import { PLANS, PLAN_ORDER, canUse, featuresFor } from '@/lib/plans';

describe('plan features', () => {
  it('never puts safety information behind a paywall', () => {
    for (const id of PLAN_ORDER) {
      expect(PLANS[id].features.illnessGuide, id).toBe(true);
      expect(PLANS[id].features.seasonalCalendar, id).toBe(true);
    }
  });

  it('gives the checker to Farmer and Farm Pro, and the vet finder only to Farm Pro', () => {
    expect(PLANS.starter.features).toMatchObject({ healthChecker: false, healthChecksPerMonth: 0, vetFinder: false });
    expect(PLANS.farmer.features).toMatchObject({ healthChecker: true, healthChecksPerMonth: 10, vetFinder: false });
    expect(PLANS.farm_pro.features).toMatchObject({ healthChecker: true, vetFinder: true });
    expect(PLANS.farm_pro.features.healthChecksPerMonth).toBeGreaterThan(PLANS.farmer.features.healthChecksPerMonth);
  });

  it('only allows checks on plans that have the checker, and more on higher plans', () => {
    for (const id of PLAN_ORDER) {
      const f = PLANS[id].features;
      expect(f.healthChecker, id).toBe(f.healthChecksPerMonth > 0);
    }
    const limits = PLAN_ORDER.map((id) => PLANS[id].features.healthChecksPerMonth);
    expect([...limits].sort((a, b) => a - b)).toEqual(limits);
  });

  it('follows the plan for a paying account', () => {
    expect(canUse({ plan: 'starter', status: 'active' }, 'healthChecker')).toBe(false);
    expect(canUse({ plan: 'farmer', status: 'active' }, 'healthChecker')).toBe(true);
    expect(canUse({ plan: 'farmer', status: 'active' }, 'vetFinder')).toBe(false);
    expect(canUse({ plan: 'farm_pro', status: 'active' }, 'vetFinder')).toBe(true);
  });

  it('lets a free trial try the checker, but not more than Farmer', () => {
    expect(featuresFor({ plan: 'starter', status: 'trial' })).toEqual(PLANS.farmer.features);
    expect(featuresFor({ plan: 'farmer', status: 'trial' })).toEqual(PLANS.farmer.features);
    expect(canUse({ plan: 'starter', status: 'trial' }, 'vetFinder')).toBe(false);
    // A trial on a higher plan keeps that plan's features.
    expect(featuresFor({ plan: 'farm_pro', status: 'trial' })).toEqual(PLANS.farm_pro.features);
  });

  it('gives the platform administrator account everything', () => {
    const features = featuresFor({ plan: 'admin', status: 'active' });
    expect(features).toMatchObject({ healthChecker: true, vetFinder: true, illnessGuide: true, seasonalCalendar: true });
  });

  it('gives an unknown plan or no subscription only the smallest plan', () => {
    expect(featuresFor(null)).toEqual(PLANS.starter.features);
    expect(featuresFor(undefined)).toEqual(PLANS.starter.features);
    expect(featuresFor({ plan: 'platinum', status: 'active' })).toEqual(PLANS.starter.features);
    expect(canUse({ plan: 'platinum' }, 'vetFinder')).toBe(false);
  });
});
