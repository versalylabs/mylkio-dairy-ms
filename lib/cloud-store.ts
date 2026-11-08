'use client';

// Device-side store for an authenticated farm: local records, an outbox of
// record operations, and synchronisation with the server.
//
// - Every change is saved on this device first (localStorage) and queued as
//   record-level operations with stable IDs.
// - Operations leave the queue only after the server acknowledges them, so a
//   closed app, lost connection or retried request never loses or duplicates data.
// - Changes made together (CloudStore.group) are uploaded as one all-or-nothing group.
// - Downloads fetch only records changed since this device last synced.
// - The cache is scoped to one account and one farm; another account's queue is
//   never sent.

import { bucketNames, CHANGES_PAGE_SIZE, MAX_OPERATIONS_PER_REQUEST, type BucketName, type GroupResult, type RecordChange } from './backend-contract';
import {
  applyChanges,
  applyResults,
  conflictGroups,
  diffBucket,
  emptyState,
  nextBatch,
  resolveGroup,
  screenOperation,
  type ConflictGroup,
  type PendingOp,
  type SyncState,
} from './sync-core';

const NAMESPACE = 'mylkio_offline_v3_';
const REQUEST_BYTES = 3 * 1024 * 1024; // below the server's 4 MB limit
const key = (userId: string, farmId: string) => `${NAMESPACE}${userId}_${farmId}`;

let state: SyncState | null = null;
let configured = false;
let running = false;
let flushPromise: Promise<void> | null = null;
let errorMessage = '';
let groupId: string | null = null;
let groupDepth = 0;
let groupOps = 0;
let listenersAttached = false;

function announce() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('mylkio_cloud_changed'));
}

function persist() {
  if (state) localStorage.setItem(key(state.userId, state.farmId), JSON.stringify(state));
}

function readCache(userId: string, farmId: string): SyncState | null {
  const cached = localStorage.getItem(key(userId, farmId));
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached) as SyncState;
    return parsed.schema === 3 && parsed.userId === userId && parsed.farmId === farmId ? parsed : null;
  } catch {
    throw new Error('Your local farm cache needs recovery. Contact support before clearing it.');
  }
}

function hasLocalData(s: SyncState) {
  return Object.values(s.buckets).some((value) => value != null);
}

