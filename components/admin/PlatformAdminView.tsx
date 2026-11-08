'use client';
import { useEffect, useState } from 'react';
import type { Subscription } from '@/types';

type Account = { id: string; email: string; name: string; role: string; farm_id: string | null; subscription: Subscription | null };
interface Props { onLogout: () => void; onImpersonateFarm?: (farmId: string) => void }

export function PlatformAdminView({ onLogout }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/accounts', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load accounts.');
      setAccounts(result.accounts); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load accounts.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);
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
  </main>;
}
