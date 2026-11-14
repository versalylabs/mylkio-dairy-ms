import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { freshDatabase } from '../db/harness';
import { adminListAccounts, adminUsage, onboard, recordActivity, type Db, type OnboardingInput, type SessionUser } from '@/lib/server/farm-api';

const asDb = (pg: PGlite): Db => ({ query: async (text, params) => (await pg.query(text, params as never)).rows as never });
const user = (id: string): SessionUser => ({ id, email: `${id}@example.test`, name: id });
const details = (farmName: string, county: string, plan: OnboardingInput['plan']): OnboardingInput => ({ name: 'Farmer', phone: '0712345678', farmName, county, plan, language: 'en' });

let pg: PGlite;
let db: Db;
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

const seen = (id: string, at: string) => pg.query('insert into public.account_activity (user_id, seen_at) values ($1, $2)', [id, at]);

beforeAll(async () => {
  pg = await freshDatabase();
  db = asDb(pg);
  await onboard(db, user('amina'), details('Green Hills', 'Nakuru', 'farmer'));
  await onboard(db, user('baraka'), details('Baraka Dairy', 'Kiambu', 'starter'));
  await onboard(db, user('chebet'), details('Chebet Farm', 'Nandi', 'farm_pro'));
  await onboard(db, user('boss'), details('Platform', 'Nairobi', 'farmer'));
  await pg.query(`update public.profiles set role = 'super_admin' where id = 'boss'`);
  await pg.query(`update public.subscriptions set details = details || '{"status":"active"}' where farm_id = (select farm_id from public.farm_memberships where user_id = 'amina')`);
}, 60_000);

describe('recording activity', () => {
  it('stamps the account once, and adds at most one activity row per five minutes', async () => {
    await recordActivity(db, 'amina');
    await recordActivity(db, 'amina');
    const { rows } = await pg.query<{ n: number }>(`select count(*)::int as n from public.account_activity where user_id = 'amina'`);
    expect(rows[0].n).toBe(1);
    const profile = await pg.query<{ last_seen_at: string | null }>(`select last_seen_at from public.profiles where id = 'amina'`);
    expect(profile.rows[0].last_seen_at).not.toBeNull();
    await pg.query(`delete from public.account_activity`);
  });

  it('ignores a signed-in user who has no profile yet, and never throws', async () => {
    await expect(recordActivity(db, 'nobody-yet')).resolves.toBeUndefined();
    const { rows } = await pg.query<{ n: number }>(`select count(*)::int as n from public.account_activity where user_id = 'nobody-yet'`);
    expect(rows[0].n).toBe(0);
  });
});

describe('platform usage', () => {
  it('refuses farm owners and strangers', async () => {
    await expect(adminUsage(db, 'amina')).rejects.toMatchObject({ status: 403 });
    await expect(adminUsage(db, 'nobody')).rejects.toMatchObject({ status: 403 });
  });

  it('counts who was using the system around a chosen moment', async () => {
    await seen('amina', new Date(Date.now() - 5 * 60_000).toISOString()); // just now
    await seen('baraka', hoursAgo(3));
    await seen('chebet', hoursAgo(26));
    await seen('boss', new Date(Date.now() - 2 * 60_000).toISOString()); // administrators are not counted

    const now = await adminUsage(db, 'boss');
    expect(now).toMatchObject({ accounts: 3, activeNow: 1, active24h: 2, active7d: 3, active30d: 3 });
    expect(now.activeUsers.map((u) => u.id)).toEqual(['amina']);

    // Three hours ago, only Baraka had been seen in the previous 15 minutes, and Amina had no activity yet.
    const earlier = await adminUsage(db, 'boss', new Date(Date.now() - 3 * 3600_000 + 60_000).toISOString());
    expect(earlier.activeUsers.map((u) => u.id)).toEqual(['baraka']);
    expect(earlier.activeNow).toBe(1);
    // Chebet was seen 26 hours ago: 23 hours before that moment, so inside its 24-hour window.
    expect(earlier.active24h).toBe(2);
  });

  it('only counts accounts that existed by the chosen time', async () => {
    const lastWeek = await adminUsage(db, 'boss', hoursAgo(24 * 7));
    expect(lastWeek.accounts).toBe(0);
    expect(lastWeek.byStatus).toEqual({});
  });

  it('never looks into the future', async () => {
    const future = await adminUsage(db, 'boss', new Date(Date.now() + 5 * 86_400_000).toISOString());
    expect(new Date(future.asAt).getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it('summarises plans, status, monthly value and sign-ups', async () => {
    const usage = await adminUsage(db, 'boss');
    expect(usage.byPlan).toEqual({ farmer: 1, starter: 1, farm_pro: 1 });
    expect(usage.byStatus).toEqual({ active: 1, trial: 2 });
    expect(usage.monthlyValueKsh).toBe(1000);
    expect(usage.signups).toHaveLength(14);
    expect(usage.signups.reduce((sum, d) => sum + Number(d.count), 0)).toBe(3);
  });

  it('lists accounts with farm, contact and last-seen details', async () => {
    const accounts = (await adminListAccounts(db, 'boss')) as { id: string; farm_name: string | null; county: string | null; phone: string; last_seen_at: string | null }[];
    const amina = accounts.find((a) => a.id === 'amina');
    expect(amina).toMatchObject({ farm_name: 'Green Hills', county: 'Nakuru', phone: '0712345678' });
  });
});
