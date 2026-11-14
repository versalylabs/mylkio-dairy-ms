'use client';

import React, { useState, useEffect } from 'react';
import { SyncEngine } from '@/lib/sync';
import { CloudStore } from '@/lib/cloud-store';
import { Language } from '@/types';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react';

interface SyncStatusBarProps {
  lang: Language;
  onOpenExport?: () => void;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({
  lang,
  onOpenExport,
}) => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [cloudConfigured, setCloudConfigured] = useState(false);

  const updateState = () => {
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
    setPendingCount(SyncEngine.getPendingCount());
    setLastSyncTime(SyncEngine.getLastSyncTime());
    setCloudConfigured(CloudStore.status().configured);
  };

  useEffect(() => {
    updateState();

    const handleOnline = () => {
      setIsOnline(true);
      SyncEngine.processSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleSyncUpdated = () => {
      updateState();
    };

    const handleSyncingState = (e: any) => {
      setIsSyncing(e.detail?.isSyncing ?? false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('mylkio_sync_updated', handleSyncUpdated);
    window.addEventListener('mylkio_cloud_changed', handleSyncUpdated);
    window.addEventListener('mylkio_syncing_state', handleSyncingState);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('mylkio_sync_updated', handleSyncUpdated);
      window.removeEventListener('mylkio_cloud_changed', handleSyncUpdated);
      window.removeEventListener('mylkio_syncing_state', handleSyncingState);
    };
  }, []);

  const handleManualSync = async () => {
    if (isSyncing || !isOnline) return;
    await SyncEngine.processSync();
  };

  const savedText =
    (!cloudConfigured
      ? (lang === 'sw' ? 'Imehifadhiwa kwenye kifaa hiki' : 'Demo saved on this device')
      : (lang === 'sw' ? 'Hakuna mabadiliko yanayosubiri' : 'No pending cloud changes')) +
    (lastSyncTime ? ` (${lastSyncTime})` : '');

  return (
    <div className="flex items-center gap-2">
      {!isOnline ? (
        <div role="status" className="inline-flex min-h-11 items-center gap-1.5 px-3 rounded-full text-sm font-semibold bg-amber-50 text-amber-900 border border-amber-300">
          <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
          <span className="sm:hidden">{lang === 'sw' ? 'Nje ya mtandao' : 'Offline'}</span>
          <span className="hidden sm:inline">{lang === 'sw' ? 'Nje ya Mtandao (Data Imehifadhiwa Simuni)' : 'Offline • Saved on device'}</span>
        </div>
      ) : pendingCount > 0 ? (
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="inline-flex min-h-11 items-center gap-1.5 px-3 rounded-full text-sm font-bold bg-blue-50 text-blue-900 border border-blue-300 hover:bg-blue-100 transition-colors"
        >
          <CloudUpload className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-bounce' : ''}`} />
          <span className="sm:hidden">
            {isSyncing
              ? (lang === 'sw' ? 'Inasawazisha' : 'Syncing')
              : `${pendingCount} ${lang === 'sw' ? 'zinasubiri' : 'to sync'}`}
          </span>
          <span className="hidden sm:inline">
            {isSyncing
              ? (lang === 'sw' ? 'Inasawazisha...' : 'Syncing records...')
              : `${pendingCount} ${lang === 'sw' ? 'rekodi zinasubiri kusawazishwa' : 'waiting to sync'}`}
          </span>
          <RefreshCw className={`w-3 h-3 ml-1 text-blue-500 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      ) : (
        <div role="status" title={savedText} aria-label={savedText} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 px-2.5 sm:px-3 rounded-full text-sm font-semibold bg-[#A8BFA5]/20 text-[#26332D] border border-[#A8BFA5]/40">
          <CheckCircle2 className="w-4 h-4 text-[#345C4A] shrink-0" />
          <span className="hidden sm:inline">{savedText}</span>
        </div>
      )}
    </div>
  );
};
