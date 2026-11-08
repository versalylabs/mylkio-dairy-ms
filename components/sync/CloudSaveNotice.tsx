'use client';
import { useEffect, useState } from 'react';
import { CloudStore } from '@/lib/cloud-store';

export function CloudSaveNotice() {
  const [status, setStatus] = useState(CloudStore.status());
  useEffect(() => {
    const update = () => setStatus(CloudStore.status());
    const online = () => { void CloudStore.flush(); };
    update();
    window.addEventListener('mylkio_cloud_changed', update);
    window.addEventListener('online', online);
    return () => { window.removeEventListener('mylkio_cloud_changed', update); window.removeEventListener('online', online); };
  }, []);
  if (!status.pending && !status.error && !status.conflict) return null;
  return <div role="status" className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-xl rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 shadow-lg">
    {status.error || (status.conflict ? `${status.conflict} record group(s) changed on another device. Local changes are saved here and need review.` : `${status.pending} changes saved on this device. ${status.running ? 'Saving to cloud…' : 'Waiting for cloud save.'}`)}
    {!status.running && <button className="ml-3 font-bold underline" onClick={() => void CloudStore.flush()}>Retry</button>}
  </div>;
}
