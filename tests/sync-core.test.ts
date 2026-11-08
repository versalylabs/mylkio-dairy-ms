import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  applyChanges,
  applyResults,
  conflictGroups,
  diffBucket,
  emptyState,
  nextBatch,
  resolveGroup,
  screenOperation,
  type PendingOp,
  type SyncState,
} from '@/lib/sync-core';

const FARM = 'f0000000-0000-4000-8000-000000000000';

function stateWith(partial: Partial<SyncState> = {}): SyncState {
  return { ...emptyState('u1', FARM), ...partial };
}

function pending(over: Partial<PendingOp>): PendingOp {
  return {
    opId: randomUUID(), groupId: randomUUID(), bucket: 'milk', recordId: 'm1', action: 'upsert', baseVersion: 0,
    data: { id: 'm1', farmId: FARM }, createdAt: '2026-11-08T00:00:00Z', sent: false, state: 'queued', ...over,
  };
}

describe('diffBucket', () => {
  it('turns a whole-bucket save into operations for changed records only', () => {
    const s = stateWith({ versions: { cows: { a: 3, b: 1 } } });
    const prev = [{ id: 'a', tag: 'A' }, { id: 'b', tag: 'B' }, { id: 'c', tag: 'C' }];
    const next = [{ id: 'new', tag: 'N' }, { id: 'a', tag: 'A2' }, { id: 'c', tag: 'C' }];
    const ops = diffBucket(s, 'cows', prev, next);
    expect(ops).toEqual([
      { bucket: 'cows', recordId: 'new', action: 'upsert', baseVersion: 0, data: { id: 'new', tag: 'N' } },
      { bucket: 'cows', recordId: 'a', action: 'upsert', baseVersion: 3, data: { id: 'a', tag: 'A2' } },
      { bucket: 'cows', recordId: 'b', action: 'delete', baseVersion: 1 },
    ]);
  });

  it('treats the farm profile as a single record', () => {
    const ops = diffBucket(stateWith(), 'farm', { name: 'Old' }, { name: 'New' });
    expect(ops).toEqual([{ bucket: 'farm', recordId: FARM, action: 'upsert', baseVersion: 0, data: { name: 'New', id: FARM } }]);
    expect(diffBucket(stateWith(), 'farm', { name: 'Same' }, { name: 'Same' })).toEqual([]);
  });
});

describe('nextBatch', () => {
  it('sends whole groups and holds back groups waiting for review', () => {
    const g1 = randomUUID(); const g2 = randomUUID(); const g3 = randomUUID();
    const outbox = [
      pending({ groupId: g1, recordId: 'a' }), pending({ groupId: g1, recordId: 'b' }),
      pending({ groupId: g2, recordId: 'c', state: 'conflict' }),
      pending({ groupId: g3, recordId: 'd' }),
    ];
    expect(nextBatch(outbox, 500, 1e7).map((o) => o.recordId)).toEqual(['a', 'b', 'd']);
    expect(nextBatch(outbox, 2, 1e7).map((o) => o.recordId)).toEqual(['a', 'b']);
  });

  it('sets aside records too large to upload instead of blocking the queue', () => {
    const big = screenOperation(pending({ data: { id: 'm1', farmId: FARM, photo: 'x'.repeat(1_100_000) } }));
    expect(big.state).toBe('rejected');
  });
});

describe('applyResults', () => {
  it('removes acknowledged operations and rebases later edits of the same record', () => {
    const first = pending({ bucket: 'cows', recordId: 'c1', baseVersion: 0 });
    const second = pending({ bucket: 'cows', recordId: 'c1', baseVersion: 0 });
    const s = applyResults(stateWith({ outbox: [first, second] }), [
      { groupId: first.groupId, status: 'applied', ops: [{ opId: first.opId, version: 1, seq: 10 }] },
    ]);
    expect(s.outbox).toHaveLength(1);
    expect(s.outbox[0].baseVersion).toBe(1);
    expect(s.versions.cows).toEqual({ c1: 1 });
  });

  it('keeps conflicting groups in the outbox with the server copy for review', () => {
    const op = pending({ bucket: 'cows', recordId: 'c1', baseVersion: 1 });
    const s = applyResults(stateWith({ outbox: [op] }), [{
      groupId: op.groupId, status: 'conflict',
      conflicts: [{ opId: op.opId, bucket: 'cows', recordId: 'c1', reason: 'changed', server: { version: 2, deleted: false, data: { id: 'c1', tag: 'cloud' } } }],
    }]);
    expect(s.outbox[0]).toMatchObject({ state: 'conflict', reason: 'changed', server: { version: 2 } });
    expect(conflictGroups(s)).toHaveLength(1);
  });
});

describe('applyChanges', () => {
  it('applies downloaded records but never overwrites records with unsent local changes', () => {
    const s = stateWith({
      buckets: { cows: [{ id: 'mine', tag: 'local edit' }, { id: 'gone', tag: 'x' }] },
      outbox: [pending({ bucket: 'cows', recordId: 'mine' })],
    });
    const next = applyChanges(s, [
      { bucket: 'cows', id: 'mine', version: 4, seq: 5, deleted: false, data: { id: 'mine', tag: 'cloud' } },
      { bucket: 'cows', id: 'gone', version: 2, seq: 6, deleted: true, data: { id: 'gone' } },
      { bucket: 'cows', id: 'new', version: 1, seq: 7, deleted: false, data: { id: 'new', tag: 'from phone 2' } },
    ]);
    expect(next.buckets.cows).toEqual([{ id: 'new', tag: 'from phone 2' }, { id: 'mine', tag: 'local edit' }]);
    expect(next.cursor).toBe(7);
    expect(next.versions.cows).toEqual({ gone: 2, new: 1 });
  });
});

describe('resolveGroup', () => {
  const conflicted = () => {
    const op = pending({ bucket: 'cows', recordId: 'c1', baseVersion: 1, data: { id: 'c1', tag: 'mine' }, state: 'conflict', reason: 'changed',
      server: { version: 3, deleted: false, data: { id: 'c1', tag: 'cloud' } } });
    return stateWith({ buckets: { cows: [{ id: 'c1', tag: 'mine' }] }, outbox: [op] });
  };
  let n = 0;
  const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;

  it('keep_local resends this device\'s version on top of the cloud version', () => {
    const s = conflicted();
    const { state } = resolveGroup(s, s.outbox[0].groupId, 'keep_local', id);
    expect(state.outbox[0]).toMatchObject({ state: 'queued', baseVersion: 3, sent: false });
  });

  it('use_cloud drops the local change and shows the cloud record', () => {
    const s = conflicted();
    const { state, refetch } = resolveGroup(s, s.outbox[0].groupId, 'use_cloud', id);
    expect(state.outbox).toHaveLength(0);
    expect(state.buckets.cows).toEqual([{ id: 'c1', tag: 'cloud' }]);
    expect(refetch).toBe(false);
  });

  it('refuses to keep a change the cloud rejected as an edit of a payment', () => {
    const s = stateWith({ outbox: [pending({ bucket: 'payments', state: 'rejected', reason: 'immutable' })] });
    expect(() => resolveGroup(s, s.outbox[0].groupId, 'keep_local', id)).toThrow(/cannot be kept/);
  });
});
