'use client';

import { bucketNames, type BucketName } from './backend-contract';

type Bucket = { data: unknown; revision: number; pending: boolean; generation: number; conflict?: boolean };
type State = { userId: string; farmId: string; buckets: Partial<Record<BucketName, Bucket>> };
let state: State | null = null;
let running = false;
let flushPromise: Promise<void> | null = null;
let errorMessage = '';
let configured = false;
const namespace = 'mylkio_offline_v2_';
const key = (s: State) => `${namespace}${s.userId}_${s.farmId}`;
function announce() { if (typeof window !== 'undefined') window.dispatchEvent(new Event('mylkio_cloud_changed')); }
function persist(s: State) { localStorage.setItem(key(s), JSON.stringify(s)); }
function readCache(s: State): State | null {
  const cached = localStorage.getItem(key(s));
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached);
    return parsed.userId === s.userId && parsed.farmId === s.farmId ? parsed : null;
  } catch { throw new Error('Your local farm cache needs recovery. Contact support before clearing it.'); }
}

export const CloudStore = {
  configure(enabled: boolean) { configured = enabled; },
  async load(userId: string, farmId: string) {
    const next: State = readCache({ userId, farmId, buckets: {} }) ?? { userId, farmId, buckets: {} };
    if (configured && navigator.onLine) {
      const response = await fetch(`/api/farms/${farmId}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load your farm from the cloud. Please retry.');
      const remote = await response.json();
      for (const name of bucketNames) {
        const local = next.buckets[name];
        const row = remote.buckets.find((b: {bucket: string}) => b.bucket === name);
        if (local?.pending) {
          if (local.revision !== (row?.revision ?? 0)) {
            local.pending = false;
            local.conflict = true;
          }
          continue;
        }
        next.buckets[name] = { data: row?.data ?? null, revision: row?.revision ?? 0, pending: false, generation: 0 };
      }
      } else if (configured && !Object.values(next.buckets).some(bucket => bucket?.data != null)) {
      throw new Error('Connect to the internet once to set up this account on this device.');
    }
    for (const name of bucketNames) next.buckets[name] ??= { data: null, revision: 0, pending: false, generation: 0 };
    persist(next); state = next; errorMessage = ''; announce();
    if (configured) void this.flush();
  },
  clear() { state = null; errorMessage = ''; announce(); },
  read<T>(farmId: string, bucket: BucketName, fallback: T): T {
    if (!state || state.farmId !== farmId) return fallback;
    const value = state.buckets[bucket]?.data;
    return value == null ? fallback : structuredClone(value) as T;
  },
  write(farmId: string, bucket: BucketName, data: unknown) {
    if (!state || state.farmId !== farmId) throw new Error('Open your authenticated farm before editing records.');
    const previous = state.buckets[bucket];
    const next: State = { ...state, buckets: { ...state.buckets, [bucket]: {
      data: structuredClone(data), revision: previous?.revision ?? 0,
      pending: configured, conflict: false, generation: (previous?.generation ?? 0) + 1,
    } } };
    // Persist first: standalone/offline farms continue to work without cloud credentials.
    persist(next); state = next; announce();
    if (configured) void this.flush();
  },
  status() {
    return { pending: Object.values(state?.buckets ?? {}).filter(b => b?.pending).length,
      conflict: Object.values(state?.buckets ?? {}).filter(b => b?.conflict).length, error: errorMessage, running, configured };
  },
  flush(): Promise<void> {
    if (!configured || !state || !navigator.onLine) return Promise.resolve();
    if (flushPromise) return flushPromise;
    running = true; announce(); const owner = state;
    flushPromise = Promise.resolve().then(async () => { try {
      for (const name of bucketNames) {
        if (!state || state.userId !== owner.userId || state.farmId !== owner.farmId) break;
        while (state?.buckets[name]?.pending) {
          const draft = structuredClone(state.buckets[name]!);
          const response = await fetch(`/api/farms/${owner.farmId}/${name}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: draft.data, revision: draft.revision }),
          });
          const result = await response.json();
          if (response.status === 409) {
            const current = state?.buckets[name];
            if (current && state?.userId === owner.userId && state.farmId === owner.farmId) {
              current.pending = false; current.conflict = true; persist(state);
            }
            throw new Error('Farm data changed elsewhere. Your local changes are saved on this device; reconcile before retrying.');
          }
          if (!response.ok) throw new Error(result.error || 'Cloud save failed. Changes remain on this device.');
          if (!state || state.userId !== owner.userId || state.farmId !== owner.farmId) break;
          const current = state.buckets[name]!;
          current.revision = result.revision;
          current.pending = current.generation !== draft.generation;
          current.conflict = false; persist(state);
        }
      }
      errorMessage = '';
    } catch (error) { errorMessage = error instanceof Error ? error.message : 'Cloud save failed. Changes remain on this device.'; }
    finally { running = false; flushPromise = null; announce(); } });
    return flushPromise;
  },
};
