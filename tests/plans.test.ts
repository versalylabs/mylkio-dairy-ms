import { describe, expect, it } from 'vitest';
import { PLANS, PLAN_ORDER, TRIAL_DAYS, featuresFor, pricingSentence } from '@/lib/plans';
import { formatKsh, formatKshPerMonth } from '@/lib/money';
import { initialPlatformSettings } from '@/lib/mock-data';
import { teamLoginsFor } from '@/lib/team';
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

  it('has the agreed prices', () => {
    expect([PLANS.starter.priceKsh, PLANS.farmer.priceKsh, PLANS.farm_pro.priceKsh]).toEqual([700, 1300, 2800]);
  });

  it('prices every self-serve plan above zero and in ascending order', () => {
    const prices = PLAN_ORDER.map((id) => PLANS[id].priceKsh);
    expect(prices.every((p) => p > 0)).toBe(true);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  it('keeps Custom out of the plans a farmer can pick, and gives it every Farm Pro feature', () => {
    expect(PLAN_ORDER).not.toContain('custom');
    expect(PLANS.custom.priceKsh).toBe(0); // the price is agreed per farm and lives on the subscription
    expect(PLANS.custom.cowLimit).toBeNull();
    expect(PLANS.custom.features).toEqual(PLANS.farm_pro.features);
    expect(featuresFor({ plan: 'custom', status: 'active', renewsAt: new Date(Date.now() + 86_400_000).toISOString() })).toEqual(PLANS.farm_pro.features);
  });

  it('writes the same prices into the FAQ sentence, with thousands separators', () => {
    const text = pricingSentence();
    expect(text).toContain('KSh 700/month');
    expect(text).toContain('KSh 1,300/month');
    expect(text).toContain('KSh 2,800/month');
    expect(text).toMatch(/Custom plan/);
    expect(text).not.toMatch(/KSh \d{4,}/);
  });

  it('writes every amount the same way: a thousands separator, never "KSh 2800"', () => {
    expect(formatKsh(2800)).toBe('KSh 2,800');
    expect(formatKsh(700)).toBe('KSh 700');
    expect(formatKsh(1234567)).toBe('KSh 1,234,567');
    expect(formatKsh(1250.5)).toBe('KSh 1,250.5');
    expect(formatKshPerMonth(2800, true)).toBe('KSh 2,800/mo');
    expect(formatKshPerMonth(2800)).toBe('KSh 2,800/month');
    expect(formatKsh(Number.NaN)).toBe('KSh 0');
  });

  it('gives a Custom farm its own team size, else the Farm Pro limit', () => {
    expect(teamLoginsFor('custom')).toBe(6);
    expect(teamLoginsFor('custom', 12)).toBe(12);
    expect(teamLoginsFor('farm_pro', 12)).toBe(6); // only a Custom plan can set its own number
    expect(teamLoginsFor('starter')).toBe(1);
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

  it('cannot be chosen at sign-up: asking for Custom gives a Farmer trial', async () => {
    const db = await freshDatabase();
    await db.query('select public.provision_farm($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      ['sneaky', 'sneaky@example.test', 'Owner', '0700000000', 'Sneaky Farm', 'Nakuru', null, 'custom', 'en']);
    const { rows } = await db.query<{ details: { plan: string; monthlyPriceKsh: number } }>(
      `select s.details from public.subscriptions s join public.farm_memberships m on m.farm_id = s.farm_id where m.user_id = 'sneaky'`);
    expect(rows[0].details).toMatchObject({ plan: 'farmer', monthlyPriceKsh: PLANS.farmer.priceKsh });
  }, 60_000);
});

describe('Custom plan, set by an administrator', () => {
  async function setup() {
    const db = await freshDatabase();
    await db.query('select public.provision_farm($1, $2, $3, $4, $5, $6, $7, $8, $9)', ['admin', 'admin@example.test', 'Admin', '0700000001', 'Admin Farm', 'Nairobi', null, 'starter', 'en']);
    await db.query(`update public.profiles set role = 'super_admin' where id = 'admin'`);
    await db.query('select public.provision_farm($1, $2, $3, $4, $5, $6, $7, $8, $9)', ['coop', 'coop@example.test', 'Coop Owner', '0700000002', 'Big Coop', 'Nakuru', null, 'farmer', 'en']);
    const farm = (await db.query<{ farm_id: string }>(`select farm_id from public.farm_memberships where user_id = 'coop'`)).rows[0].farm_id;
    const details = async () => (await db.query<{ details: Record<string, unknown> }>(`select details from public.subscriptions where farm_id = $1`, [farm])).rows[0].details;
    const update = (...args: unknown[]) => db.query('select public.admin_update_subscription($1, $2, $3, $4, $5, $6, $7)', ['admin', farm, ...args]);
    return { db, farm, details, update };
  }

  it('needs the monthly price agreed with the farm', async () => {
    const { update } = await setup();
    await expect(update('custom', 'active', null, null, null)).rejects.toThrow(/monthly price/);
    await expect(update('custom', 'active', 0, null, null)).rejects.toThrow(/monthly price/);
  });

  it('stores the price, the note and the team size on the farm, and keeps them when only the status changes', async () => {
    const { update, details } = await setup();
    await update('custom', 'active', 9500, 'Quarterly invoice, 8 logins', 8);
    expect(await details()).toMatchObject({ plan: 'custom', status: 'active', monthlyPriceKsh: 9500, customNote: 'Quarterly invoice, 8 logins', teamLimit: 8 });
    await update('custom', 'past_due', null, null, null);
    expect(await details()).toMatchObject({ plan: 'custom', status: 'past_due', monthlyPriceKsh: 9500, customNote: 'Quarterly invoice, 8 logins', teamLimit: 8 });
  });

  it('goes back to the plan price, and drops the Custom details, when moved to another plan', async () => {
    const { update, details } = await setup();
    await update('custom', 'active', 9500, 'agreed', 8);
    await update('farm_pro', 'active', null, null, null);
    const d = await details();
    expect(d).toMatchObject({ plan: 'farm_pro', monthlyPriceKsh: PLANS.farm_pro.priceKsh });
    expect(d).not.toHaveProperty('customNote');
    expect(d).not.toHaveProperty('teamLimit');
  });

  it('refuses a silly team size or a very long note', async () => {
    const { update } = await setup();
    await expect(update('custom', 'active', 5000, null, 0)).rejects.toThrow(/Team size/);
    await expect(update('custom', 'active', 5000, null, 101)).rejects.toThrow(/Team size/);
    await expect(update('custom', 'active', 5000, 'x'.repeat(501), null)).rejects.toThrow(/too long/);
  });

  it('only a platform administrator can do it', async () => {
    const { db, farm } = await setup();
    await expect(db.query('select public.admin_update_subscription($1, $2, $3, $4, $5, $6, $7)', ['coop', farm, 'custom', 'active', 5000, null, null])).rejects.toThrow(/Admin required/);
  });

  it('sets how many logins the farm may have, and the invitation limit follows', async () => {
    const { db, farm, update } = await setup();
    const limit = async () => (await db.query<{ l: number }>('select public.team_limit_for_farm($1) as l', [farm])).rows[0].l;
    expect(await limit()).toBe(1); // Farmer: the owner only
    await update('custom', 'active', 5000, null, null);
    expect(await limit()).toBe(6); // Farm Pro default
    await update('custom', 'active', 5000, null, 3);
    expect(await limit()).toBe(3);
    const team = (await db.query<{ t: { limit: number } }>('select public.list_farm_team($1, $2) as t', ['coop', farm])).rows[0].t;
    expect(team.limit).toBe(3);
    await db.query(`select public.create_farm_invite($1, $2, 'worker', 'One', 'ABCDEFGHJK')`, ['coop', farm]);
    await db.query(`select public.create_farm_invite($1, $2, 'worker', 'Two', 'BCDEFGHJKM')`, ['coop', farm]);
    await expect(db.query(`select public.create_farm_invite($1, $2, 'worker', 'Three', 'CDEFGHJKMN')`, ['coop', farm])).rejects.toThrow(/Team full/);
  });

  it('prices a plan at the new built-in price in the database', async () => {
    const { db, farm } = await setup();
    // A trial farm created on the old price list is moved to the new one by migration 0009.
    await db.query(`update public.subscriptions set details = details || '{"monthlyPriceKsh": 1000}'::jsonb where farm_id = $1`, [farm]);
    expect((await db.query<{ p: number }>(`select public.plan_price('farmer') as p`)).rows[0].p).toBe(1300);
  });
});
