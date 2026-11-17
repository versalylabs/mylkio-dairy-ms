import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { randomUUID, randomBytes } from 'node:crypto';
import { freshDatabase } from '../db/harness';
import { acceptInvite, applyOperations, createInvite, farmChanges, onboard, type Db, type OnboardingInput, type SessionUser } from '@/lib/server/farm-api';
import type { BucketName, RecordOperation } from '@/lib/backend-contract';
import { newInviteCode } from '@/lib/team';
import { milkUseId } from '@/lib/produced-sold';

const asDb = (pg: PGlite): Db => ({ query: async (text, params) => (await pg.query(text, params as never)).rows as never });
const user = (id: string): SessionUser => ({ id, email: `${id}@example.test`, name: `Name ${id}` });
const details: OnboardingInput = { name: 'Owner', phone: '0712345678', farmName: 'Farm', county: 'Nakuru', plan: 'farm_pro', language: 'en' };

let pg: PGlite;
let db: Db;
let farm: string;

const op = (bucket: BucketName | string, id: string, extra: Record<string, unknown> = {}, over: Partial<RecordOperation> = {}): RecordOperation => ({
  opId: randomUUID(), groupId: randomUUID(), bucket: bucket as BucketName, recordId: id, action: 'upsert', baseVersion: 0, data: { id, farmId: farm, ...extra }, ...over,
});
const use = (date: string, extra: Record<string, unknown> = {}) => op('milkUse', milkUseId(date), { date, homeUse: 4, calves: 3, spoiled: 0, other: 0, ...extra });

beforeAll(async () => {
  pg = await freshDatabase();
  db = asDb(pg);
  await onboard(db, user('owner'), details);
  farm = (await pg.query<{ farm_id: string }>(`select farm_id from public.farm_memberships where user_id = 'owner'`)).rows[0].farm_id;
  for (const [id, role] of [['mary', 'worker'], ['peter', 'manager']] as const) {
    const code = newInviteCode((n) => randomBytes(n));
    await createInvite(db, 'owner', farm, role, '', code);
    await acceptInvite(db, user(id), { name: id, phone: '0700000000', code });
  }
}, 60_000);

describe('the split of unsold milk (milkUse) on the server', () => {
  it('is stored and sent back to the owner, a manager and a worker', async () => {
    await applyOperations(db, 'owner', farm, [use('2026-11-16')]);
    for (const actor of ['owner', 'peter', 'mary']) {
      const changes = (await farmChanges(db, actor, farm, 0)).changes;
      expect(changes.some((c) => c.bucket === 'milkUse' && c.id === milkUseId('2026-11-16')), actor).toBe(true);
    }
  });

  it('can be written by a worker: it holds litres, never money', async () => {
    await applyOperations(db, 'mary', farm, [use('2026-11-15', { homeUse: 2 })]);
    const { rows } = await pg.query(`select updated_by from public.farm_records where bucket = 'milkUse' and id = $1`, [milkUseId('2026-11-15')]);
    expect(rows[0]).toEqual({ updated_by: 'mary' });
  });

  it('can be changed and removed (it is not append-only, unlike milk and money)', async () => {
    await applyOperations(db, 'owner', farm, [use('2026-11-14')]);
    const first = (await pg.query<{ version: number }>(`select version from public.farm_records where bucket = 'milkUse' and id = $1`, [milkUseId('2026-11-14')])).rows[0];
    expect(Number(first.version)).toBe(1);
    const results = await applyOperations(db, 'owner', farm, [op('milkUse', milkUseId('2026-11-14'), { date: '2026-11-14', homeUse: 9, calves: 3, spoiled: 0, other: 0 }, { baseVersion: 1 })]);
    expect(results[0].status).toBe('applied');
    const edited = (await pg.query<{ version: number; data: { homeUse: number } }>(`select version, data from public.farm_records where bucket = 'milkUse' and id = $1`, [milkUseId('2026-11-14')])).rows[0];
    expect(Number(edited.version)).toBe(2);
    expect(edited.data.homeUse).toBe(9);
    await applyOperations(db, 'owner', farm, [op('milkUse', milkUseId('2026-11-14'), {}, { action: 'delete', baseVersion: 2 })]);
    const gone = (await pg.query<{ deleted: boolean }>(`select deleted from public.farm_records where bucket = 'milkUse' and id = $1`, [milkUseId('2026-11-14')])).rows[0];
    expect(gone.deleted).toBe(true);
  });

  it('must belong to the farm it is written to', async () => {
    await expect(applyOperations(db, 'owner', farm, [op('milkUse', 'milkuse-2026-11-13', { farmId: randomUUID(), date: '2026-11-13' })])).rejects.toMatchObject({ status: 400 });
  });

  it('does not open the door to any other kind of record: an unknown kind is still refused', async () => {
    await expect(applyOperations(db, 'owner', farm, [op('milkuse', 'x')])).rejects.toMatchObject({ status: 400 });
    await expect(applyOperations(db, 'owner', farm, [op('secrets', 'x')])).rejects.toMatchObject({ status: 400 });
  });

  it('does not change what a worker may do with money', async () => {
    for (const bucket of ['payments', 'deliveries', 'expenses']) {
      await expect(applyOperations(db, 'mary', farm, [op(bucket, `x-${bucket}`)]), bucket).rejects.toMatchObject({ status: 403 });
    }
  });
});
