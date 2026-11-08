import { beforeEach, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { apply, asUser, changesSince, freshDatabase, signUp } from './harness';

const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

let db: PGlite;
let farm: string;

const op = (over: Record<string, unknown>) => ({
  opId: randomUUID(),
  groupId: randomUUID(),
  action: 'upsert',
  baseVersion: 0,
  ...over,
});
const milk = (id: string, extra: Record<string, unknown> = {}) => ({ id, farmId: farm, date: '2026-11-08', session: 'AM', totalLitres: 30, ...extra });

async function record(bucket: string, id: string) {
  const { rows } = await db.query<{ version: number; deleted: boolean; data: Record<string, unknown> }>(
    'select version, deleted, data from public.farm_records where farm_id=$1 and bucket=$2 and id=$3', [farm, bucket, id]);
  return rows[0];
}

beforeEach(async () => {
  db = await freshDatabase();
  farm = await signUp(db, OWNER);
}, 60_000);

describe('migrations and provisioning', () => {
  it('creates the farm profile as a version 1 record', async () => {
    const profile = await record('farm', farm);
    expect(profile.version).toBe(1);
    expect(profile.data).toMatchObject({ id: farm, name: 'Green Hills' });
  });
});

describe('apply_farm_operations', () => {
  it('creates records and bumps versions on update', async () => {
    const [created] = await apply(db, farm, [op({ bucket: 'cows', recordId: 'c1', data: { id: 'c1', farmId: farm, tag: 'GH-01' } })]);
    expect(created.status).toBe('applied');
    const [updated] = await apply(db, farm, [op({ bucket: 'cows', recordId: 'c1', baseVersion: 1, data: { id: 'c1', farmId: farm, tag: 'GH-01A' } })]);
    expect(updated.ops![0].version).toBe(2);
    expect((await record('cows', 'c1')).data.tag).toBe('GH-01A');
  });

  it('applies a retried operation only once', async () => {
    const same = op({ bucket: 'milk', recordId: 'm1', data: milk('m1') });
    const first = await apply(db, farm, [same]);
    const retry = await apply(db, farm, [same]);
    expect(first[0].status).toBe('applied');
    expect(retry[0]).toMatchObject({ status: 'applied', ops: [{ replayed: true, version: 1 }] });
    const { rows } = await db.query('select count(*)::int as n from public.farm_records where bucket=$1', ['milk']);
    expect(rows[0]).toEqual({ n: 1 });
  });

  it('reports a conflict when another device changed the record first', async () => {
    await apply(db, farm, [op({ bucket: 'cows', recordId: 'c1', data: { id: 'c1', farmId: farm, tag: 'A' } })]);
    await apply(db, farm, [op({ bucket: 'cows', recordId: 'c1', baseVersion: 1, data: { id: 'c1', farmId: farm, tag: 'Phone 1' } })]);
    const [result] = await apply(db, farm, [op({ bucket: 'cows', recordId: 'c1', baseVersion: 1, data: { id: 'c1', farmId: farm, tag: 'Phone 2' } })]);
    expect(result.status).toBe('conflict');
    expect(result.conflicts![0]).toMatchObject({ reason: 'changed', server: { version: 2, data: { tag: 'Phone 1' } } });
    expect((await record('cows', 'c1')).data.tag).toBe('Phone 1');
  });

  it('applies a group all-or-nothing', async () => {
    await apply(db, farm, [op({ bucket: 'buyers', recordId: 'b1', data: { id: 'b1', farmId: farm, name: 'Co-op' } })]);
    const group = randomUUID();
    const [result] = await apply(db, farm, [
      op({ groupId: group, bucket: 'deliveries', recordId: 'd1', data: { id: 'd1', farmId: farm, litres: 40 } }),
      op({ groupId: group, bucket: 'buyers', recordId: 'b1', baseVersion: 0, data: { id: 'b1', farmId: farm, name: 'stale' } }),
    ]);
    expect(result.status).toBe('conflict');
    expect(await record('deliveries', 'd1')).toBeUndefined(); // rolled back with its group
  });

  it('keeps independent groups in one batch apart', async () => {
    const results = await apply(db, farm, [
      op({ bucket: 'cows', recordId: 'c9', baseVersion: 5, data: { id: 'c9', farmId: farm } }),
      op({ bucket: 'milk', recordId: 'm2', data: milk('m2') }),
    ]);
    expect(results.map((r) => r.status)).toEqual(['conflict', 'applied']);
  });

  it('only allows milk, deliveries and payments to be voided after creation', async () => {
    await apply(db, farm, [op({ bucket: 'payments', recordId: 'p1', data: { id: 'p1', farmId: farm, amount: 500 } })]);
    const [edit] = await apply(db, farm, [op({ bucket: 'payments', recordId: 'p1', baseVersion: 1, data: { id: 'p1', farmId: farm, amount: 5000 } })]);
    expect(edit.conflicts![0].reason).toBe('immutable');
    const [remove] = await apply(db, farm, [op({ bucket: 'payments', recordId: 'p1', baseVersion: 1, action: 'delete' })]);
    expect(remove.conflicts![0].reason).toBe('immutable');
    const [voided] = await apply(db, farm, [op({ bucket: 'payments', recordId: 'p1', baseVersion: 1, data: { id: 'p1', farmId: farm, amount: 500, voidedAt: '2026-11-08T10:00:00Z', voidReason: 'Duplicate' } })]);
    expect(voided.status).toBe('applied');
    const [unvoid] = await apply(db, farm, [op({ bucket: 'payments', recordId: 'p1', baseVersion: 2, data: { id: 'p1', farmId: farm, amount: 500 } })]);
    expect(unvoid.conflicts![0].reason).toBe('immutable');
  });

  it('records deletes as tombstones so other devices learn about them', async () => {
    await apply(db, farm, [op({ bucket: 'reminders', recordId: 'r1', data: { id: 'r1', farmId: farm } })]);
    await apply(db, farm, [op({ bucket: 'reminders', recordId: 'r1', baseVersion: 1, action: 'delete' })]);
    expect(await record('reminders', 'r1')).toMatchObject({ deleted: true, version: 2 });
  });

  it('writes one audit entry per changed record', async () => {
    await apply(db, farm, [op({ bucket: 'milk', recordId: 'm3', data: milk('m3') })]);
    await apply(db, farm, [op({ bucket: 'milk', recordId: 'm3', baseVersion: 1, data: milk('m3', { voidedAt: 'x', voidReason: 'y' }) })]);
    const { rows } = await db.query<{ action: string; record_id: string }>(
      `select action, record_id from public.audit_logs where farm_id=$1 and bucket='milk' order by id`, [farm]);
    expect(rows).toEqual([{ action: 'record.create', record_id: 'm3' }, { action: 'record.void', record_id: 'm3' }]);
  });

  it('assigns increasing change numbers for incremental download', async () => {
    const [a] = await apply(db, farm, [op({ bucket: 'milk', recordId: 'm4', data: milk('m4') })]);
    const [b] = await apply(db, farm, [op({ bucket: 'milk', recordId: 'm5', data: milk('m5') })]);
    expect(b.ops![0].seq).toBeGreaterThan(a.ops![0].seq);
  });
});

describe('farm isolation', () => {
  it('refuses writes from someone who is not a member of the farm', async () => {
    await signUp(db, OTHER, 'Other Farm');
    await asUser(db, OTHER);
    await expect(apply(db, farm, [op({ bucket: 'milk', recordId: 'x', data: milk('x') })])).rejects.toThrow(/Farm access denied/);
  });

  it('refuses records that claim another farm', async () => {
    const otherFarm = await signUp(db, OTHER, 'Other Farm');
    await asUser(db, OWNER);
    await expect(apply(db, farm, [op({ bucket: 'milk', recordId: 'x', data: { id: 'x', farmId: otherFarm } })])).rejects.toThrow(/another farm/);
  });

  it('does not let a member of another farm download these records', async () => {
    await apply(db, farm, [op({ bucket: 'milk', recordId: 'secret', data: milk('secret') })]);
    await signUp(db, OTHER, 'Other Farm');
    await expect(changesSince(db, farm)).rejects.toThrow(/Farm access denied/);
    await asUser(db, OWNER);
    const own = await changesSince(db, farm);
    expect(own.map((r) => r.id).sort()).toEqual([farm, 'secret'].sort()); // farm profile + milk record
  });

  it('only returns changes after the given change number, in order', async () => {
    const [a] = await apply(db, farm, [op({ bucket: 'milk', recordId: 'm1', data: milk('m1') })]);
    await apply(db, farm, [op({ bucket: 'milk', recordId: 'm2', data: milk('m2') })]);
    const later = await changesSince(db, farm, a.ops![0].seq);
    expect(later.map((r) => r.id)).toEqual(['m2']);
    expect(await changesSince(db, farm, 0, 1)).toHaveLength(1);
  });

  it('refuses anonymous callers', async () => {
    await asUser(db, null);
    await expect(apply(db, farm, [])).rejects.toThrow(/Farm access denied/);
  });
});
