'use client';

export interface SyncOperation {
  id: string;
  entity: 'cow' | 'buyer' | 'milk' | 'milk_entry' | 'delivery' | 'payment' | 'health' | 'health_event' | 'breeding' | 'breeding_event' | 'expense';
  action: 'create' | 'update' | 'delete';
  payload: any;
  timestamp: string;
  status: 'pending' | 'syncing' | 'synced' | 'conflict';
  retryCount: number;
}

const SYNC_QUEUE_KEY = 'mylkio_sync_queue';
const LAST_SYNC_KEY = 'mylkio_last_sync_time';

export const SyncEngine = {
  getQueue(): SyncOperation[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  enqueue(entity: SyncOperation['entity'], action: SyncOperation['action'], payload: any): SyncOperation {
    const queue = this.getQueue();
    const op: SyncOperation = {
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      entity,
      action,
      payload,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    };

    queue.push(op);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    this.dispatchUpdate();

    // Trigger auto-sync if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      setTimeout(() => this.processSync(), 500);
    }

    return op;
  },

  getLastSyncTime(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(LAST_SYNC_KEY);
  },

  setLastSyncTime(time: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LAST_SYNC_KEY, time);
  },

  async processSync(): Promise<{ synced: number; failed: number }> {
    if (typeof window === 'undefined' || !navigator.onLine) {
      return { synced: 0, failed: 0 };
    }

    const queue = this.getQueue();
    const pending = queue.filter((op) => op.status === 'pending');
    if (pending.length === 0) {
      this.dispatchUpdate();
      return { synced: 0, failed: 0 };
    }

    window.dispatchEvent(new CustomEvent('mylkio_syncing_state', { detail: { isSyncing: true } }));

    // Simulate batch idempotent sync with simulated network delay
    await new Promise((res) => setTimeout(res, 800));

    let syncedCount = 0;
    const updatedQueue = queue.map((op) => {
      if (op.status === 'pending') {
        syncedCount++;
        return {
          ...op,
          status: 'synced' as const,
        };
      }
      return op;
    });

    // Retain only unsynced or recent operations to prevent memory bloat
    const cleanedQueue = updatedQueue.filter((op) => op.status !== 'synced');
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(cleanedQueue));
    this.setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    window.dispatchEvent(new CustomEvent('mylkio_syncing_state', { detail: { isSyncing: false } }));
    this.dispatchUpdate();

    return { synced: syncedCount, failed: 0 };
  },

  getPendingCount(): number {
    return this.getQueue().filter((op) => op.status === 'pending').length;
  },

  dispatchUpdate() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event('mylkio_sync_updated'));
  }
};
