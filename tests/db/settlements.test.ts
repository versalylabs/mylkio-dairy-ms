import { beforeEach, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { apply, freshDatabase, signUp } from './harness';

const OWNER = '44444444-4444-4444-8444-444444444444';
let db: PGlite;
let farm: string;

const op = (bucket: string, data: Record<string, unknown>, over: Record<string, unknown> = {}) => ({
  opId: randomUUID(), groupId: randomUUID(), action: 'upsert', baseVersion: 0, bucket, recordId: data.id, data: { farmId: farm, ...data }, ...over,
});

beforeEach(async () => {
  db = await freshDatabase();
  farm = await signUp(db, OWNER);
}, 60_000);

describe('customer bills', () => {
  it('refuses a second active bill containing an already-billed delivery', async () => {
    const [first] = await apply(db, farm, [op('bills', { id: 'b1', buyerId: 'mama', deliveryIds: ['d1', 'd2'] })]);
    expect(first.status).toBe('applied');
    const [second] = await apply(db, farm, [op('bills', { id: 'b2', buyerId: 'mama', deliveryIds: ['d2', 'd3'] })]);
    expect(second).toMatchObject({ status: 'conflict', conflicts: [{ reason: 'duplicate' }] });
  });

  it('allows re-billing once the earlier bill is voided', async () => {
    await apply(db, farm, [op('bills', { id: 'b1', buyerId: 'mama', deliveryIds: ['d1'] })]);
    await apply(db, farm, [op('bills', { id: 'b1', buyerId: 'mama', deliveryIds: ['d1'], voidedAt: 'x', voidReason: 'wrong month' }, { baseVersion: 1 })]);
    const [rebill] = await apply(db, farm, [op('bills', { id: 'b2', buyerId: 'mama', deliveryIds: ['d1'] })]);
    expect(rebill.status).toBe('applied');
  });

  it('keeps bills append-only', async () => {
    await apply(db, farm, [op('bills', { id: 'b1', buyerId: 'mama', deliveryIds: ['d1'], amount: 120 })]);
    const [edit] = await apply(db, farm, [op('bills', { id: 'b1', buyerId: 'mama', deliveryIds: ['d1'], amount: 99 }, { baseVersion: 1 })]);
    expect(edit.conflicts![0].reason).toBe('immutable');
  });
});

describe('cooperative statements', () => {
  const stmt = (id: string, from: string, to: string, extra: Record<string, unknown> = {}) =>
    op('statements', { id, buyerId: 'coop', periodFrom: from, periodTo: to, statementLitres: 905, ratePerLitre: 48, deductions: [], ...extra });

  it('allows one active statement per co-op per period', async () => {
    expect((await apply(db, farm, [stmt('s1', '2026-10-01', '2026-10-31')]))[0].status).toBe('applied');
    expect((await apply(db, farm, [stmt('s2', '2026-10-15', '2026-11-14')]))[0]).toMatchObject({ conflicts: [{ reason: 'duplicate' }] });
    expect((await apply(db, farm, [stmt('s3', '2026-11-01', '2026-11-30')]))[0].status).toBe('applied');
  });

  it('lets a different co-op have a statement for the same month', async () => {
    await apply(db, farm, [stmt('s1', '2026-10-01', '2026-10-31')]);
    const [other] = await apply(db, farm, [stmt('s2', '2026-10-01', '2026-10-31', { buyerId: 'other-coop' })]);
    expect(other.status).toBe('applied');
  });
});

describe('payment allocations', () => {
  beforeEach(async () => {
    await apply(db, farm, [op('payments', { id: 'p1', buyerId: 'coop', amount: 1000 })]);
  });
  const alloc = (id: string, amount: number, extra: Record<string, unknown> = {}) =>
    op('allocations', { id, paymentId: 'p1', buyerId: 'coop', targetKind: 'statement', targetId: 's1', amount, ...extra });

  it('allows splitting a payment up to its amount', async () => {
    expect((await apply(db, farm, [alloc('a1', 600)]))[0].status).toBe('applied');
    expect((await apply(db, farm, [alloc('a2', 400)]))[0].status).toBe('applied');
    expect((await apply(db, farm, [alloc('a3', 1)]))[0]).toMatchObject({ conflicts: [{ reason: 'invalid_allocation' }] });
  });

  it('refuses allocations to another buyer, a missing payment or a voided payment', async () => {
    expect((await apply(db, farm, [alloc('a1', 10, { buyerId: 'someone-else' })]))[0].conflicts![0].reason).toBe('invalid_allocation');
    expect((await apply(db, farm, [alloc('a2', 10, { paymentId: 'missing' })]))[0].conflicts![0].reason).toBe('invalid_allocation');
    await apply(db, farm, [op('payments', { id: 'p1', buyerId: 'coop', amount: 1000, voidedAt: 'x', voidReason: 'dup' }, { baseVersion: 1 })]);
    expect((await apply(db, farm, [alloc('a3', 10)]))[0].conflicts![0].reason).toBe('invalid_allocation');
  });

  it('frees the amount again when an allocation is voided', async () => {
    await apply(db, farm, [alloc('a1', 1000)]);
    await apply(db, farm, [alloc('a1', 1000, { voidedAt: 'x', voidReason: 'wrong statement' })].map((o) => ({ ...o, baseVersion: 1 })));
    expect((await apply(db, farm, [alloc('a2', 1000, { targetId: 's2' })]))[0].status).toBe('applied');
  });
});
