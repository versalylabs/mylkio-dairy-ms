'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { PLANS, type PlanId } from '@/lib/plans';
import { formatKsh } from '@/lib/money';
import { TEAM_LOGINS } from '@/lib/team';
import { SOURCE_LABEL, describeChange, type ChangeSource } from '@/lib/subscription-history';
import { billingState, describeBilling, STATE_LABEL, shortDate } from '@/lib/billing';
import type { Subscription } from '@/types';

export interface BillingAccount {
  farm_id: string | null; name: string; farm_name: string | null; phone: string; subscription: Subscription | null;
}
type Method = 'mpesa' | 'cash' | 'bank' | 'other';
interface Payment {
  id: string; amount_ksh: number; method: Method; reference: string; paid_on: string; months: number; plan: string;
  period_from: string; period_to: string; recorded_by_name: string | null; voided_at: string | null; void_reason: string | null;
}
interface Note { id: string; body: string; author_name: string | null; created_at: string }
interface Change { id: number | string; changed_at: string; changed_by_name: string | null; source: ChangeSource; before: Record<string, unknown>; after: Record<string, unknown> }

const METHOD_LABEL: Record<Method, string> = { mpesa: 'M-Pesa', cash: 'Cash', bank: 'Bank transfer', other: 'Other' };
const todayInNairobi = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());
const MONTH_CHOICES = [1, 2, 3, 6, 12];

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((result as { error?: string }).error || 'That did not work.');
  return result as T;
}

/**
 * Payments and notes for one farm. Mylkio takes no automatic payments: record each one you receive and the
 * paid-until date moves forward. A mistake is voided with a reason, never deleted.
 */
