'use client';

import React, { useState, useEffect } from 'react';
import { SyncEngine } from '@/lib/sync';
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

  const updateState = () => {
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
    setPendingCount(SyncEngine.getPendingCount());
    setLastSyncTime(SyncEngine.getLastSyncTime());
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
    window.addEventListener('mylkio_syncing_state', handleSyncingState);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('mylkio_sync_updated', handleSyncUpdated);
      window.removeEventListener('mylkio_syncing_state', handleSyncingState);
    };
  }, []);

  const handleManualSync = async () => {
    if (isSyncing || !isOnline) return;
    await SyncEngine.processSync();
  };

  return (
    <div className="flex items-center gap-2">
      {!isOnline ? (
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <WifiOff className="w-3.5 h-3.5 text-amber-600" />
          <span>{lang === 'sw' ? 'Nje ya Mtandao (Data Imehifadhiwa Simuni)' : 'Offline • Saved on device'}</span>
        </div>
      ) : pendingCount > 0 ? (
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition-colors shadow-2xs"
        >
          <CloudUpload className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-bounce' : ''}`} />
          <span>
            {isSyncing
              ? (lang === 'sw' ? 'Inasawazisha...' : 'Syncing records...')
              : `${pendingCount} ${lang === 'sw' ? 'rekodi zinasubiri kusawazishwa' : 'waiting to sync'}`}
          </span>
          <RefreshCw className={`w-3 h-3 ml-1 text-blue-500 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      ) : (
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            {lang === 'sw' ? 'Imehifadhiwa na Kusawazishwa' : 'Synced on device'}
            {lastSyncTime ? ` (${lastSyncTime})` : ''}
          </span>
        </div>
      )}
    </div>
  );
};
