// The one place plan names, prices and limits are defined for the website, sign-up form, demo data
// and admin screens. The database also stores the price when a farm is created or its plan changes
// (`provision_farm` and `admin_update_subscription`); tests/plans.test.ts fails if the two disagree.

export type PlanId = 'starter' | 'farmer' | 'farm_pro';

export interface Plan {
  id: PlanId;
  name: string;
  priceKsh: number;
  /** Largest herd the plan is sold for; null means no limit. */
  cowLimit: number | null;
}

export const PLANS: Record<PlanId, Plan> = {
  starter: { id: 'starter', name: 'Starter', priceKsh: 500, cowLimit: 5 },
  farmer: { id: 'farmer', name: 'Farmer', priceKsh: 1000, cowLimit: 25 },
  farm_pro: { id: 'farm_pro', name: 'Farm Pro', priceKsh: 2500, cowLimit: null },
};

export const PLAN_ORDER: PlanId[] = ['starter', 'farmer', 'farm_pro'];
export const TRIAL_DAYS = 14;

export const formatKsh = (amount: number) => `KSh ${amount.toLocaleString('en-KE')}`;

/** "KSh 500/month for up to 5 cows, KSh 1,000/month … and KSh 2,500/month …" for the FAQ. */
export function pricingSentence() {
  const { starter, farmer, farm_pro } = PLANS;
  return `Plans start at KSh ${starter.priceKsh.toLocaleString('en-KE')}/month for up to ${starter.cowLimit} cows, ${formatKsh(farmer.priceKsh)}/month for growing farms (up to ${farmer.cowLimit} cows), and ${formatKsh(farm_pro.priceKsh)}/month for larger commercial herds.`;
}
