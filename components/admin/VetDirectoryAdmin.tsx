'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Phone } from 'lucide-react';
import { VET_KINDS, VET_KIND_IDS, telHref, type VetKindId } from '@/lib/vet/phone';

type Status = 'pending' | 'confirmed' | 'rejected' | 'hidden';
interface AdminVet {
  id: string; name: string; kind: VetKindId; county: string; areas: string | null; phone: string; whatsapp: boolean; emergency: boolean;
  hours: string | null; kvb_reg_no: string | null; notes: string | null; status: Status; confirmed_on: string | null;
  source: 'admin' | 'farmer'; submitted_by_name: string | null; created_at: string;
}

const STATUS_LABEL: Record<Status, string> = { pending: 'Waiting to be confirmed', confirmed: 'Confirmed', rejected: 'Rejected', hidden: 'Hidden' };
const STATUS_STYLE: Record<Status, string> = {
  pending: 'bg-amber-100 text-amber-900', confirmed: 'bg-sage/10 text-sage', rejected: 'bg-rose-100 text-rose-900', hidden: 'bg-ivory-muted text-charcoal',
};
const todayInNairobi = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());

const emptyForm = { id: '' as string, name: '', kind: 'veterinarian' as VetKindId, county: 'Nairobi', areas: '', phone: '', whatsapp: false, emergency: false, hours: '', kvbRegNo: '', notes: '', status: 'confirmed' as Status, confirmedOn: '' };

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((result as { error?: string }).error || 'That did not work.');
  return result as T;
}

/**
 * The vet directory for administrators. A farmer's suggestion waits here. Ring the number, then confirm it
 * with the day you rang: only confirmed entries are ever shown to farmers.
 */
