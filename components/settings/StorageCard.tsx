'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { DatabaseBackup, Download, HardDrive, Image as ImageIcon, WifiOff } from 'lucide-react';
import { checkStorage, LocalStore, type StorageHealth } from '@/lib/local-store';
import { backupAdvice, formatBytes, lastBackupAt } from '@/lib/backup';
import { photoSavings } from '@/lib/photos';

interface StorageCardProps {
  farmId: string;
  /** Number of records on the farm, to decide whether to remind about backups. */
  recordCount: number;
  cows: { photoUrl?: string; photoUrls?: string[] }[];
  onDownloadBackup: () => void;
  onShrinkPhotos: () => Promise<{ shrunk: number; savedBytes: number }>;
}

type OfflineState = 'ready' | 'not_yet' | 'unsupported';

/** Does this phone have the app saved so it opens without internet? */
async function offlineState(): Promise<OfflineState> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || typeof caches === 'undefined') return 'unsupported';
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.active) return 'not_yet';
    for (const name of await caches.keys()) {
      if (!name.startsWith('mylkio-cache-')) continue;
      const cache = await caches.open(name);
      const scripts = (await cache.keys()).filter((request) => new URL(request.url).pathname.startsWith('/_next/static/')).length;
      if ((await cache.match('/')) && scripts > 0) return 'ready';
    }
    return 'not_yet';
  } catch { return 'unsupported'; }
}

/**
 * Where the farm is kept on this phone, and the farmer's own safety net: a backup file, a way to free space by
 * shrinking photos, and whether the app will open with no internet.
 */
export function StorageCard({ farmId, recordCount, cows, onDownloadBackup, onShrinkPhotos }: StorageCardProps) {
  const [health, setHealth] = useState<StorageHealth | null>(null);
  const [offline, setOffline] = useState<OfflineState | null>(null);
  const [saveError, setSaveError] = useState('');
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shrinkResult, setShrinkResult] = useState('');
  const [savings, setSavings] = useState(() => photoSavings(cows));

  const refresh = useCallback(async () => {
    setHealth(await checkStorage(true));
    setOffline(await offlineState());
    setLastBackup(lastBackupAt(farmId));
    setSaveError(LocalStore.status().error);
  }, [farmId]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => setSavings(photoSavings(cows)), [cows]);
  useEffect(() => LocalStore.subscribe(() => setSaveError(LocalStore.status().error)), []);

  const advice = backupAdvice(lastBackup, recordCount);
  const usedShare = health?.usage != null && health.quota ? health.usage / health.quota : null;

  const shrink = async () => {
    setBusy(true); setShrinkResult('');
    try {
      const { shrunk, savedBytes } = await onShrinkPhotos();
      setShrinkResult(shrunk === 0 ? 'Nothing needed shrinking.' : `Shrunk ${shrunk} ${shrunk === 1 ? 'photo' : 'photos'}, freeing about ${formatBytes(savedBytes)}.`);
    } catch (cause) {
      setShrinkResult(cause instanceof Error ? cause.message : 'Could not shrink the photos.');
    } finally { setBusy(false); void refresh(); }
  };

  return (
    <section aria-labelledby="storage-heading" className="rounded-2xl border border-ivory-border bg-white p-5 shadow-soft space-y-5">
      <div className="flex items-start gap-3">
        <div className="icon-tile"><DatabaseBackup className="h-5 w-5" /></div>
        <div>
          <h2 id="storage-heading" className="text-base font-bold text-charcoal">Backup and storage</h2>
          <p className="mt-1 text-sm text-charcoal-muted">Your farm is saved on this phone and in the cloud. A backup file is your own copy, kept outside Mylkio.</p>
        </div>
      </div>

      {saveError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{saveError}</p>}

      <div className="rounded-xl border border-ivory-border bg-ivory-muted/50 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-charcoal">Backup</p>
            <p className={`text-sm ${advice.level === 'remind' ? 'font-semibold text-gold-600' : 'text-charcoal-light'}`}>{advice.message}</p>
          </div>
          <button type="button" className="btn btn-primary shrink-0" onClick={() => { onDownloadBackup(); window.setTimeout(() => setLastBackup(lastBackupAt(farmId)), 200); }}>
            <Download className="h-4 w-4" />Download backup
          </button>
        </div>
        <p className="text-xs text-charcoal-muted">To restore a backup into this farm, use &ldquo;Restore from a backup&rdquo; below. Records that are already here are kept as they are.</p>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-ivory-border p-4">
          <dt className="flex items-center gap-2 text-sm font-semibold text-charcoal"><HardDrive className="h-4 w-4 text-sage" />On this phone</dt>
          <dd className="mt-1 text-sm text-charcoal-light">
            {health?.usage != null ? <>Using {formatBytes(health.usage)}{health.quota ? ` of about ${formatBytes(health.quota)} available` : ''}{usedShare !== null && usedShare > 0.8 ? '. Space is running low.' : '.'}</> : 'Storage size is not reported by this browser.'}
          </dd>
          <dd className="mt-1 text-xs text-charcoal-muted">
            {health?.persistent === true ? 'Protected: the phone will not clear it to make room.' : health?.persistent === false ? 'Not protected yet. Adding Mylkio to your home screen helps keep your records on this phone.' : ''}
          </dd>
        </div>
        <div className="rounded-xl border border-ivory-border p-4">
          <dt className="flex items-center gap-2 text-sm font-semibold text-charcoal"><WifiOff className="h-4 w-4 text-sage" />Opens without internet</dt>
          <dd className="mt-1 text-sm text-charcoal-light">
            {offline === 'ready' ? 'Ready. Mylkio is saved on this phone.' : offline === 'not_yet' ? 'Not ready yet. Stay online for a minute after opening Mylkio, then check again.' : offline === 'unsupported' ? 'This browser cannot save Mylkio for offline use.' : 'Checking…'}
          </dd>
        </div>
      </dl>

      {savings.photos > 0 && (
        <div className="rounded-xl border border-ivory-border p-4 space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-charcoal"><ImageIcon className="h-4 w-4 text-sage" />Photos</p>
          <p className="text-sm text-charcoal-light">
            {savings.photos} saved {savings.photos === 1 ? 'photo' : 'photos'} using {formatBytes(savings.bytes)}.
            {savings.large > 0 ? ` ${savings.large} ${savings.large === 1 ? 'is' : 'are'} larger than needed.` : ' All are a good size.'}
          </p>
          {savings.large > 0 && <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void shrink()}>{busy ? 'Shrinking…' : 'Shrink photos'}</button>}
          {shrinkResult && <p role="status" className="text-sm font-semibold text-sage">{shrinkResult}</p>}
        </div>
      )}
    </section>
  );
}
