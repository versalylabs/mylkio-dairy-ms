'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Subscription } from '@/types';
import { VetDirectoryAdmin } from './VetDirectoryAdmin';
import { BillingBoard } from './BillingBoard';
import { AccountBillingDialog } from './AccountBillingDialog';
import { billingState, STATE_LABEL, shortDate } from '@/lib/billing';

type Account = {
  id: string; email: string; name: string; phone: string; role: string; farm_id: string | null; farm_name: string | null;
  county: string | null; subscription: Subscription | null; created_at: string; last_seen_at: string | null;
  herd_size: number; last_paid_on: string | null; note_count: number;
};
type Lead = { id: string; name: string; phone: string; county: string | null; cows_count: number | null; preferred_contact: string; message: string | null; source: string; status: 'new' | 'contacted' | 'converted' | 'archived'; created_at: string };
type Usage = {
  asAt: string; accounts: number; activeNow: number; active24h: number; active7d: number; active30d: number;
  activeUsers: { id: string; seenAt: string }[]; byStatus: Record<string, number>; byPlan: Record<string, number>;
  monthlyValueKsh: number; signups: { day: string; count: number }[];
};
interface Props { onLogout: () => void; onImpersonateFarm?: (farmId: string) => void }

const PLAN_NAMES: Record<string, string> = { starter: 'Starter', farmer: 'Farmer', farm_pro: 'Farm Pro' };
const STATUS_NAMES: Record<string, string> = { trial: 'Trial', active: 'Paying', past_due: 'Past due', cancelled: 'Cancelled' };
const nairobi = (iso: string, options: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', ...options });
const dateTime = (iso: string) => nairobi(iso, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** "5 min ago", "3 h ago", "2 days ago" measured from the chosen moment. */
function ago(iso: string | null, from: number) {
  if (!iso) return 'Never';
  const minutes = Math.max(0, Math.round((from - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
  return `${Math.round(minutes / 1440)} days ago`;
}

/** `value` for a datetime-local input, in the device's own time. */
function localInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function Stat({ label, value, note, tone = 'plain' }: { label: string; value: string | number; note?: string; tone?: 'plain' | 'good' }) {
  return <div className={`rounded-2xl border p-4 ${tone === 'good' ? 'border-sage-300 bg-sage/10' : 'border-ivory-border bg-white shadow-soft'}`}>
    <p className="text-sm text-charcoal-light">{label}</p>
    <p className="mt-1 whitespace-nowrap font-display text-[1.65rem] font-medium tabular-nums sm:text-4xl">{value}</p>
    {note && <p className="mt-1 text-xs text-charcoal-muted">{note}</p>}
  </div>;
}

function Breakdown({ title, rows }: { title: string; rows: [string, number][] }) {
  const total = rows.reduce((sum, [, n]) => sum + n, 0) || 1;
  return <div className="card p-4">
    <h3 className="text-sm font-bold">{title}</h3>
    {rows.length === 0 ? <p className="mt-2 text-sm text-charcoal-muted">No accounts yet.</p> : <ul className="mt-3 space-y-2">
      {rows.map(([label, n]) => <li key={label} className="text-sm">
        <div className="flex justify-between"><span>{label}</span><span className="font-semibold tabular-nums">{n}</span></div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-ivory-muted"><div className="h-full rounded-full bg-sage" style={{ width: `${Math.max(4, (n / total) * 100)}%` }} /></div>
      </li>)}
    </ul>}
  </div>;
}

const csvCell = (value: unknown) => {
  const text = String(value ?? '');
  // A leading = + - @ would be run as a formula by a spreadsheet, so it is defused.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** Downloads the listed accounts for a spreadsheet. Contact and plan details only: no farm records. */
function downloadAccounts(rows: Account[]) {
  const header = ['Farm', 'Owner', 'Phone', 'Email', 'County', 'Plan', 'Status', 'Billing', 'Paid until or trial ends', 'Cows', 'Last paid', 'Joined', 'Last active'];
  const lines = rows.map(a => [
    a.farm_name, a.name, a.phone, a.email, a.county, a.subscription ? PLAN_NAMES[a.subscription.plan] ?? a.subscription.plan : '', a.subscription ? STATUS_NAMES[a.subscription.status] : '',
    a.subscription ? STATE_LABEL[billingState(a.subscription)] : '', a.subscription?.renewsAt ? shortDate(a.subscription.renewsAt) : '', a.herd_size, a.last_paid_on ?? '', shortDate(a.created_at), a.last_seen_at ? shortDate(a.last_seen_at) : '',
  ].map(csvCell).join(','));
  const blob = new Blob(['\ufeff' + [header.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `mylkio-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

export function PlatformAdminView({ onLogout }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [asAt, setAsAt] = useState(''); // empty = live
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeOnly, setActiveOnly] = useState(false);
  const [billingFor, setBillingFor] = useState<Account | null>(null);
  const [billingTick, setBillingTick] = useState(0);

  const live = asAt === '';
  const asAtIso = useMemo(() => {
    if (live) return undefined;
    const date = new Date(asAt);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }, [asAt, live]);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const query = asAtIso ? `?at=${encodeURIComponent(asAtIso)}` : '';
      const [accountResponse, usageResponse, leadResponse] = await Promise.all([
        fetch('/api/admin/accounts', { cache: 'no-store' }),
        fetch(`/api/admin/usage${query}`, { cache: 'no-store' }),
        fetch('/api/admin/leads', { cache: 'no-store' }),
      ]);
      const accountResult = await accountResponse.json();
      if (!accountResponse.ok) throw new Error(accountResult.error || 'Could not load accounts.');
      setAccounts(accountResult.accounts);
      const usageResult = await usageResponse.json();
      if (!usageResponse.ok) throw new Error(usageResult.error || 'Could not load usage figures.');
      setUsage(usageResult.usage);
      if (leadResponse.ok) setLeads((await leadResponse.json()).leads);
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load the administration data.'); }
    finally { setBusy(false); }
  }, [asAtIso]);

  useEffect(() => { void load(); }, [load]);
  // While looking at "now", keep the figures fresh.
  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => { void load(); }, 60_000);
    return () => window.clearInterval(timer);
  }, [live, load]);

  const setLeadStatus = async (lead: Lead, status: Lead['status']) => {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId: lead.id, status }) });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not update the enquiry.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update the enquiry.'); setBusy(false); }
  };
  const update = async (account: Account, plan: Subscription['plan'], status: Subscription['status']) => {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/accounts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ farmId: account.farm_id, plan, status }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update subscription.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update subscription.'); setBusy(false); }
  };

  const reference = usage ? new Date(usage.asAt).getTime() : Date.now();
  const activeIds = useMemo(() => new Map((usage?.activeUsers ?? []).map(u => [u.id, u.seenAt])), [usage]);
  const farmers = useMemo(() => accounts.filter(a => a.role === 'farmer' && new Date(a.created_at).getTime() <= reference), [accounts, reference]);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return farmers.filter(a =>
      (statusFilter === 'all' || a.subscription?.status === statusFilter)
      && (!activeOnly || activeIds.has(a.id))
      && (!term || [a.name, a.email, a.farm_name, a.county, a.phone].some(v => v?.toLowerCase().includes(term))));
  }, [farmers, search, statusFilter, activeOnly, activeIds]);
  const statusRows = (['trial', 'active', 'past_due', 'cancelled'] as const).map(s => [STATUS_NAMES[s], usage?.byStatus[s] ?? 0] as [string, number]).filter(([, n]) => n > 0);
  const planRows = (['starter', 'farmer', 'farm_pro'] as const).map(p => [PLAN_NAMES[p], usage?.byPlan[p] ?? 0] as [string, number]).filter(([, n]) => n > 0);
  const maxSignups = Math.max(1, ...(usage?.signups ?? []).map(s => Number(s.count)));

  return <main className="mx-auto max-w-6xl space-y-8 p-4 text-charcoal sm:p-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="font-display text-display-md">Mylkio Administration</h1><p className="mt-2 max-w-2xl text-sm text-charcoal-light">Who is using Mylkio, and on which plan. This shows account activity only: farmers&apos; milk, herd and sales records stay private.</p></div>
      <button onClick={onLogout} className="btn btn-secondary">Sign out</button>
    </header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}

    <section aria-labelledby="usage-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h2 id="usage-heading" className="font-display text-2xl font-medium">Usage {live ? 'right now' : 'as at a chosen time'}</h2>
          <p className="mt-1 text-sm text-charcoal-light">{usage ? `${live ? 'Live, as at' : 'As at'} ${dateTime(usage.asAt)} (Nairobi time)` : 'Loading…'}{live ? ' · refreshes every minute' : ''}</p></div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">As at
            <input type="datetime-local" max={localInputValue(new Date())} value={asAt} onChange={e => setAsAt(e.target.value)} className="field ml-2 !inline-block !w-auto" />
          </label>
          <button disabled={live} onClick={() => setAsAt('')} className="btn btn-secondary">Now</button>
          <button disabled={busy} onClick={() => void load()} className="btn btn-primary">{busy ? 'Loading…' : 'Refresh'}</button>
        </div>
      </div>
      {usage && <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat tone="good" label="Using Mylkio now" value={usage.activeNow} note="Made a request in the 15 minutes up to this time" />
          <Stat label="Active, last 24 hours" value={usage.active24h} />
          <Stat label="Active, last 7 days" value={usage.active7d} />
          <Stat label="Active, last 30 days" value={usage.active30d} />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Farm accounts" value={usage.accounts} note="Created by this time" />
          <Stat label="Paying" value={usage.byStatus.active ?? 0} />
          <Stat label="On free trial" value={usage.byStatus.trial ?? 0} />
          <Stat label="Monthly value" value={`KSh ${usage.monthlyValueKsh.toLocaleString('en-KE')}`} note="Paying accounts, by plan price" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Breakdown title="By subscription status" rows={statusRows} />
          <Breakdown title="By plan" rows={planRows} />
          <div className="card p-4">
            <h3 className="text-sm font-bold">New accounts per day (14 days)</h3>
            <div className="mt-3 flex h-24 items-end gap-1" role="img" aria-label={`New accounts per day: ${usage.signups.map(s => `${s.day} ${s.count}`).join(', ')}`}>
              {usage.signups.map(s => <div key={s.day} title={`${s.day}: ${s.count}`} className="flex-1 rounded-t bg-sage" style={{ height: `${Math.max(Number(s.count) === 0 ? 3 : 10, (Number(s.count) / maxSignups) * 100)}%`, opacity: Number(s.count) === 0 ? 0.25 : 1 }} />)}
            </div>
            <p className="mt-2 text-xs text-charcoal-muted">{usage.signups.reduce((sum, s) => sum + Number(s.count), 0)} new in this period</p>
          </div>
        </div>
        <p className="text-xs text-charcoal-muted">Plan and status are today&apos;s: subscription changes are not kept as history, so they are not rewound to the chosen time. Activity history is kept for about six months and starts from when this screen was introduced.</p>
      </>}
    </section>

    <BillingBoard accounts={farmers} refreshKey={billingTick} onOpen={(a) => setBillingFor(farmers.find(f => f.id === a.id) ?? null)} />
    {billingFor && <AccountBillingDialog account={billingFor} onClose={() => setBillingFor(null)} onChanged={() => { setBillingTick(t => t + 1); void load().then(() => undefined); }} />}

    <section aria-labelledby="accounts-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="accounts-heading" className="font-display text-2xl font-medium">Farm accounts ({visible.length}{visible.length !== farmers.length ? ` of ${farmers.length}` : ''})</h2>
        <button className="btn btn-secondary" disabled={visible.length === 0} onClick={() => downloadAccounts(visible)}>Download list (CSV)</button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 text-sm">Search<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, farm, county, phone or email" className="field mt-1" /></label>
        <label className="text-sm">Status<select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="field ml-2 !inline-block !w-auto"><option value="all">All</option>{Object.entries(STATUS_NAMES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={activeOnly} onChange={e => setActiveOnly(e.target.checked)} className="h-5 w-5" />Using at this time</label>
      </div>
      <div className="space-y-3">{visible.map(account => {
        const seenAtMoment = activeIds.get(account.id);
        return <article key={account.id} className="flex flex-wrap items-center justify-between gap-4 card p-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{account.farm_name || account.name}</h3>
              {seenAtMoment && <span className="rounded-full bg-sage/10 px-2 py-0.5 text-xs font-semibold text-sage">Using it at this time</span>}</div>
            <p className="text-sm">{account.name}{account.county ? ` · ${account.county}` : ''}</p>
            <p className="text-sm text-charcoal-light">{account.phone && <><a className="underline" href={`tel:${account.phone.replace(/\s/g, '')}`}>{account.phone}</a> · </>}{account.email}</p>
            <p className="mt-1 text-xs text-charcoal-muted">{account.subscription && <><strong className="font-semibold text-charcoal-light">{STATE_LABEL[billingState(account.subscription)]}</strong>{account.subscription.renewsAt && billingState(account.subscription) !== 'complimentary' ? `, ${new Date(account.subscription.renewsAt).getTime() < Date.now() ? 'ended' : 'until'} ${shortDate(account.subscription.renewsAt)}` : ''} · </>}{account.herd_size} {account.herd_size === 1 ? 'cow' : 'cows'} · </p>
            <p className="text-xs text-charcoal-muted">Joined {nairobi(account.created_at, { day: 'numeric', month: 'short', year: 'numeric' })} · Last active {account.last_seen_at ? `${ago(account.last_seen_at, Date.now())} (${dateTime(account.last_seen_at)})` : 'never'}</p>
          </div>
          {account.subscription && account.farm_id && <button className="btn btn-secondary" onClick={() => setBillingFor(account)}>Payments{account.note_count > 0 ? ` and notes (${account.note_count})` : ''}</button>}
          {account.subscription && <div className="flex flex-wrap gap-3"><label className="text-sm">Plan<select aria-label={`Plan for ${account.name}`} disabled={busy} className="field ml-2 !inline-block !w-auto" value={account.subscription.plan} onChange={e => void update(account, e.target.value as Subscription['plan'], account.subscription!.status)}>{['starter', 'farmer', 'farm_pro'].map(plan => <option key={plan} value={plan}>{PLAN_NAMES[plan]}</option>)}</select></label>
            <label className="text-sm">Status<select aria-label={`Status for ${account.name}`} disabled={busy} className="field ml-2 !inline-block !w-auto" value={account.subscription.status} onChange={e => void update(account, account.subscription!.plan, e.target.value as Subscription['status'])}>{['trial', 'active', 'past_due', 'cancelled'].map(status => <option key={status} value={status}>{STATUS_NAMES[status]}</option>)}</select></label></div>}
        </article>;
      })}</div>
      {!busy && !error && visible.length === 0 && <p className="text-sm">{farmers.length === 0 ? 'No farm accounts had been created by this time.' : 'No accounts match these filters.'}</p>}
    </section>

    <VetDirectoryAdmin />

    <section aria-labelledby="leads-heading" className="space-y-3">
      <h2 id="leads-heading" className="font-display text-2xl font-medium">Website enquiries ({leads.filter(l => l.status === 'new').length} new)</h2>
      {leads.length === 0 && <p className="text-sm">No enquiries yet.</p>}
      {leads.map(lead => <article key={lead.id} className="flex flex-wrap items-start justify-between gap-4 card p-4">
        <div className="min-w-0"><h3 className="font-bold">{lead.name}</h3>
          <p className="text-sm"><a className="underline" href={`tel:${lead.phone.replace(/\s/g, '')}`}>{lead.phone}</a> · prefers {lead.preferred_contact}{lead.county ? ` · ${lead.county}` : ''}{lead.cows_count ? ` · ${lead.cows_count} cows` : ''}</p>
          {lead.message && <p className="mt-1 text-sm">{lead.message}</p>}
          <p className="mt-1 text-xs text-charcoal-muted">{lead.source} · {dateTime(lead.created_at)}</p></div>
        <label className="text-sm">Status<select aria-label={`Status for enquiry from ${lead.name}`} disabled={busy} className="field ml-2 !inline-block !w-auto" value={lead.status} onChange={e => void setLeadStatus(lead, e.target.value as Lead['status'])}>{['new', 'contacted', 'converted', 'archived'].map(status => <option key={status}>{status}</option>)}</select></label>
      </article>)}
    </section>
  </main>;
}
