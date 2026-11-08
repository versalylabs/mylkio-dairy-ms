// Pure per-record sync logic (no storage, network or DOM), used by lib/cloud-store.ts.
//
// Local model:
// - `buckets` holds what the app shows (arrays of records; the farm profile is an object).
// - `versions` holds the last server version known for each record.
// - `outbox` holds record operations not yet acknowledged by the server, in the
//   order they were made. An operation leaves the outbox only when the server
//   reports it applied (or the farmer discards it while resolving a conflict).

import type { BucketName, GroupResult, RecordChange, RecordOperation, ServerRecord } from './backend-contract';
import { MAX_RECORD_BYTES } from './backend-contract';

type Rec = Record<string, unknown> & { id: string };

export interface PendingOp extends RecordOperation {
  createdAt: string;
  /** Sent at least once: the server may already have applied it, so its opId is fixed. */
  sent: boolean;
  state: 'queued' | 'conflict' | 'rejected';
  reason?: 'changed' | 'immutable' | 'invalid' | 'duplicate' | 'invalid_allocation';
  message?: string;
  server?: ServerRecord | null;
}

export interface SyncState {
  schema: 3;
  userId: string;
  farmId: string;
  cursor: number;
  buckets: Partial<Record<BucketName, unknown>>;
  versions: Partial<Record<BucketName, Record<string, number>>>;
  outbox: PendingOp[];
  lastSyncedAt?: string;
}

