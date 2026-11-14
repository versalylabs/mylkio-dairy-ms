import { describe, expect, it } from 'vitest';
import { PLANS, PLAN_ORDER, TRIAL_DAYS, pricingSentence } from '@/lib/plans';
import { initialPlatformSettings } from '@/lib/mock-data';
import { freshDatabase } from './db/harness';

describe('plans', () => {
  it('feeds the platform settings used by the website', () => {
    expect(initialPlatformSettings).toMatchObject({
      starterPriceKsh: PLANS.starter.priceKsh,
      farmerPriceKsh: PLANS.farmer.priceKsh,
      proPriceKsh: PLANS.farm_pro.priceKsh,
      trialDays: TRIAL_DAYS,
    });
  });

  it('prices every plan above zero and in ascending order', () => {
    const prices = PLAN_ORDER.map((id) => PLANS[id].priceKsh);
    expect(prices.every((p) => p > 0)).toBe(true);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  it('writes the same prices into the FAQ sentence', () => {
    const text = pricingSentence();
    expect(text).toContain('KSh 500/month');
    expect(text).toContain('KSh 1,000/month');
    expect(text).toContain('KSh 2,500/month');
  });

  it('matches what the database charges and how long the trial lasts', async () => {
    const db = await freshDatabase();
    for (const id of PLAN_ORDER) {
      const user = `owner_${id}`;
      await db.query('select public.provision_farm($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [user, `${user}@example.test`, 'Owner', '0700000000', `Farm ${id}`, 'Nakuru', null, id, 'en']);
      const { rows } = await db.query<{ details: { monthlyPriceKsh: number; startDate: string; renewsAt: string } }>(
        `select s.details from public.subscriptions s join public.farm_memberships m on m.farm_id = s.farm_id where m.user_id = $1`, [user]);
      const d = rows[0].details;
      expect(d.monthlyPriceKsh, `${id} price`).toBe(PLANS[id].priceKsh);
      const days = Math.round((new Date(d.renewsAt).getTime() - new Date(d.startDate).getTime()) / 86_400_000);
      expect(days).toBe(TRIAL_DAYS);
    }
    // Changing a plan as an administrator re-prices it the same way.
    await db.query(`update public.profiles set role = 'super_admin' where id = 'owner_starter'`);
    const farm = (await db.query<{ farm_id: string }>(`select farm_id from public.farm_memberships where user_id = 'owner_farmer'`)).rows[0].farm_id;
    for (const id of PLAN_ORDER) {
      await db.query('select public.admin_update_subscription($1, $2, $3, $4)', ['owner_starter', farm, id, 'active']);
      const { rows } = await db.query<{ p: number }>(`select (details->>'monthlyPriceKsh')::int as p from public.subscriptions where farm_id = $1`, [farm]);
      expect(rows[0].p, `${id} re-price`).toBe(PLANS[id].priceKsh);
    }
  }, 60_000);
});
