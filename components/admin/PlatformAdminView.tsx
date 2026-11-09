'use client';
import { useEffect, useState } from 'react';
import type { Subscription } from '@/types';

type Account = { id: string; email: string; name: string; role: string; farm_id: string | null; subscription: Subscription | null };
type Lead = { id: string; name: string; phone: string; county: string | null; cows_count: number | null; preferred_contact: string; message: string | null; source: string; status: 'new' | 'contacted' | 'converted' | 'archived'; created_at: string };
interface Props { onLogout: () => void; onImpersonateFarm?: (farmId: string) => void }

export function PlatformAdminView({ onLogout }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/accounts', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load accounts.');
      setAccounts(result.accounts); setError('');
      const leadResponse = await fetch('/api/admin/leads', { cache: 'no-store' });
      if (leadResponse.ok) setLeads((await leadResponse.json()).leads);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load accounts.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);
  const setLeadStatus = async (lead: Lead, status: Lead['status']) => {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId: lead.id, status }) });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not update the enquiry.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update the enquiry.'); }
    finally { setBusy(false); }
  };
  const update = async (account: Account, plan: Subscription['plan'], status: Subscription['status']) => {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/accounts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ farmId: account.farm_id, plan, status }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update subscription.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update subscription.'); }
    finally { setBusy(false); }
  };
  return <main className="mx-auto max-w-6xl space-y-6 p-6 text-[#26332D]">
    <header className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">Mylkio Administration</h1><p className="mt-2 text-sm">Manage accounts and subscriptions. Farmer operational records remain private.</p></div><button onClick={onLogout} className="rounded-xl border p-3">Sign out</button></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    <button disabled={busy} onClick={() => void load()} className="rounded-xl bg-[#345C4A] px-4 py-3 text-white disabled:opacity-50">{busy ? 'Loading…' : 'Refresh accounts'}</button>
    <div className="space-y-3">{accounts.map(account => <article key={account.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-4">
      <div><h2 className="font-bold">{account.name}</h2><p className="text-sm">{account.email}</p><p className="text-xs">{account.role}</p></div>
      {account.subscription && <div className="flex flex-wrap gap-3"><label className="text-sm">Plan<select aria-label={`Plan for ${account.name}`} disabled={busy} className="ml-2 rounded-lg border p-2" value={account.subscription.plan} onChange={e => void update(account, e.target.value as Subscription['plan'], account.subscription!.status)}>{['starter','farmer','farm_pro'].map(plan => <option key={plan}>{plan}</option>)}</select></label>
      <label className="text-sm">Status<select aria-label={`Status for ${account.name}`} disabled={busy} className="ml-2 rounded-lg border p-2" value={account.subscription.status} onChange={e => void update(account, account.subscription!.plan, e.target.value as Subscription['status'])}>{['trial','active','past_due','cancelled'].map(status => <option key={status}>{status}</option>)}</select></label></div>}
    </article>)}</div>
    {!busy && !error && accounts.length === 0 && <p>No accounts found.</p>}
    <section aria-labelledby="leads-heading" className="space-y-3">
      <h2 id="leads-heading" className="text-xl font-bold">Website enquiries ({leads.filter(l => l.status === 'new').length} new)</h2>
      {leads.length === 0 && <p className="text-sm">No enquiries yet.</p>}
      {leads.map(lead => <article key={lead.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-white p-4">
        <div className="min-w-0"><h3 className="font-bold">{lead.name}</h3>
          <p className="text-sm"><a className="underline" href={`tel:${lead.phone.replace(/\s/g, '')}`}>{lead.phone}</a> · prefers {lead.preferred_contact}{lead.county ? ` · ${lead.county}` : ''}{lead.cows_count ? ` · ${lead.cows_count} cows` : ''}</p>
          {lead.message && <p className="mt-1 text-sm">{lead.message}</p>}
          <p className="mt-1 text-xs">{lead.source} · {new Date(lead.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</p></div>
        <label className="text-sm">Status<select aria-label={`Status for enquiry from ${lead.name}`} disabled={busy} className="ml-2 rounded-lg border p-2" value={lead.status} onChange={e => void setLeadStatus(lead, e.target.value as Lead['status'])}>{['new','contacted','converted','archived'].map(status => <option key={status}>{status}</option>)}</select></label>
      </article>)}
    </section>
  </main>;
}