export function emptyState(userId: string, farmId: string): SyncState {
  return { schema: 3, userId, farmId, cursor: 0, buckets: {}, versions: {}, outbox: [] };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const byteSize = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;
const versionOf = (state: SyncState, bucket: BucketName, id: string) => state.versions[bucket]?.[id] ?? 0;

/** Record operations that turn `prev` into `next` for one bucket. */
export function diffBucket(
  state: SyncState,
  bucket: BucketName,
  prev: unknown,
  next: unknown,
): Omit<RecordOperation, 'opId' | 'groupId'>[] {
  if (bucket === 'farm') {
    if (!next || same(prev, next)) return [];
    const data = next as Rec;
    return [{ bucket, recordId: state.farmId, action: 'upsert', baseVersion: versionOf(state, bucket, state.farmId), data: { ...data, id: state.farmId } }];
  }
  const before = new Map((Array.isArray(prev) ? (prev as Rec[]) : []).map((r) => [r.id, r]));
  const after = Array.isArray(next) ? (next as Rec[]) : [];
  const ops: Omit<RecordOperation, 'opId' | 'groupId'>[] = [];
  const seen = new Set<string>();
  for (const record of after) {
    seen.add(record.id);
    if (!same(before.get(record.id), record)) {
      ops.push({ bucket, recordId: record.id, action: 'upsert', baseVersion: versionOf(state, bucket, record.id), data: record });
    }
  }
  for (const id of before.keys()) {
    if (!seen.has(id)) ops.push({ bucket, recordId: id, action: 'delete', baseVersion: versionOf(state, bucket, id) });
  }
  return ops;
}

/** Marks operations that can never be accepted (too large) so they do not block the queue. */
export function screenOperation(op: PendingOp): PendingOp {
  if (op.data && byteSize(op.data) > MAX_RECORD_BYTES) {
    return { ...op, state: 'rejected', reason: 'invalid', message: 'This record is too large to save to the cloud (often a large photo). Remove or shrink the photo, then try again.' };
  }
  return op;
}

/** Whole groups of queued operations, oldest first, within the request limits. */
export function nextBatch(outbox: PendingOp[], maxOps: number, maxBytes: number): PendingOp[] {
  const blocked = new Set(outbox.filter((op) => op.state !== 'queued').map((op) => op.groupId));
  const groups: PendingOp[][] = [];
  const index = new Map<string, PendingOp[]>();
  for (const op of outbox) {
    if (op.state !== 'queued' || blocked.has(op.groupId)) continue;
    let group = index.get(op.groupId);
    if (!group) { group = []; index.set(op.groupId, group); groups.push(group); }
    group.push(op);
  }
  const batch: PendingOp[] = [];
  let bytes = 0;
  for (const group of groups) {
    const size = byteSize(group);
    if (batch.length > 0 && (batch.length + group.length > maxOps || bytes + size > maxBytes)) break;
    batch.push(...group);
    bytes += size;
  }
  return batch;
}

function setRecord(state: SyncState, bucket: BucketName, id: string, data: Record<string, unknown> | null) {
  if (bucket === 'farm') {
    if (data) state.buckets.farm = data;
    return;
  }
  const list = Array.isArray(state.buckets[bucket]) ? [...(state.buckets[bucket] as Rec[])] : [];
  const i = list.findIndex((r) => r.id === id);
  if (data === null) { if (i >= 0) list.splice(i, 1); }
  else if (i >= 0) list[i] = data as Rec;
  else list.unshift(data as Rec);
  state.buckets[bucket] = list;
}

function setVersion(state: SyncState, bucket: BucketName, id: string, version: number) {
  state.versions[bucket] = { ...(state.versions[bucket] ?? {}), [id]: version };
}

const REFUSAL_MESSAGES: Record<string, string> = {
  immutable: 'The cloud did not accept this change. Milk, delivery, payment, statement and bill records can only be voided, not edited.',
  duplicate: 'Another device already recorded this: a delivery can only be on one active bill, and a co-op can have only one statement for a period.',
  invalid_allocation: 'This allocation is more than the payment has left, or the payment was voided on another device.',
};

/** Applies the server's answer for a batch. Returns a new state. */
export function applyResults(input: SyncState, results: GroupResult[]): SyncState {
  const state: SyncState = structuredClone(input);
  for (const result of results) {
    if (result.status === 'applied') {
      for (const ack of result.ops) {
        const index = state.outbox.findIndex((op) => op.opId === ack.opId);
        if (index < 0) continue;
        const [done] = state.outbox.splice(index, 1);
        setVersion(state, done.bucket, done.recordId, ack.version);
        // Later local edits of the same record were based on the version this one
        // replaced; they now build on the version just written.
        for (const later of state.outbox) {
          if (later.bucket === done.bucket && later.recordId === done.recordId && later.baseVersion === done.baseVersion) {
            later.baseVersion = ack.version;
          }
        }
      }
    } else {
      const detail = new Map(result.conflicts.map((c) => [c.opId, c]));
      // Only 'changed' can be resolved by re-sending; the others are refused outright.
      const refused = result.conflicts.find((x) => x.reason !== 'changed');
      for (const op of state.outbox) {
        if (op.groupId !== result.groupId) continue;
        const c = detail.get(op.opId);
        op.state = refused ? 'rejected' : 'conflict';
        op.reason = c?.reason;
        op.server = c ? c.server : undefined;
        if (refused) op.message = REFUSAL_MESSAGES[refused.reason];
      }
    }
  }
  return state;
}

/** Applies records downloaded from the server, keeping local records that still have unsent changes. */
export function applyChanges(input: SyncState, changes: RecordChange[]): SyncState {
  const state: SyncState = structuredClone(input);
  const pending = new Set(state.outbox.map((op) => `${op.bucket}:${op.recordId}`));
  for (const change of changes) {
    state.cursor = Math.max(state.cursor, change.seq);
    if (pending.has(`${change.bucket}:${change.id}`)) continue;
    setRecord(state, change.bucket, change.id, change.deleted ? null : change.data);
    setVersion(state, change.bucket, change.id, change.version);
  }
  return state;
}

export interface ConflictGroup {
  groupId: string;
  state: 'conflict' | 'rejected';
  message?: string;
  ops: PendingOp[];
}

export function conflictGroups(state: SyncState): ConflictGroup[] {
  const groups = new Map<string, ConflictGroup>();
  for (const op of state.outbox) {
    if (op.state === 'queued') continue;
    const g = groups.get(op.groupId) ?? { groupId: op.groupId, state: op.state, ops: [] };
    if (op.state === 'rejected') g.state = 'rejected';
    if (op.message) g.message = op.message;
    g.ops.push(op);
    groups.set(op.groupId, g);
  }
  return [...groups.values()];
}

/**
 * Resolves a conflict group.
 * - keep_local: resend this device's changes on top of the current server versions.
 * - use_cloud: drop this device's changes and show the server's records. Returns
 *   `refetch: true` when a full download is needed to restore records the server
 *   did not describe in the conflict.
 */
export function resolveGroup(
  input: SyncState,
  groupId: string,
  choice: 'keep_local' | 'use_cloud',
  newId: () => string,
): { state: SyncState; refetch: boolean } {
  const state: SyncState = structuredClone(input);
  const ops = state.outbox.filter((op) => op.groupId === groupId);
  if (choice === 'keep_local') {
    if (ops.some((op) => op.state === 'rejected')) throw new Error('This change cannot be kept. Discard it instead.');
    const regroup = newId();
    for (const op of ops) {
      if (op.server !== undefined) op.baseVersion = op.server?.version ?? 0;
      if (op.server) setVersion(state, op.bucket, op.recordId, op.server.version);
      Object.assign(op, { opId: newId(), groupId: regroup, sent: false, state: 'queued' as const });
      delete op.reason; delete op.server; delete op.message;
    }
    return { state, refetch: false };
  }
  let refetch = false;
  state.outbox = state.outbox.filter((op) => op.groupId !== groupId);
  for (const op of ops) {
    if (op.server) {
      setRecord(state, op.bucket, op.recordId, op.server.deleted ? null : op.server.data);
      setVersion(state, op.bucket, op.recordId, op.server.version);
    } else if (op.baseVersion === 0 && op.action === 'upsert') {
      setRecord(state, op.bucket, op.recordId, null); // created here and never accepted by the server
    } else {
      refetch = true;
    }
  }
  if (refetch) state.cursor = 0;
  return { state, refetch };
}
