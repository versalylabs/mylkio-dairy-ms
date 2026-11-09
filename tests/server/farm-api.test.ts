import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { freshDatabase } from '../db/harness';
import {
  adminListAccounts,
  adminUpdateSubscription,
  applyOperations,
  farmChanges,
  getAccount,
  onboard,
  type Db,
  type OnboardingInput,
  type SessionUser,
} from '@/lib/server/farm-api';
import { ApiError } from '@/lib/server/errors';
import type { RecordOperation } from '@/lib/backend-contract';

// The same functions the API routes call, against Postgres in memory.
const asDb = (pg: PGlite): Db => ({ query: async (text, params) => (await pg.query(text, params as never)).rows as never });

const AMINA: SessionUser = { id: 'user_amina', email: 'Amina@Example.test', name: 'Amina Wanjiru' };
const OTIENO: SessionUser = { id: 'user_otieno', email: 'otieno@example.test', name: 'James Otieno' };
const details: OnboardingInput = { name: 'Amina Wanjiru', phone: '0712345678', farmName: 'Green Hills', county: 'Nakuru', plan: 'farmer', language: 'sw' };

let pg: PGlite;
let db: Db;
let aminaFarm: string;
let otienoFarm: string;

const milk = (farm: string, id: string): RecordOperation => ({
  opId: randomUUID(), groupId: randomUUID(), bucket: 'milk', recordId: id, action: 'upsert', baseVersion: 0,
  data: { id, farmId: farm, date: '2026-11-08', session: 'AM', totalLitres: 30 },
});

beforeAll(async () => {
  pg = await freshDatabase();
  db = asDb(pg);
}, 60_000);

describe('first sign-in', () => {
  it('has no account until the farm is created', async () => {
    expect(await getAccount(db, AMINA.id)).toBeNull();
  });

  it('creates a farm owner account with a 14-day trial', async () => {
    const account = await onboard(db, AMINA, details);
    aminaFarm = account.farmId;
    expect(account).toMatchObject({ id: AMINA.id, email: 'amina@example.test', role: 'farmer', name: 'Amina Wanjiru' });
    expect(aminaFarm).toMatch(/^[0-9a-f-]{36}$/);
    expect(account.subscription).toMatchObject({ plan: 'farmer', status: 'trial', monthlyPriceKsh: 1000 });
  });

  it('is safe to repeat: the existing farm is returned', async () => {
    const again = await onboard(db, AMINA, { ...details, farmName: 'A different name' });
    expect(again.farmId).toBe(aminaFarm);
    const { rows } = await pg.query(`select count(*)::int as n from public.farms`);
    expect(rows[0]).toEqual({ n: 1 });
  });

  it('refuses incomplete farm details', async () => {
    await expect(onboard(db, OTIENO, { ...details, farmName: '   ' })).rejects.toMatchObject({ status: 400 });
    expect(await getAccount(db, OTIENO.id)).toBeNull();
  });

  it('starts a farm with its profile as the first downloadable record', async () => {
    const { changes } = await farmChanges(db, AMINA.id, aminaFarm, 0);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ bucket: 'farm', id: aminaFarm, version: 1 });
    expect(changes[0].data).toMatchObject({ name: 'Green Hills', preferredLanguage: 'sw', county: 'Nakuru' });
  });
});

describe('farm isolation through the API functions', () => {
  beforeAll(async () => {
    otienoFarm = (await onboard(db, OTIENO, { ...details, name: 'James Otieno', farmName: 'Rift Valley Dairy' })).farmId;
    await applyOperations(db, AMINA.id, aminaFarm, [milk(aminaFarm, 'amina-milk')]);
  });

  it('lets an owner write and read their own farm', async () => {
    const { changes, cursor } = await farmChanges(db, AMINA.id, aminaFarm, 0);
    expect(changes.map((c) => c.id).sort()).toEqual([aminaFarm, 'amina-milk'].sort());
    expect(cursor).toBe(Math.max(...changes.map((c) => c.seq)));
  });

  it('rejects another farm owner reading these records', async () => {
    await expect(farmChanges(db, OTIENO.id, aminaFarm, 0)).rejects.toMatchObject({ status: 403 });
  });

  it('rejects another farm owner writing to this farm', async () => {
    await expect(applyOperations(db, OTIENO.id, aminaFarm, [milk(aminaFarm, 'planted')])).rejects.toMatchObject({ status: 403 });
    const { changes } = await farmChanges(db, AMINA.id, aminaFarm, 0);
    expect(changes.some((c) => c.id === 'planted')).toBe(false);
  });

  it('rejects a user with no farm and an unknown user id', async () => {
    await expect(farmChanges(db, 'user_nobody', aminaFarm, 0)).rejects.toBeInstanceOf(ApiError);
    await expect(applyOperations(db, '', aminaFarm, [milk(aminaFarm, 'x')])).rejects.toMatchObject({ status: 403 });
  });

  it('rejects a record that names a different farm, even from the real owner', async () => {
    await expect(applyOperations(db, AMINA.id, aminaFarm, [milk(otienoFarm, 'cross')])).rejects.toMatchObject({ status: 400 });
  });

  it('applies a retried request once', async () => {
    const op = milk(aminaFarm, 'retry-milk');
    await applyOperations(db, AMINA.id, aminaFarm, [op]);
    const second = await applyOperations(db, AMINA.id, aminaFarm, [op]);
    expect(second[0]).toMatchObject({ status: 'applied', ops: [{ replayed: true }] });
    const { rows } = await pg.query(`select count(*)::int as n from public.farm_records where farm_id = $1 and id = 'retry-milk'`, [aminaFarm]);
    expect(rows[0]).toEqual({ n: 1 });
  });
});

describe('platform administration', () => {
  it('refuses ordinary farm owners', async () => {
    await expect(adminListAccounts(db, AMINA.id)).rejects.toMatchObject({ status: 403 });
    await expect(adminUpdateSubscription(db, AMINA.id, aminaFarm, 'farm_pro', 'active')).rejects.toMatchObject({ status: 403 });
  });

  it('works for an administrator promoted in the database', async () => {
    await pg.query(`update public.profiles set role = 'super_admin' where id = $1`, [OTIENO.id]);
    const accounts = await adminListAccounts(db, OTIENO.id);
    expect(accounts.map((a) => (a as { id: string }).id).sort()).toEqual([AMINA.id, OTIENO.id].sort());
    await adminUpdateSubscription(db, OTIENO.id, aminaFarm, 'farm_pro', 'active');
    const account = await getAccount(db, AMINA.id);
    expect(account?.subscription).toMatchObject({ plan: 'farm_pro', status: 'active', monthlyPriceKsh: 2500 });
  });

  it('rejects unknown plans', async () => {
    await expect(adminUpdateSubscription(db, OTIENO.id, aminaFarm, 'platinum', 'active')).rejects.toMatchObject({ status: 400 });
  });
});