function attachListeners() {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;
  window.addEventListener('online', () => { void CloudStore.flush(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void CloudStore.flush();
  });
}

async function postOperations(farmId: string, ops: PendingOp[]): Promise<Response> {
  return fetch(`/api/farms/${farmId}/operations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operations: ops.map(({ opId, groupId: g, bucket, recordId, action, baseVersion, data }) => ({
        opId, groupId: g, bucket, recordId, action, baseVersion, ...(action === 'upsert' ? { data } : {}),
      })),
    }),
  });
}

async function readError(response: Response, fallback: string) {
  try { return ((await response.json()) as { error?: string }).error || fallback; } catch { return fallback; }
}

/** Uploads queued operations. Stops on a network or permission problem; the queue is kept. */
async function upload(owner: SyncState) {
  const stillOwner = () => state !== null && state.userId === owner.userId && state.farmId === owner.farmId;
  while (stillOwner()) {
    const batch = nextBatch(state!.outbox, MAX_OPERATIONS_PER_REQUEST, REQUEST_BYTES);
    if (batch.length === 0) return;
    const ids = new Set(batch.map((op) => op.opId));
    state!.outbox = state!.outbox.map((op) => (ids.has(op.opId) ? { ...op, sent: true } : op));
    persist();

    const response = await postOperations(owner.farmId, batch);
    if (!stillOwner()) return;
    if (response.status === 400) {
      const message = await readError(response, 'Some records could not be accepted.');
      const groups = [...new Set(batch.map((op) => op.groupId))];
      if (groups.length === 1) {
        // One group the server cannot accept: set it aside for review so the rest can sync.
        state!.outbox = state!.outbox.map((op) => (op.groupId === groups[0] ? { ...op, state: 'rejected', reason: 'invalid', message } : op));
        persist();
        continue;
      }
      // Find the bad group by sending groups one at a time.
      for (const g of groups) {
        const single = state!.outbox.filter((op) => op.groupId === g && op.state === 'queued');
        const r = await postOperations(owner.farmId, single);
        if (!stillOwner()) return;
        if (r.status === 400) {
          const m = await readError(r, message);
          state!.outbox = state!.outbox.map((op) => (op.groupId === g ? { ...op, state: 'rejected', reason: 'invalid', message: m } : op));
        } else if (r.ok) {
          state = applyResults(state!, ((await r.json()) as { results: GroupResult[] }).results);
        } else {
          throw new Error(await readError(r, 'Cloud save failed. Changes remain on this device.'));
        }
        persist();
      }
      continue;
    }
    if (!response.ok) throw new Error(await readError(response, 'Cloud save failed. Changes remain on this device.'));
    const { results } = (await response.json()) as { results: GroupResult[] };
    if (!stillOwner()) return;
    state = applyResults(state!, results);
    persist();
    announce();
  }
}

/** Downloads records changed since the last sync. Returns how many records arrived. */
async function download(owner: SyncState): Promise<number> {
  let received = 0;
  const stillOwner = () => state !== null && state.userId === owner.userId && state.farmId === owner.farmId;
  let more = true;
  while (more && stillOwner()) {
    const response = await fetch(`/api/farms/${owner.farmId}/changes?since=${state!.cursor}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(await readError(response, 'Could not download farm changes. Please retry.'));
    const page = (await response.json()) as { changes: RecordChange[]; cursor: number; more: boolean };
    if (!stillOwner()) return received;
    state = applyChanges(state!, page.changes);
    received += page.changes.length;
    state.cursor = Math.max(state.cursor, page.cursor);
    more = page.more && page.changes.length === CHANGES_PAGE_SIZE;
    persist();
  }
  if (stillOwner()) {
    state!.lastSyncedAt = new Date().toISOString();
    persist();
  }
  return received;
}

export const CloudStore = {
  configure(enabled: boolean) { configured = enabled; },

  async load(userId: string, farmId: string) {
    state = readCache(userId, farmId) ?? emptyState(userId, farmId);
    errorMessage = '';
    attachListeners();
    if (configured && navigator.onLine) {
      try {
        await download(state!);
      } catch (error) {
        if (!hasLocalData(state)) throw new Error('Could not load your farm from the cloud. Please retry.');
        errorMessage = error instanceof Error ? error.message : 'Could not download farm changes.';
      }
    } else if (configured && !hasLocalData(state)) {
      state = null;
      throw new Error('Connect to the internet once to set up this account on this device.');
    }
    for (const name of bucketNames) state!.buckets[name] ??= null;
    persist();
    announce();
    if (configured) void this.flush();
  },

  clear() { state = null; errorMessage = ''; announce(); },

  read<T>(farmId: string, bucket: BucketName, fallback: T): T {
    if (!state || state.farmId !== farmId) return fallback;
    const value = state.buckets[bucket];
    return value == null ? fallback : (structuredClone(value) as T);
  },

  /**
   * Saves a whole bucket as the app sees it. Only the records that changed become
   * queued operations. Inside `group`, operations from several writes share one group.
   */
  write(farmId: string, bucket: BucketName, data: unknown) {
    if (!state || state.farmId !== farmId) throw new Error('Open your authenticated farm before editing records.');
    const ops = configured ? diffBucket(state, bucket, state.buckets[bucket], data) : [];
    const now = new Date().toISOString();
    state.buckets[bucket] = structuredClone(data);
    // Outside an explicit group every record is independent (e.g. a bulk import).
    state.outbox.push(...ops.map((op) => screenOperation({
      ...op, opId: crypto.randomUUID(), groupId: groupId ?? crypto.randomUUID(), createdAt: now, sent: false, state: 'queued',
    })));
    groupOps += ops.length;
    // Save on the device first; the cloud upload follows.
    persist();
    announce();
    if (configured && groupDepth === 0 && ops.length > 0) void this.flush();
  },

  /** Runs `action` so that all writes inside it are uploaded together, all or nothing. */
  group<T>(action: () => T): T {
    if (groupDepth === 0) { groupId = crypto.randomUUID(); groupOps = 0; }
    groupDepth += 1;
    try {
      return action();
    } finally {
      groupDepth -= 1;
      if (groupDepth === 0) {
        const finished = groupId;
        groupId = null;
        // A group larger than one request is split so it can still be uploaded.
        if (state && finished && groupOps > MAX_OPERATIONS_PER_REQUEST) {
          let n = 0;
          let chunk = crypto.randomUUID();
          state.outbox = state.outbox.map((op) => {
            if (op.groupId !== finished) return op;
            if (n++ % MAX_OPERATIONS_PER_REQUEST === 0 && n > 1) chunk = crypto.randomUUID();
            return { ...op, groupId: chunk };
          });
          persist();
        }
        if (configured && state && groupOps > 0) void this.flush();
      }
    }
  },

  status() {
    const outbox = state?.outbox ?? [];
    return {
      pending: outbox.filter((op) => op.state === 'queued').length,
      conflict: conflictGroups(state ?? emptyState('', '')).length,
      error: errorMessage,
      running,
      configured,
      lastSyncedAt: state?.lastSyncedAt ?? null,
    };
  },

  conflicts(): ConflictGroup[] {
    return state ? conflictGroups(state) : [];
  },

  async resolve(groupToResolve: string, choice: 'keep_local' | 'use_cloud') {
    if (!state) return;
    const { state: next, refetch } = resolveGroup(state, groupToResolve, choice, () => crypto.randomUUID());
    state = next;
    persist();
    announce();
    if (refetch || choice === 'keep_local') await this.flush();
  },

  flush(): Promise<void> {
    if (!configured || !state || !navigator.onLine) return Promise.resolve();
    if (flushPromise) return flushPromise;
    running = true;
    announce();
    const owner = state;
    flushPromise = (async () => {
      let received = 0;
      try {
        await upload(owner);
        received = await download(owner);
        errorMessage = '';
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'Cloud save failed. Changes remain on this device.';
      } finally {
        running = false;
        flushPromise = null;
        announce();
        // The app re-reads farm data only when another device's changes arrived.
        if (received > 0 && typeof window !== 'undefined') window.dispatchEvent(new Event('mylkio_farm_data_synced'));
      }
    })();
    return flushPromise;
  },
};
