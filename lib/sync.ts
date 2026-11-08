'use client';

import { CloudStore } from './cloud-store';

// Phase 2 persists revisioned bucket drafts. Legacy operations are retained in
// localStorage for migration but are never sent under a different user's session.
export interface SyncOperation {
  id: string;
  entity: 'cow' | 'buyer' | 'milk' | 'milk_entry' | 'delivery' | 'payment' | 'health' | 'health_event' | 'breeding' | 'breeding_event' | 'expense';
  action: 'create' | 'update' | 'delete';
  payload: unknown;
}
export const SyncEngine = {
  enqueue(_entity: SyncOperation['entity'], _action: SyncOperation['action'], _payload: unknown) {
    // Persistence happens in AppStorage.saveTenantData, including farm/reminder writes.
  },
  getPendingCount() { return CloudStore.status().pending; },
  getLastSyncTime(): string | null { return null; },
  async processSync() {
    await CloudStore.flush();
    return { synced: 0, failed: CloudStore.status().pending };
  },
};