export function AccountBillingDialog({ account, onClose, onChanged, startCustom = false }: { account: BillingAccount; onClose: () => void; onChanged: () => void; startCustom?: boolean }) {
  const farmId = account.farm_id!;
  const plan = (account.subscription?.plan ?? 'farmer') as PlanId;
  const price = account.subscription?.monthlyPriceKsh || PLANS[plan]?.priceKsh || 0;
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState(String(price));
  const [amountEdited, setAmountEdited] = useState(false);
  const [method, setMethod] = useState<Method>('mpesa');
  const [reference, setReference] = useState('');
  const [paidOn, setPaidOn] = useState(todayInNairobi());
  const [voiding, setVoiding] = useState<{ id: string; reason: string } | null>(null);
  const [note, setNote] = useState('');
  // Custom plan terms (the price agreed with this farm, what was agreed, and how many logins it has).
  const isCustom = plan === 'custom';
  const [terms, setTerms] = useState({
    price: account.subscription?.plan === 'custom' ? String(account.subscription.monthlyPriceKsh || '') : '',
    note: account.subscription?.customNote ?? '',
    team: account.subscription?.teamLimit ? String(account.subscription.teamLimit) : '',
  });
  const termsValid = Number(terms.price) >= 1 && Number(terms.price) <= 1_000_000 && (terms.team === '' || (Number(terms.team) >= 1 && Number(terms.team) <= 100));

  const load = useCallback(async () => {
    try {
      const [p, n, h] = await Promise.all([
        call<{ payments: Payment[] }>(`/api/admin/payments?farmId=${farmId}`),
        call<{ notes: Note[] }>(`/api/admin/notes?farmId=${farmId}`),
        call<{ changes: Change[] }>(`/api/admin/subscription-history?farmId=${farmId}`),
      ]);
      setPayments(p.payments); setNotes(n.notes); setChanges(h.changes); setError('');
    } catch (e) { setError((e as Error).message); }
  }, [farmId]);
  useEffect(() => { void load(); }, [load]);

  // The usual amount is the monthly price times the months, until someone types a different amount (a discount).
  useEffect(() => { if (!amountEdited) setAmount(String(price * months)); }, [months, price, amountEdited]);

  const needsReference = method === 'mpesa' || method === 'bank';
  const state = account.subscription ? billingState(account.subscription) : 'complimentary';
  const live = useMemo(() => payments.filter((p) => !p.voided_at), [payments]);

  const act = async (work: () => Promise<unknown>) => {
    setBusy(true); setDone('');
    try { await work(); await load(); onChanged(); setError(''); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const record = (event: React.FormEvent) => {
    event.preventDefault();
    void act(async () => {
      const result = await call<{ payment: { periodFrom: string; periodTo: string } }>('/api/admin/payments', {
        method: 'POST',
        body: JSON.stringify({ farmId, amountKsh: Number(amount), method, reference: reference.trim(), paidOn, months }),
      });
      setDone(`Recorded. Paid until ${shortDate(result.payment.periodTo)}.`);
      setReference(''); setAmountEdited(false);
    });
  };

  const saveCustom = (event: React.FormEvent) => {
    event.preventDefault();
    void act(async () => {
      await call('/api/admin/accounts', {
        method: 'PATCH',
        body: JSON.stringify({
          farmId, plan: 'custom', status: account.subscription?.status ?? 'trial',
          monthlyPriceKsh: Number(terms.price), note: terms.note.trim(), ...(terms.team ? { teamLimit: Number(terms.team) } : {}),
        }),
      });
      onClose();
    });
  };

  return (
    <Dialog open onClose={onClose} wide title={account.farm_name || account.name} subtitle={`${account.name} · ${PLANS[plan]?.name ?? plan} plan`} icon={<CreditCard className="h-5 w-5" />}>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="rounded-2xl border border-ivory-border bg-ivory-muted/50 p-4">
        <p className="text-sm font-semibold">{STATE_LABEL[state]}</p>
        <p className="text-sm text-charcoal-light">{account.subscription ? describeBilling(account.subscription) : 'No subscription'}</p>
        <p className="mt-1 text-xs text-charcoal-muted">Monthly price {formatKsh(price)}. Records and exports stay available whatever the state.</p>
      </div>

      {(isCustom || startCustom) && <form onSubmit={saveCustom} className="space-y-3 rounded-2xl border border-gold/40 bg-gold/10 p-4">
        <h3 className="text-base font-bold">Custom plan: what was agreed</h3>
        <p className="text-xs text-charcoal-muted">A Custom farm has every Farm Pro feature. Record the price and what was agreed with this farm; payments, paid-until and follow-ups work as for any plan, using this price.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label className="field-label" htmlFor="cust-price">Monthly price agreed (KSh) *</label>
            <input id="cust-price" className="field" inputMode="numeric" required value={terms.price} onChange={(e) => setTerms({ ...terms, price: e.target.value.replace(/[^0-9]/g, '') })} /></div>
          <div><label className="field-label" htmlFor="cust-team">Logins for this farm (owner included)</label>
            <input id="cust-team" className="field" inputMode="numeric" placeholder={`Blank = ${TEAM_LOGINS.custom} (the Farm Pro limit)`} value={terms.team} onChange={(e) => setTerms({ ...terms, team: e.target.value.replace(/[^0-9]/g, '') })} /></div>
        </div>
        <div><label className="field-label" htmlFor="cust-note">What was agreed (optional)</label>
          <textarea id="cust-note" className="field" rows={3} maxLength={500} value={terms.note} onChange={(e) => setTerms({ ...terms, note: e.target.value })} placeholder="e.g. 120 cows, 8 logins, quarterly invoice" /></div>
        <button className="btn btn-primary" disabled={busy || !termsValid}>{busy ? 'Saving…' : isCustom ? 'Save Custom plan terms' : 'Move this farm to Custom'}</button>
      </form>}

      <form onSubmit={record} className="space-y-3 rounded-2xl border border-ivory-border p-4">
        <h3 className="text-base font-bold">Record a payment received</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label className="field-label" htmlFor="pay-months">Months paid for</label>
            <select id="pay-months" className="field" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
              {MONTH_CHOICES.map((m) => <option key={m} value={m}>{m} {m === 1 ? 'month' : 'months'}</option>)}
            </select></div>
          <div><label className="field-label" htmlFor="pay-amount">Amount received (KSh)</label>
            <input id="pay-amount" className="field" inputMode="numeric" required value={amount} onChange={(e) => { setAmount(e.target.value.replace(/[^0-9]/g, '')); setAmountEdited(true); }} /></div>
          <div><label className="field-label" htmlFor="pay-method">How it was paid</label>
            <select id="pay-method" className="field" value={method} onChange={(e) => setMethod(e.target.value as Method)}>
              {(Object.keys(METHOD_LABEL) as Method[]).map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
            </select></div>
          <div><label className="field-label" htmlFor="pay-ref">{method === 'bank' ? 'Bank reference' : 'M-Pesa code'}{needsReference ? ' *' : ' (optional)'}</label>
            <input id="pay-ref" className="field uppercase" maxLength={60} required={needsReference} value={reference} onChange={(e) => setReference(e.target.value)} placeholder={method === 'mpesa' ? 'e.g. TKR729910Q' : ''} /></div>
          <div><label className="field-label" htmlFor="pay-date">Date received</label>
            <input id="pay-date" type="date" className="field" required max={todayInNairobi()} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></div>
        </div>
        {Number(amount) !== price * months && Number(amount) > 0 && <p className="text-xs text-charcoal-muted">The usual amount for {months} {months === 1 ? 'month' : 'months'} is {formatKsh(price * months)}.</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" disabled={busy || !Number(amount) || (needsReference && !reference.trim())}>{busy ? 'Saving…' : 'Record payment'}</button>
          {done && <span role="status" className="text-sm font-semibold text-sage">{done}</span>}
        </div>
      </form>

      <section aria-labelledby="pay-history" className="space-y-2">
        <h3 id="pay-history" className="text-base font-bold">Payments ({live.length})</h3>
        {payments.length === 0 && <p className="text-sm text-charcoal-muted">No payments recorded yet.</p>}
        <ul className="space-y-2">
          {payments.map((p) => <li key={p.id} className={`rounded-xl border border-ivory-border p-3 text-sm ${p.voided_at ? 'bg-ivory-muted/60 opacity-75' : 'bg-white'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`font-semibold ${p.voided_at ? 'line-through' : ''}`}>{formatKsh(p.amount_ksh)} · {METHOD_LABEL[p.method]}{p.reference ? ` · ${p.reference}` : ''}</span>
              {!p.voided_at && voiding?.id !== p.id && <button className="btn btn-ghost !min-h-9 !px-3" onClick={() => setVoiding({ id: p.id, reason: '' })}>Void</button>}
            </div>
            <p className="text-charcoal-light">Received {shortDate(p.paid_on)} · covers {shortDate(p.period_from)} to {shortDate(p.period_to)} ({p.months} {p.months === 1 ? 'month' : 'months'})</p>
            <p className="text-xs text-charcoal-muted">{p.recorded_by_name ? `Recorded by ${p.recorded_by_name}` : 'Recorded'}</p>
            {p.voided_at && <p className="mt-1 text-xs font-semibold text-rose-800">Voided: {p.void_reason}</p>}
            {voiding?.id === p.id && <form className="mt-2 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void act(async () => { await call('/api/admin/payments', { method: 'PATCH', body: JSON.stringify({ paymentId: p.id, reason: voiding.reason }) }); setVoiding(null); }); }}>
              <input className="field min-w-0 flex-1" required minLength={3} maxLength={200} placeholder="Why is this being voided?" value={voiding.reason} onChange={(e) => setVoiding({ id: p.id, reason: e.target.value })} aria-label="Reason for voiding" />
              <button className="btn btn-primary" disabled={busy || voiding.reason.trim().length < 3}>Void payment</button>
              <button type="button" className="btn btn-secondary" onClick={() => setVoiding(null)}>Keep it</button>
            </form>}
          </li>)}
        </ul>
        {payments.some((p) => p.voided_at) && <p className="text-xs text-charcoal-muted">Voiding moves the paid-until date back by the months that payment added. Check the status afterwards.</p>}
      </section>

      <section aria-labelledby="history-heading" className="space-y-2">
        <h3 id="history-heading" className="text-base font-bold">Plan, price and status history ({changes.length})</h3>
        <p className="text-xs text-charcoal-muted">Every change made by hand, and what each payment did to the status and the paid-until date. It cannot be edited.</p>
        {changes.length === 0 && <p className="text-sm text-charcoal-muted">No changes recorded yet. Changes made before this list existed are not in it.</p>}
        <ul className="space-y-2">
          {changes.map((c) => <li key={c.id} className="rounded-xl bg-ivory-muted/60 p-3 text-sm">
            <p className="font-semibold">{SOURCE_LABEL[c.source] ?? c.source}</p>
            <ul className="mt-0.5 list-disc pl-5 text-charcoal-light">{describeChange(c.before, c.after).map((line) => <li key={line}>{line}</li>)}</ul>
            <p className="mt-1 text-xs text-charcoal-muted">{c.changed_by_name ?? 'Administrator'} · {new Date(c.changed_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </li>)}
        </ul>
      </section>

      <section aria-labelledby="notes-heading" className="space-y-2">
        <h3 id="notes-heading" className="text-base font-bold">Notes ({notes.length})</h3>
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void act(async () => { await call('/api/admin/notes', { method: 'POST', body: JSON.stringify({ farmId, body: note.trim() }) }); setNote(''); }); }}>
          <input className="field min-w-0 flex-1" maxLength={500} placeholder="e.g. Called: will pay on Friday" value={note} onChange={(e) => setNote(e.target.value)} aria-label="New note" />
          <button className="btn btn-secondary" disabled={busy || !note.trim()}>Add note</button>
        </form>
        <ul className="space-y-2">
          {notes.map((n) => <li key={n.id} className="rounded-xl bg-ivory-muted/60 p-3 text-sm">
            <p>{n.body}</p>
            <p className="mt-1 text-xs text-charcoal-muted">{n.author_name ?? 'Administrator'} · {new Date(n.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
          </li>)}
        </ul>
      </section>
    </Dialog>
  );
}
