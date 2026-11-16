// The one place plan names, prices and limits are defined for the website, sign-up form, demo data
// and admin screens. The database also stores the price when a farm is created or its plan changes
// (`provision_farm` and `admin_update_subscription`); tests/plans.test.ts fails if the two disagree.

import { extrasLapsed } from './billing';
import { formatKsh } from './money';

export { formatKsh };

/** `custom` is never chosen by a farmer: an administrator sets it, with a price agreed for that farm. */
export type PlanId = 'starter' | 'farmer' | 'farm_pro' | 'custom';
/** The plans a farmer can pick on the website and at sign-up. */
export type SelfServePlanId = Exclude<PlanId, 'custom'>;

/** What a plan includes. See docs/vet-and-illness-feature.md. */
export interface PlanFeatures {
  /** Emergency-signs guide and county reporting contacts. Safety information: on every plan. */
  illnessGuide: boolean;
  /** Seasonal risk calendar. On every plan. */
  seasonalCalendar: boolean;
  /** The symptom checker ("what the signs could fit", with reasons and sources). Free to run, so no usage limit. */
  healthChecker: boolean;
  /**
   * How many AI photo readings a farm may run each month. The AI photo reading is not built (see
   * docs/vet-and-illness-feature.md); the symptom checker itself costs nothing per use and is not limited.
   */
  healthChecksPerMonth: number;
  /** Vet finder and send-case-to-vet (step C). */
  vetFinder: boolean;
}

export type FeatureId = Exclude<keyof PlanFeatures, 'healthChecksPerMonth'>;

export interface Plan {
  id: PlanId;
  name: string;
  priceKsh: number;
  /** Largest herd the plan is sold for; null means no limit. */
  cowLimit: number | null;
  features: PlanFeatures;
}

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: 'starter', name: 'Starter', priceKsh: 700, cowLimit: 5,
    features: { illnessGuide: true, seasonalCalendar: true, healthChecker: false, healthChecksPerMonth: 0, vetFinder: false },
  },
  farmer: {
    id: 'farmer', name: 'Farmer', priceKsh: 1300, cowLimit: 25,
    features: { illnessGuide: true, seasonalCalendar: true, healthChecker: true, healthChecksPerMonth: 10, vetFinder: false },
  },
  farm_pro: {
    id: 'farm_pro', name: 'Farm Pro', priceKsh: 2800, cowLimit: null,
    features: { illnessGuide: true, seasonalCalendar: true, healthChecker: true, healthChecksPerMonth: 40, vetFinder: true },
  },
  // Quoted per farm: the real price lives on the farm's subscription (`monthlyPriceKsh`), so this one is 0.
  // A Custom farm has every Farm Pro feature.
  custom: {
    id: 'custom', name: 'Custom', priceKsh: 0, cowLimit: null,
    features: { illnessGuide: true, seasonalCalendar: true, healthChecker: true, healthChecksPerMonth: 40, vetFinder: true },
  },
};

const EVERYTHING: PlanFeatures = { illnessGuide: true, seasonalCalendar: true, healthChecker: true, healthChecksPerMonth: 40, vetFinder: true };

/**
 * The features a subscription gets. A free trial gets at least the Farmer features so people can try
 * the checker; the platform's own administrator account gets everything. Anything unrecognised gets the
 * smallest plan, never more than was paid for. Servers must use this too: hiding a button in the
 * interface is never the only protection.
 */
export function featuresFor(subscription: { plan: string; status?: string; renewsAt?: string } | null | undefined, now: Date = new Date()): PlanFeatures {
  if (!subscription) return PLANS.starter.features;
  if (subscription.plan === 'admin') return EVERYTHING;
  // Trial over, payment well late, or cancelled: the extras pause (records never do). See lib/billing.ts.
  if (extrasLapsed(subscription, now)) return PLANS.starter.features;
  const plan = (PLANS as Record<string, Plan | undefined>)[subscription.plan] ?? PLANS.starter;
  if (subscription.status === 'trial' && plan.id === 'starter') return PLANS.farmer.features;
  return plan.features;
}

export const canUse = (subscription: { plan: string; status?: string; renewsAt?: string } | null | undefined, feature: FeatureId) =>
  featuresFor(subscription)[feature];

export const PLAN_ORDER: SelfServePlanId[] = ['starter', 'farmer', 'farm_pro'];
export const TRIAL_DAYS = 14;

/** "KSh 700/month for up to 5 cows, KSh 1,300/month … and KSh 2,800/month …" for the FAQ. */
export function pricingSentence(prices: Record<SelfServePlanId, number> = { starter: PLANS.starter.priceKsh, farmer: PLANS.farmer.priceKsh, farm_pro: PLANS.farm_pro.priceKsh }) {
  const { starter, farmer } = PLANS;
  return `Plans start at ${formatKsh(prices.starter)}/month for up to ${starter.cowLimit} cows, ${formatKsh(prices.farmer)}/month for growing farms (up to ${farmer.cowLimit} cows), and ${formatKsh(prices.farm_pro)}/month for larger commercial herds. For a cooperative or a very large farm we quote a Custom plan: talk to us.`;
}
