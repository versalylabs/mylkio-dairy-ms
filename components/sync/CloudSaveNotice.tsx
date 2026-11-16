'use client';
import { useEffect, useState } from 'react';
import { CloudStore } from '@/lib/cloud-store';
import type { ConflictGroup, PendingOp } from '@/lib/sync-core';
import type { BucketName } from '@/lib/backend-contract';
import { SYNC_COPY, translateMessage, type Lang } from '@/lib/app-copy';
import { useLanguage } from '@/lib/use-language';

function describe(op: PendingOp, lang: Lang): string {
  const t = SYNC_COPY[lang];
  const d = (op.data ?? op.server?.data ?? {}) as Record<string, unknown>;
  const label =
    (d.name as string) || (d.tag as string) || (d.buyerName as string) || (d.title as string) || (d.description as string) || '';
  const detail =
    op.bucket === 'milk' ? `${d.date ?? ''} ${d.session ?? ''} ${d.totalLitres ?? ''} L` :
    op.bucket === 'deliveries' ? `${d.date ?? ''} ${d.litres ?? ''} L` :
    op.bucket === 'payments' ? `${d.date ?? ''} KSh ${Number(d.amount ?? 0).toLocaleString()}` : '';
  const what = op.action === 'delete' ? t.did.deleted : d.voidedAt ? t.did.voided : op.baseVersion === 0 ? t.did.added : t.did.changed;
  return `${t.kind[op.bucket]} ${what}: ${[label, detail].filter(Boolean).join(' · ') || op.recordId}`;
}

function ConflictCard({ group, busy, onResolve, lang }: { group: ConflictGroup; busy: boolean; onResolve: (choice: 'keep_local' | 'use_cloud') => void; lang: Lang }) {
  const rejected = group.state === 'rejected';
  const t = SYNC_COPY[lang];
  return (
    <li className="rounded-xl border border-amber-300 bg-white p-3 space-y-2">
      <p className="text-sm font-semibold">
        {rejected
          ? (group.message ? translateMessage(group.message, lang) : t.rejectedDefault)
          : t.changedElsewhere}
      </p>
      <ul className="text-sm list-disc pl-5 text-amber-950">
        {group.ops.map((op) => <li key={op.opId}>{describe(op, lang)}</li>)}
      </ul>
      <div className="flex flex-wrap gap-2">
        {!rejected && (
          <button type="button" disabled={busy} onClick={() => onResolve('keep_local')}
            className="rounded-lg bg-[#345C4A] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
            {t.keepMine}
          </button>
        )}
        <button type="button" disabled={busy}
          onClick={() => {
            if (window.confirm(t.confirmUseCloud)) onResolve('use_cloud');
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold text-gray-800 disabled:opacity-50">
          {rejected ? t.discard : t.useCloud}
        </button>
      </div>
    </li>
  );
}

export function CloudSaveNotice() {
  const [lang] = useLanguage();
  const t = SYNC_COPY[lang];
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

  if (!status.pending && !status.error && !status.storageError && !conflicts.length) return null;

  // The phone itself could not save: the most serious message, and it stays until a save works again.
  if (status.storageError) {
    return (
      <div role="alert" className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-xl rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-950 shadow-lg">
        <p className="font-semibold">{translateMessage(status.storageError, lang)}</p>
        <p className="mt-1">{t.notYetInCloud(status.pending)}</p>
      </div>
    );
  }

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
              {t.review(conflicts.length)}
            </span>
            <button type="button" className="font-bold underline shrink-0" onClick={() => setOpen(!open)}>
              {open ? t.hide : t.reviewButton}
            </button>
          </div>
          {open && (
            <ul className="mt-3 space-y-2 max-h-[50vh] overflow-y-auto">
              {conflicts.map((g) => (
                <ConflictCard key={g.groupId} group={g} busy={busy} lang={lang} onResolve={(c) => void resolve(g.groupId, c)} />
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          {status.error ? translateMessage(status.error, lang) : t.pending(status.pending, Boolean(status.running))}
          {!status.running && <button type="button" className="ml-3 font-bold underline" onClick={() => void CloudStore.flush()}>{t.retry}</button>}
        </>
      )}
    </div>
  );
}
