'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Megaphone, ShieldAlert } from 'lucide-react';
import type { AdminFlag, AdminOfficialAlert, FlagReason } from '@/lib/community';

async function call<T>(url: string, init?: { method?: 'POST' | 'DELETE'; body?: unknown }): Promise<T> {
  const response = await fetch(url, {
    method: init?.method ?? 'GET', cache: 'no-store',
    headers: init?.method ? { 'Content-Type': 'application/json' } : undefined,
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((result as { error?: string }).error || 'That did not work.');
  return result as T;
}

const REASON: Record<FlagReason, string> = { rumour: 'Rumour of disease', abuse: 'Abusive', private: 'Private details', spam: 'Spam', other: 'Other' };
const when = (iso: string) => new Date(iso).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const todayInNairobi = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());

/**
 * Posts and replies members reported to Mylkio. This queue is the only place staff read anything members wrote, and only
 * what was reported. Remove deletes it for everyone; Keep closes the reports.
 */
export function FlagQueueAdmin() {
  const [flags, setFlags] = useState<AdminFlag[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setFlags((await call<{ flags: AdminFlag[] }>('/api/admin/community/flags')).flags); setError(''); }
    catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const resolve = async (f: AdminFlag, action: 'remove' | 'keep') => {
    if (action === 'remove' && !window.confirm('Remove this for everyone in the group? This cannot be undone.')) return;
    setBusy(true);
    try { await call('/api/admin/community/flags', { method: 'POST', body: { ...(f.postId ? { postId: f.postId } : { replyId: f.replyId }), action } }); await load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <section aria-labelledby="flags-heading" className="space-y-3">
      <h2 id="flags-heading" className="flex items-center gap-2 font-display text-2xl font-medium"><ShieldAlert className="h-6 w-6 text-gold-600" />Reported posts ({flags.length})</h2>
      <p className="max-w-2xl text-sm text-charcoal-light">What members reported to Mylkio. This is the only place you read what members write. Remove it if it breaks the group rules (a rumour that a farm or person has a disease, abuse, someone&apos;s private details, spam); otherwise keep it. The writer is not told who reported it.</p>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {flags.length === 0 && !error && <p className="text-sm text-charcoal-muted">Nothing is waiting.</p>}
      {flags.map((f) => (
        <article key={f.postId ?? f.replyId} className="card p-4">
          <p className="text-xs text-charcoal-muted">{f.groupName} · {f.county} · {f.replyId ? 'reply' : 'post'} by {f.authorName || 'a member'}{f.farmName ? ` (${f.farmName})` : ''} · written {when(f.writtenAt)}</p>
          <p className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-ivory p-3 text-base text-charcoal">{f.body}</p>
          <p className="mt-2 text-sm text-charcoal-light"><strong>{f.reports === 1 ? '1 report' : `${f.reports} reports`}</strong>: {f.reasons.map((r) => REASON[r]).join(', ')} · first {when(f.firstReportedAt)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void resolve(f, 'remove')}>Remove</button>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void resolve(f, 'keep')}>Keep</button>
          </div>
        </article>
      ))}
    </section>
  );
}

const emptyAlert = () => ({ county: '', title: '', body: '', sourceName: '', sourceUrl: '', sourceDate: todayInNairobi(), days: 30 });

/** Official alerts: written from what the county or national veterinary office published, always with its source and date. */
export function OfficialAlertsAdmin() {
  const [alerts, setAlerts] = useState<AdminOfficialAlert[]>([]);
  const [form, setForm] = useState<ReturnType<typeof emptyAlert> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setAlerts((await call<{ alerts: AdminOfficialAlert[] }>('/api/admin/community/official')).alerts); setError(''); }
    catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    try { await call('/api/admin/community/official', { method: 'POST', body: form }); setForm(null); await load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const withdraw = async (a: AdminOfficialAlert) => {
    if (!window.confirm(`Withdraw "${a.title}"? It stops showing in every group at once.`)) return;
    setBusy(true);
    try { await call('/api/admin/community/official', { method: 'DELETE', body: { id: a.id } }); await load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <section aria-labelledby="official-admin-heading" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="official-admin-heading" className="flex items-center gap-2 font-display text-2xl font-medium"><Megaphone className="h-6 w-6 text-sage" />Official alerts</h2>
          <p className="mt-1 max-w-2xl text-sm text-charcoal-light">Pinned at the top of every group in a county, and shown on members&apos; Home. Write only what an official source published, and give that source and its date.</p>
        </div>
        {!form && <button type="button" className="btn btn-primary" onClick={() => setForm(emptyAlert())}>Post an official alert</button>}
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {form && (
        <form onSubmit={save} className="card space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="oa-county" className="field-label">County (every group in it gets the alert)</label><input id="oa-county" className="field" required minLength={2} maxLength={80} value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} placeholder="Nakuru" /></div>
            <div><label htmlFor="oa-title" className="field-label">Title</label><input id="oa-title" className="field" required minLength={3} maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          </div>
          <div><label htmlFor="oa-body" className="field-label">What the source says, and what farmers should do</label><textarea id="oa-body" className="field min-h-28" required maxLength={1000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2"><label htmlFor="oa-source" className="field-label">Source</label><input id="oa-source" className="field" required minLength={2} maxLength={160} value={form.sourceName} onChange={(e) => setForm({ ...form, sourceName: e.target.value })} placeholder="Nakuru County Veterinary Services" /></div>
            <div><label htmlFor="oa-date" className="field-label">Date published</label><input id="oa-date" type="date" className="field" required max={todayInNairobi()} value={form.sourceDate} onChange={(e) => setForm({ ...form, sourceDate: e.target.value })} /></div>
            <div><label htmlFor="oa-days" className="field-label">Show for (days)</label><input id="oa-days" type="number" min={1} max={90} className="field" value={form.days} onChange={(e) => setForm({ ...form, days: Math.max(1, Math.min(90, Number(e.target.value) || 1)) })} /></div>
          </div>
          <div><label htmlFor="oa-url" className="field-label">Link to the notice (optional, https)</label><input id="oa-url" type="url" className="field" maxLength={500} value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https://" /></div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary" disabled={busy}>Post to every group in {form.county || 'the county'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      {alerts.length === 0 && !error && <p className="text-sm text-charcoal-muted">No official alerts yet.</p>}
      {alerts.map((a) => (
        <article key={a.id} className={`card p-4 ${a.active ? '' : 'opacity-60'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-charcoal-muted">{a.county} · {a.active ? `showing in ${a.groups} ${a.groups === 1 ? 'group' : 'groups'} until ${when(a.expiresAt)}` : a.withdrawn ? 'withdrawn' : 'ended'}</p>
              <h3 className="mt-1 font-semibold">{a.title}</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-charcoal-light">{a.body}</p>
              <p className="mt-1 text-xs text-charcoal-muted">Source: {a.sourceName}, {a.sourceDate}{a.sourceUrl && <> · <a href={a.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline"><ExternalLink className="h-3 w-3" />notice</a></>}</p>
            </div>
            {a.active && <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void withdraw(a)}>Withdraw</button>}
          </div>
        </article>
      ))}
    </section>
  );
}
