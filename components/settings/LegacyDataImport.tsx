'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Database, UploadCloud } from 'lucide-react';
import { LegacyDataMigration, type ImportResult, type LegacySource } from '@/lib/data-migration';
import type { MigrationPreview } from '@/lib/migration-validation';

export function LegacyDataImport({ targetFarmId, language }: { targetFarmId: string; language: 'en' | 'sw' }) {
  const [sources, setSources] = useState<LegacySource[]>([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [backup, setBackup] = useState<Record<string, unknown> | null>(null);
  const [backupName, setBackupName] = useState('');
  const [preview, setPreview] = useState<MigrationPreview | null>(null);
  const sw = language === 'sw';

  const refresh = () => {
    try {
      const found = LegacyDataMigration.sources();
      setSources(found);
      setSelected(current => found.some(source => source.farmId === current) ? current : found[0]?.farmId || '');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not read local farm records.'); }
  };
  useEffect(refresh, []);

  useEffect(() => {
    try {
      const next = backup
        ? LegacyDataMigration.previewPayload(backup, targetFarmId)
        : selected ? LegacyDataMigration.previewLegacy(selected, targetFarmId) : null;
      setPreview(next);
    } catch (cause) { setPreview(null); setError(cause instanceof Error ? cause.message : 'Could not validate the selected farm backup.'); }
  }, [backup, selected, targetFarmId]);

  const selectBackup = async (file?: File) => {
    if (!file) { setBackup(null); setBackupName(''); return; }
    setError(''); setResult(null);
    if (file.size > 25 * 1024 * 1024) { setBackup(null); setBackupName(''); setError('Backup is larger than 25 MB. Keep it private and split or remove embedded media before import.'); return; }
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Choose a Mylkio JSON farm backup.');
      setBackup(parsed as Record<string, unknown>); setBackupName(file.name);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not read this JSON backup.'); setBackup(null); }
  };

  const importData = async () => {
    if ((!selected && !backup) || busy || !preview || preview.errors.length) return;
    const name = backup ? backupName : (sources.find(row => row.farmId === selected)?.name || selected);
    if (!window.confirm(sw
      ? `Hamisha hadi rekodi ${total} kutoka ${name} kwenda kwenye akaunti hii? Data ya zamani itabaki kwenye kifaa.`
      : `Import up to ${total} records from ${name} into this farm? Existing cloud records are protected and the old local copy will remain on this device.`)) return;
    setBusy(true); setError(''); setResult(null);
    try { setResult(backup
      ? await LegacyDataMigration.importPayload(backup, targetFarmId)
      : await LegacyDataMigration.import(selected, targetFarmId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Import failed. Local records remain unchanged.'); }
    finally { setBusy(false); refresh(); }
  };

  const source = sources.find(row => row.farmId === selected);
  const localTotal = source ? Object.values(source.counts).reduce((sum, count) => sum + (count || 0), 0) : 0;
  const total = backup ? Object.values(preview?.counts || {}).reduce((sum, count) => sum + (count || 0), 0) : localTotal;

  return <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm space-y-4">
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700"><Database className="h-5 w-5" /></div>
      <div>
        <h2 className="text-base font-bold text-gray-900">{sw ? 'Hamisha rekodi za zamani' : 'Import existing farm records'}</h2>
        <p className="mt-1 text-xs text-gray-600">{sw ? 'Unganisha data iliyohifadhiwa kwenye kifaa hiki na akaunti yako ya shamba.' : 'Bring records saved by the earlier local version on this device into this farm account.'}</p>
      </div>
    </div>
    <label className="block text-xs font-semibold text-gray-700">
      {sw ? 'Chagua chelezo ya JSON' : 'Choose a JSON farm backup'}
      <input type="file" accept="application/json,.json" onChange={event => void selectBackup(event.target.files?.[0])} className="mt-1.5 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[#345C4A] file:px-3 file:py-2 file:font-bold file:text-white" />
    </label>
    {sources.length > 0 && !backup && <>
      <label className="block text-xs font-semibold text-gray-700">
        {sw ? 'Shamba la zamani' : 'Local farm'}
        <select className="mt-1.5 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm" value={selected} onChange={event => { setSelected(event.target.value); setResult(null); }}>
          {sources.map(row => <option key={row.farmId} value={row.farmId}>{row.name} ({Object.values(row.counts).reduce((sum, count) => sum + (count || 0), 0)} {sw ? 'rekodi' : 'records'})</option>)}
        </select>
      </label>
      <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{sw ? 'Rekodi huunganishwa kwa kitambulisho. Rekodi za akaunti ya mtandaoni zinabaki; migongano huripotiwa. Data ya zamani haifutwi.' : 'Records merge by ID. Existing cloud records are kept; mismatches are reported. Your old local data is not deleted.'}</span></div>
    </>}
    {preview && <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800 space-y-1">
      <p className="font-bold">{sw ? 'Muhtasari wa ukaguzi' : 'Dry-run summary'} {backup ? `— ${backupName}` : ''}</p>
      <p>{Object.entries(preview.counts).map(([bucket, count]) => `${bucket}: ${count}`).join(' · ')}</p>
      {preview.conflicts > 0 && <p className="text-amber-800">{preview.conflicts} {sw ? 'vitambulisho vinatofautiana na data ya mtandaoni' : 'IDs differ from records already in this cloud farm; cloud copies will be kept.'}</p>}
      {preview.errors.map((message, index) => <p key={`error-${index}`} className="text-red-800">{message}</p>)}
      {preview.warnings.slice(0, 5).map((message, index) => <p key={`warning-${index}`} className="text-amber-800">{message}</p>)}
      {preview.warnings.length > 5 && <p>{preview.warnings.length - 5} more validation warnings.</p>}
      {preview.financial.slice(0, 5).map(row => <p key={row.buyerId} className="text-amber-900">{row.buyerName}: balance KSh {row.recordedBalance.toLocaleString()}, deliveries KSh {row.deliveryBalance.toLocaleString()}, gap KSh {row.gap.toLocaleString()}.</p>)}
    </div>}
      <button type="button" disabled={(!selected && !backup) || busy || total === 0 && !backup || !preview || preview.errors.length > 0} onClick={importData} className="inline-flex items-center gap-2 rounded-xl bg-[#345C4A] px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
        <UploadCloud className="h-4 w-4" />{busy ? (sw ? 'Inahamisha…' : 'Importing…') : (sw ? 'Hamisha sasa' : 'Import records')}
      </button>
    {result && <div className="space-y-1 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
      <div className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-4 w-4" />{sw ? 'Ukaguzi wa uhamisho umekamilika' : 'Import pass completed'}</div>
      <p>{sw ? 'Mpya' : 'Added'}: {result.imported} · {sw ? 'Tayari zipo' : 'Already present'}: {result.unchanged} · {sw ? 'Migongano' : 'Conflicts'}: {result.conflicts}</p>
      {result.errors.map((message, index) => <p key={index} className="text-amber-800">{message}</p>)}
    </div>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-800">{error}</p>}
  </section>;
}
