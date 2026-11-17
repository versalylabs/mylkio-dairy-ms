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

/**
 * What a plan includes: one flag per feature. Starter records, Farmer explains, Farm Pro oversees.
 * Nothing here is a price or a limit on the records themselves: records are never locked (see lib/billing.ts).
 */
export interface PlanFeatures {
  /** Emergency-signs guide and county reporting contacts. Safety information: on every plan. */
  illnessGuide: boolean;
  /** Seasonal risk calendar. On every plan. */
  seasonalCalendar: boolean;
  /** Milk produced against milk sold, and what was not sold. Every plan. */
  producedVsSold: boolean;
  /** Reminders as phone notifications (the app can be closed). Every plan. */
  reminderPush: boolean;
  /** The symptom checker ("what the signs could fit", with reasons and sources). Free to run, so no usage limit. */
  healthChecker: boolean;
  /**
   * How many AI photo readings a farm may run each month. The AI photo reading is not built (see
   * docs/vet-and-illness-feature.md); the symptom checker itself costs nothing per use and is not limited.
   */
  healthChecksPerMonth: number;
  /** What it costs to produce a litre, against what buyers pay (Finance). Farmer and up. */
  costPerLitre: boolean;
  /** A cow whose milk has dropped, and a ranking of the cows this week. Farmer and up. */
  milkDrop: boolean;
  /** Cows not served, and cows served again and again without holding. Farmer and up. */
  fertility: boolean;
  /** The most important reminders as an SMS. Farmer and up (also needs the owner to switch it on). */
  reminderSms: boolean;
  /** Vet finder and send-case-to-vet (step C). */
  vetFinder: boolean;
  /** More than one login per farm. The size of the team is set by the plan (lib/team.ts). */
  teamLogins: boolean;
  /** A weekly summary of the farm for the owner. Farm Pro and up. */
  weeklySummary: boolean;
  /** A one-page farm report for a bank or SACCO. Farm Pro and up. */
  farmReport: boolean;
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

const STARTER_FEATURES: PlanFeatures = {
  illnessGuide: true, seasonalCalendar: true, producedVsSold: true, reminderPush: true,
  healthChecker: false, healthChecksPerMonth: 0, costPerLitre: false, milkDrop: false, fertility: false, reminderSms: false,
  vetFinder: false, teamLogins: false, weeklySummary: false, farmReport: false,
};
const FARMER_FEATURES: PlanFeatures = {
  ...STARTER_FEATURES,
  healthChecker: true, healthChecksPerMonth: 10, costPerLitre: true, milkDrop: true, fertility: true, reminderSms: true,
};
const FARM_PRO_FEATURES: PlanFeatures = {
  ...FARMER_FEATURES,
  healthChecksPerMonth: 40, vetFinder: true, teamLogins: true, weeklySummary: true, farmReport: true,
};

export const PLANS: Record<PlanId, Plan> = {
  starter: { id: 'starter', name: 'Starter', priceKsh: 700, cowLimit: 5, features: STARTER_FEATURES },
  farmer: { id: 'farmer', name: 'Farmer', priceKsh: 1300, cowLimit: 25, features: FARMER_FEATURES },
  farm_pro: { id: 'farm_pro', name: 'Farm Pro', priceKsh: 2800, cowLimit: null, features: FARM_PRO_FEATURES },
  // Quoted per farm: the real price lives on the farm's subscription (`monthlyPriceKsh`), so this one is 0.
  // A Custom farm has every Farm Pro feature.
  custom: { id: 'custom', name: 'Custom', priceKsh: 0, cowLimit: null, features: FARM_PRO_FEATURES },
};

const EVERYTHING: PlanFeatures = FARM_PRO_FEATURES;

/**
 * Features whose flag is in the plan table but whose screen is not built yet. The plan descriptions mark these
 * "coming soon" so the website never promises what the app cannot do. Each build step removes its feature from this
 * list in the same pull request that ships it.
 */
export const FEATURES_COMING_SOON: ReadonlySet<FeatureId> = new Set<FeatureId>([
  'fertility', 'weeklySummary', 'farmReport', 'reminderPush', 'reminderSms',
]);

/** The cheapest self-serve plan that includes a feature (so a locked line can name it). */
export function minimumPlanFor(feature: FeatureId): SelfServePlanId {
  return PLAN_ORDER.find((id) => PLANS[id].features[feature]) ?? 'farm_pro';
}

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
