// The one place plan names, prices and limits are defined for the website, sign-up form, demo data
// and admin screens. The database also stores the price when a farm is created or its plan changes
// (`provision_farm` and `admin_update_subscription`); tests/plans.test.ts fails if the two disagree.

export type PlanId = 'starter' | 'farmer' | 'farm_pro';

/** What a plan includes. See docs/vet-and-illness-feature.md. */
export interface PlanFeatures {
  /** Emergency-signs guide and county reporting contacts. Safety information: on every plan. */
  illnessGuide: boolean;
  /** Seasonal risk calendar. On every plan. */
  seasonalCalendar: boolean;
  /** Photo and symptom health check (step B). */
  healthChecker: boolean;
  /** How many health checks a farm may run each month. */
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
    id: 'starter', name: 'Starter', priceKsh: 500, cowLimit: 5,
    features: { illnessGuide: true, seasonalCalendar: true, healthChecker: false, healthChecksPerMonth: 0, vetFinder: false },
  },
  farmer: {
    id: 'farmer', name: 'Farmer', priceKsh: 1000, cowLimit: 25,
    features: { illnessGuide: true, seasonalCalendar: true, healthChecker: true, healthChecksPerMonth: 10, vetFinder: false },
  },
  farm_pro: {
    id: 'farm_pro', name: 'Farm Pro', priceKsh: 2500, cowLimit: null,
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
export function featuresFor(subscription: { plan: string; status?: string } | null | undefined): PlanFeatures {
  if (!subscription) return PLANS.starter.features;
  if (subscription.plan === 'admin') return EVERYTHING;
  const plan = (PLANS as Record<string, Plan | undefined>)[subscription.plan] ?? PLANS.starter;
  if (subscription.status === 'trial' && plan.id === 'starter') return PLANS.farmer.features;
  return plan.features;
}

export const canUse = (subscription: { plan: string; status?: string } | null | undefined, feature: FeatureId) =>
  featuresFor(subscription)[feature];

export const PLAN_ORDER: PlanId[] = ['starter', 'farmer', 'farm_pro'];
export const TRIAL_DAYS = 14;

export const formatKsh = (amount: number) => `KSh ${amount.toLocaleString('en-KE')}`;

/** "KSh 500/month for up to 5 cows, KSh 1,000/month … and KSh 2,500/month …" for the FAQ. */
export function pricingSentence() {
  const { starter, farmer, farm_pro } = PLANS;
  return `Plans start at KSh ${starter.priceKsh.toLocaleString('en-KE')}/month for up to ${starter.cowLimit} cows, ${formatKsh(farmer.priceKsh)}/month for growing farms (up to ${farmer.cowLimit} cows), and ${formatKsh(farm_pro.priceKsh)}/month for larger commercial herds.`;
}