export function VetDirectoryAdmin() {
  const [vets, setVets] = useState<AdminVet[]>([]);
  const [filter, setFilter] = useState<'all' | Status>('pending');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<{ id: string; day: string } | null>(null);
  const [form, setForm] = useState<typeof emptyForm | null>(null);

  const load = useCallback(async () => {
    try { setVets((await call<{ vets: AdminVet[] }>('/api/admin/vets')).vets); setError(''); }
    catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const act = async (work: () => Promise<unknown>) => {
    setBusy(true);
    try { await work(); await load(); setError(''); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const setStatus = (id: string, status: Status, confirmedOn?: string) =>
    act(() => call('/api/admin/vets', { method: 'PATCH', body: JSON.stringify({ id, status, confirmedOn: confirmedOn ?? null }) }));

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    const { id, confirmedOn, ...rest } = form;
    void act(async () => {
      await call('/api/admin/vets', { method: 'POST', body: JSON.stringify({ ...rest, id: id || null, confirmedOn: rest.status === 'confirmed' ? confirmedOn || todayInNairobi() : null }) });
      setForm(null);
    });
  };

  const counts = vets.reduce<Record<string, number>>((n, v) => ({ ...n, [v.status]: (n[v.status] ?? 0) + 1 }), {});
  const shown = vets.filter((v) => filter === 'all' || v.status === filter);

  return (
    <section aria-labelledby="vets-heading" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="vets-heading" className="font-display text-2xl font-medium">Vet directory ({counts.pending ?? 0} waiting)</h2>
          <p className="mt-1 max-w-2xl text-sm text-charcoal-light">Ring the number before confirming it, and record the day you rang. Only confirmed entries are shown to farmers.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">Show
            <select value={filter} onChange={(e) => setFilter(e.target.value as 'all' | Status)} className="field ml-2 !inline-block !w-auto">
              <option value="all">All ({vets.length})</option>
              {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]} ({counts[s] ?? 0})</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setForm({ ...emptyForm, confirmedOn: todayInNairobi() })} className="btn btn-primary">Add a vet</button>
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {form && (
        <form onSubmit={save} className="card space-y-4 p-4 sm:p-5">
          <h3 className="text-lg font-semibold">{form.id ? 'Edit entry' : 'Add a vet'}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="av-name" className="field-label">Name</label><input id="av-name" className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} /></div>
            <div><label htmlFor="av-kind" className="field-label">Kind</label>
              <select id="av-kind" className="field" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as VetKindId })}>{VET_KIND_IDS.map((k) => <option key={k} value={k}>{VET_KINDS[k]}</option>)}</select></div>
            <div><label htmlFor="av-county" className="field-label">County</label><input id="av-county" className="field" value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} required /></div>
            <div><label htmlFor="av-phone" className="field-label">Phone</label><input id="av-phone" type="tel" className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
            <div><label htmlFor="av-areas" className="field-label">Areas covered</label><input id="av-areas" className="field" value={form.areas} onChange={(e) => setForm({ ...form, areas: e.target.value })} /></div>
            <div><label htmlFor="av-hours" className="field-label">Hours</label><input id="av-hours" className="field" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} /></div>
            <div><label htmlFor="av-kvb" className="field-label">KVB registration number</label><input id="av-kvb" className="field" value={form.kvbRegNo} onChange={(e) => setForm({ ...form, kvbRegNo: e.target.value })} /></div>
            <div><label htmlFor="av-notes" className="field-label">Note</label><input id="av-notes" className="field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div><label htmlFor="av-status" className="field-label">Status</label>
              <select id="av-status" className="field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>{(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></div>
            {form.status === 'confirmed' && (
              <div><label htmlFor="av-day" className="field-label">Day you rang the number</label><input id="av-day" type="date" max={todayInNairobi()} className="field" value={form.confirmedOn} onChange={(e) => setForm({ ...form, confirmedOn: e.target.value })} required /></div>
            )}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-[#345C4A]" checked={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.checked })} />Uses WhatsApp</label>
            <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-[#345C4A]" checked={form.emergency} onChange={(e) => setForm({ ...form, emergency: e.target.checked })} />Comes out in emergencies</label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="btn btn-primary">{form.id ? 'Save changes' : 'Add to directory'}</button>
            <button type="button" onClick={() => setForm(null)} className="btn btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {shown.length === 0 && !error && <p className="text-sm text-charcoal-muted">{filter === 'pending' ? 'Nothing is waiting to be confirmed.' : 'No entries.'}</p>}

      {shown.map((vet) => (
        <article key={vet.id} className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{vet.name}</h3>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[vet.status]}`}>{STATUS_LABEL[vet.status]}</span>
                {vet.emergency && <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-bold text-white">Emergency</span>}
              </div>
              <p className="text-sm text-charcoal-light">{VET_KINDS[vet.kind]} · {vet.county}{vet.areas ? ` (${vet.areas})` : ''}{vet.hours ? ` · ${vet.hours}` : ''}</p>
              <p className="text-sm"><a href={telHref(vet.phone)} className="inline-flex items-center gap-1 font-semibold text-sage underline"><Phone className="h-3.5 w-3.5" />{vet.phone}</a>{vet.whatsapp ? ' · WhatsApp' : ''}{vet.kvb_reg_no ? ` · KVB ${vet.kvb_reg_no}` : ''}</p>
              {vet.notes && <p className="mt-1 text-sm text-charcoal-light">{vet.notes}</p>}
              <p className="mt-1 text-xs text-charcoal-muted">
                {vet.source === 'admin' ? 'Added by an administrator' : `Suggested by ${vet.submitted_by_name ?? 'a farmer'}`}
                {vet.confirmed_on && <span className="ml-2 inline-flex items-center gap-1 text-sage"><BadgeCheck className="h-3.5 w-3.5" />Confirmed by phone on {vet.confirmed_on}</span>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {vet.status !== 'confirmed' && <button type="button" disabled={busy} onClick={() => setConfirming({ id: vet.id, day: todayInNairobi() })} className="btn btn-primary">Confirm</button>}
              {vet.status !== 'rejected' && vet.status !== 'confirmed' && <button type="button" disabled={busy} onClick={() => void setStatus(vet.id, 'rejected')} className="btn btn-secondary">Reject</button>}
              {vet.status === 'confirmed' && <button type="button" disabled={busy} onClick={() => void setStatus(vet.id, 'hidden')} className="btn btn-secondary">Hide</button>}
              <button type="button" disabled={busy} onClick={() => setForm({ id: vet.id, name: vet.name, kind: vet.kind, county: vet.county, areas: vet.areas ?? '', phone: vet.phone, whatsapp: vet.whatsapp, emergency: vet.emergency, hours: vet.hours ?? '', kvbRegNo: vet.kvb_reg_no ?? '', notes: vet.notes ?? '', status: vet.status, confirmedOn: vet.confirmed_on ?? todayInNairobi() })} className="btn btn-secondary">Edit</button>
            </div>
          </div>
          {confirming?.id === vet.id && (
            <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-ivory-border bg-ivory p-3">
              <div><label htmlFor={`day-${vet.id}`} className="field-label">Day you rang {vet.phone}</label>
                <input id={`day-${vet.id}`} type="date" max={todayInNairobi()} className="field" value={confirming.day} onChange={(e) => setConfirming({ id: vet.id, day: e.target.value })} /></div>
              <button type="button" disabled={busy || !confirming.day} onClick={() => { void setStatus(vet.id, 'confirmed', confirming.day); setConfirming(null); }} className="btn btn-primary">Confirm it reaches {vet.name}</button>
              <button type="button" onClick={() => setConfirming(null)} className="btn btn-secondary">Cancel</button>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
