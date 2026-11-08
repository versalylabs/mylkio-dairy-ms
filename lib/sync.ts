'use client';

import { CloudStore } from './cloud-store';

// Thin facade used by the status bar. Record-level operations are created by
// CloudStore.write (see lib/cloud-store.ts); `enqueue` is kept so existing call
// sites in storage stay valid but does nothing on its own.
export interface SyncOperation {
  id: string;
  entity: 'cow' | 'buyer' | 'milk' | 'milk_entry' | 'delivery' | 'payment' | 'health' | 'health_event' | 'breeding' | 'breeding_event' | 'expense';
  action: 'create' | 'update' | 'delete';
  payload: unknown;
}

export const SyncEngine = {
  enqueue(_entity: SyncOperation['entity'], _action: SyncOperation['action'], _payload: unknown) {},
  getPendingCount() { return CloudStore.status().pending; },
  getLastSyncTime(): string | null {
    const at = CloudStore.status().lastSyncedAt;
    if (!at) return null;
    return new Intl.DateTimeFormat('en-KE', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' }).format(new Date(at));
  },
  async processSync() {
    await CloudStore.flush();
    const status = CloudStore.status();
    return { pending: status.pending, conflicts: status.conflict };
  },
};
