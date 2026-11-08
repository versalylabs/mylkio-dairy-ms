'use client';
import { useEffect, useState } from 'react';
import { CloudStore } from '@/lib/cloud-store';
import type { ConflictGroup, PendingOp } from '@/lib/sync-core';
import type { BucketName } from '@/lib/backend-contract';

const kind: Record<BucketName, string> = {
  farm: 'Farm profile', cows: 'Cow', buyers: 'Buyer', milk: 'Milk record', deliveries: 'Delivery', payments: 'Payment',
  health: 'Health record', breeding: 'Breeding record', expenses: 'Expense', reminders: 'Reminder',
  statements: 'Co-op statement', bills: 'Customer bill', allocations: 'Payment allocation',
};

function describe(op: PendingOp): string {
  const d = (op.data ?? op.server?.data ?? {}) as Record<string, unknown>;
  const label =
    (d.name as string) || (d.tag as string) || (d.buyerName as string) || (d.title as string) || (d.description as string) || '';
  const detail =
    op.bucket === 'milk' ? `${d.date ?? ''} ${d.session ?? ''} ${d.totalLitres ?? ''} L` :
    op.bucket === 'deliveries' ? `${d.date ?? ''} ${d.litres ?? ''} L` :
    op.bucket === 'payments' ? `${d.date ?? ''} KSh ${Number(d.amount ?? 0).toLocaleString()}` : '';
  const what = op.action === 'delete' ? 'deleted' : d.voidedAt ? 'voided' : op.baseVersion === 0 ? 'added' : 'changed';
  return `${kind[op.bucket]} ${what}: ${[label, detail].filter(Boolean).join(' · ') || op.recordId}`;
}

function ConflictCard({ group, busy, onResolve }: { group: ConflictGroup; busy: boolean; onResolve: (choice: 'keep_local' | 'use_cloud') => void }) {
  const rejected = group.state === 'rejected';
  return (
    <li className="rounded-xl border border-amber-300 bg-white p-3 space-y-2">
      <p className="text-sm font-semibold">
        {rejected
          ? group.message || 'The cloud did not accept this change. Records of milk, deliveries and payments can only be voided, not edited.'
          : 'This was changed on another device before your change reached the cloud.'}
      </p>
      <ul className="text-sm list-disc pl-5 text-amber-950">
        {group.ops.map((op) => <li key={op.opId}>{describe(op)}</li>)}
      </ul>
      <div className="flex flex-wrap gap-2">
        {!rejected && (
          <button type="button" disabled={busy} onClick={() => onResolve('keep_local')}
            className="rounded-lg bg-[#345C4A] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
            Keep this device&apos;s version
          </button>
        )}
        <button type="button" disabled={busy}
          onClick={() => {
            if (window.confirm('Discard the change made on this device and use the cloud copy instead?')) onResolve('use_cloud');
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold text-gray-800 disabled:opacity-50">
          {rejected ? 'Discard this change' : 'Use the cloud version'}
        </button>
      </div>
    </li>
  );
}

export function CloudSaveNotice() {
  const [status, setStatus] = useState(CloudStore.status());
  const [conflicts, setConflicts] = useState<ConflictGroup[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const update = () => { setStatus(CloudStore.status()); setConflicts(CloudStore.conflicts()); };
    update();
    window.addEventListener('mylkio_cloud_changed', update);
    return () => window.removeEventListener('mylkio_cloud_changed', update);
  }, []);

  if (!status.pending && !status.error && !conflicts.length) return null;

  const resolve = async (groupId: string, choice: 'keep_local' | 'use_cloud') => {
    setBusy(true);
    try { await CloudStore.resolve(groupId, choice); }
    finally { setBusy(false); }
  };

  return (
    <div role="status" className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-xl rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 shadow-lg">
      {conflicts.length > 0 ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">
              {conflicts.length} change{conflicts.length > 1 ? 's need' : ' needs'} your review. Everything is still saved on this device.
            </span>
            <button type="button" className="font-bold underline shrink-0" onClick={() => setOpen(!open)}>
              {open ? 'Hide' : 'Review'}
            </button>
          </div>
          {open && (
            <ul className="mt-3 space-y-2 max-h-[50vh] overflow-y-auto">
              {conflicts.map((g) => (
                <ConflictCard key={g.groupId} group={g} busy={busy} onResolve={(c) => void resolve(g.groupId, c)} />
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          {status.error || `${status.pending} change${status.pending === 1 ? '' : 's'} saved on this device. ${status.running ? 'Saving to cloud…' : 'Waiting to save to the cloud.'}`}
          {!status.running && <button type="button" className="ml-3 font-bold underline" onClick={() => void CloudStore.flush()}>Retry</button>}
        </>
      )}
    </div>
  );
}
