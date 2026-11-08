// End-to-end sync between two simulated devices of the same farm, using the real
// database function and the client's sync logic (no browser).
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { apply, freshDatabase, signUp } from './harness';
import { applyChanges, applyResults, diffBucket, emptyState, nextBatch, resolveGroup, type PendingOp, type SyncState } from '@/lib/sync-core';
import type { BucketName, RecordChange } from '@/lib/backend-contract';

const OWNER = '33333333-3333-4333-8333-333333333333';
let db: PGlite;
let farm: string;

function edit(device: SyncState, bucket: BucketName, next: unknown, groupId = randomUUID()): SyncState {
  const ops = diffBucket(device, bucket, device.buckets[bucket], next);
  const s = structuredClone(device);
  s.buckets[bucket] = structuredClone(next);
  s.outbox.push(...ops.map((op): PendingOp => ({ ...op, opId: randomUUID(), groupId, createdAt: '', sent: false, state: 'queued' })));
  return s;
}

async function sync(device: SyncState): Promise<SyncState> {
  let s = device;
  for (;;) {
    const batch = nextBatch(s.outbox, 500, 3e6);
    if (!batch.length) break;
    const results = await apply(db, farm, batch.map(({ opId, groupId, bucket, recordId, action, baseVersion, data }) => ({ opId, groupId, bucket, recordId, action, baseVersion, data })));
    s = applyResults(s, results as never);
  }
  const { rows } = await db.query<{ bucket: BucketName; id: string; version: number; change_seq: number; deleted: boolean; data: Record<string, unknown> }>(
    'select bucket,id,version,change_seq,deleted,data from public.farm_records where farm_id=$1 and change_seq>$2 order by change_seq', [farm, s.cursor]);
  const changes: RecordChange[] = rows.map((r) => ({ bucket: r.bucket, id: r.id, version: Number(r.version), seq: Number(r.change_seq), deleted: r.deleted, data: r.data }));
  return applyChanges(s, changes);
}

beforeAll(async () => {
  db = await freshDatabase();
  farm = await signUp(db, OWNER);
}, 60_000);

describe('two devices on one farm', () => {
  let phone: SyncState;
  let tablet: SyncState;

  it('records made offline on one device reach the other after reconnecting', async () => {
    phone = await sync(emptyState(OWNER, farm));
    tablet = await sync(emptyState(OWNER, farm));
    // Phone records milk offline (two saves, no network yet).
    phone = edit(phone, 'milk', [{ id: 'm1', farmId: farm, date: '2026-11-08', session: 'AM', totalLitres: 30 }]);
    phone = edit(phone, 'milk', [{ id: 'm2', farmId: farm, date: '2026-11-08', session: 'PM', totalLitres: 20 }, ...(phone.buckets.milk as object[])]);
    expect(phone.outbox).toHaveLength(2);
    phone = await sync(phone); // reconnects
    expect(phone.outbox).toHaveLength(0);
    tablet = await sync(tablet);
    expect((tablet.buckets.milk as { id: string }[]).map((m) => m.id).sort()).toEqual(['m1', 'm2']);
  });

  it('a retried upload after a lost response does not duplicate records', async () => {
    phone = edit(phone, 'payments', [{ id: 'p1', farmId: farm, amount: 500 }]);
    const batch = nextBatch(phone.outbox, 500, 3e6);
    await apply(db, farm, batch); // server applied it but the phone never got the answer
    phone = await sync(phone); // sends the same opIds again
    const { rows } = await db.query(`select count(*)::int as n from public.farm_records where bucket='payments'`);
    expect(rows[0]).toEqual({ n: 1 });
    expect(phone.outbox).toHaveLength(0);
  });

  it('two devices adding records on the same day do not block each other', async () => {
    tablet = await sync(tablet);
    phone = edit(phone, 'deliveries', [{ id: 'd-phone', farmId: farm, litres: 40 }]);
    tablet = edit(tablet, 'deliveries', [{ id: 'd-tablet', farmId: farm, litres: 10 }]);
    phone = await sync(phone);
    tablet = await sync(tablet);
    phone = await sync(phone);
    expect(tablet.outbox).toHaveLength(0);
    expect((phone.buckets.deliveries as { id: string }[]).map((d) => d.id).sort()).toEqual(['d-phone', 'd-tablet']);
  });

  it('editing the same cow on both devices produces a conflict the farmer can resolve', async () => {
    phone = edit(phone, 'cows', [{ id: 'c1', farmId: farm, tag: 'GH-01' }]);
    phone = await sync(phone);
    tablet = await sync(tablet);
    phone = edit(phone, 'cows', [{ id: 'c1', farmId: farm, tag: 'GH-01 (phone)' }]);
    tablet = edit(tablet, 'cows', [{ id: 'c1', farmId: farm, tag: 'GH-01 (tablet)' }]);
    phone = await sync(phone);
    tablet = await sync(tablet);
    expect(tablet.outbox[0]).toMatchObject({ state: 'conflict', server: { data: { tag: 'GH-01 (phone)' } } });
    // The tablet's own edit is still what the tablet shows until the farmer decides.
    expect((tablet.buckets.cows as { tag: string }[])[0].tag).toBe('GH-01 (tablet)');
    tablet = resolveGroup(tablet, tablet.outbox[0].groupId, 'keep_local', randomUUID).state;
    tablet = await sync(tablet);
    phone = await sync(phone);
    expect((phone.buckets.cows as { tag: string }[])[0].tag).toBe('GH-01 (tablet)');
  });

  it('a delivery and the payment taken with it are saved together or not at all', async () => {
    const group = randomUUID();
    phone = edit(phone, 'deliveries', [{ id: 'd2', farmId: farm, litres: 8 }, ...(phone.buckets.deliveries as object[])], group);
    phone = edit(phone, 'payments', [{ id: 'p-d2', farmId: farm, amount: 440, deliveryId: 'd2' }, ...(phone.buckets.payments as object[])], group);
    // Simulate a stale payment base so the group conflicts.
    phone.outbox.find((o) => o.recordId === 'p-d2')!.baseVersion = 7;
    phone = await sync(phone);
    const { rows } = await db.query(`select id from public.farm_records where id in ('d2','p-d2')`);
    expect(rows).toEqual([]);
    expect(phone.outbox.every((o) => o.state === 'conflict')).toBe(true);
  });
});
