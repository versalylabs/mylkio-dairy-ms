'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import { PLANS, type PlanId } from '@/lib/plans';
import { billingState, daysLeft, needsFollowUp, reminderMessage, STATE_LABEL, shortDate, type BillingState } from '@/lib/billing';
import { telHref, whatsappHref, usablePhone } from '@/lib/vet/phone';
import type { BillingAccount } from './AccountBillingDialog';

export interface BoardAccount extends BillingAccount {
  id: string; herd_size: number; last_paid_on: string | null;
}
interface Collections { months: { month: string; amountKsh: number; payments: number }[] }

const ORDER: BillingState[] = ['overdue', 'trial_ended', 'due_soon', 'trial_ending'];
const TONE: Partial<Record<BillingState, string>> = {
  overdue: 'bg-rose-100 text-rose-900', trial_ended: 'bg-amber-100 text-amber-900', due_soon: 'bg-amber-100 text-amber-900', trial_ending: 'bg-gold-100 text-gold-600',
};
const monthName = (key: string) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-KE', { month: 'short', timeZone: 'UTC' });
const ksh = (n: number) => `KSh ${n.toLocaleString('en-KE')}`;

/** When the date is, in words: "5 days left", "3 days ago". */
function whenLine(account: BoardAccount) {
  if (!account.subscription) return '';
  const left = daysLeft(account.subscription);
  if (left === null) return '';
  const date = shortDate(account.subscription.renewsAt);
  if (left >= 0) return `Ends ${date} (${left === 0 ? 'today' : left === 1 ? '1 day left' : `${left} days left`})`;
  const ago = -left;
  return `Ended ${date} (${ago === 1 ? '1 day ago' : `${ago} days ago`})`;
}

/**
 * Who needs a call this week, and what has been collected. Records of money received are made by hand in the
 * account's billing dialog; nothing here moves money.
 */
export function BillingBoard({ accounts, refreshKey, onOpen }: { accounts: BoardAccount[]; refreshKey: number; onOpen: (account: BoardAccount) => void }) {
  const [collections, setCollections] = useState<Collections | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/admin/collections', { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load collections.');
        if (!cancelled) { setCollections(result.collections); setError(''); }
      } catch (e) { if (!cancelled) setError((e as Error).message); }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const { followUp, overLimit } = useMemo(() => {
    const withState = accounts.filter((a) => a.farm_id && a.subscription).map((a) => ({ account: a, state: billingState(a.subscription) }));
    return {
      followUp: withState.filter((x) => needsFollowUp(x.state)).sort((a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state) || (daysLeft(a.account.subscription!) ?? 0) - (daysLeft(b.account.subscription!) ?? 0)),
      overLimit: withState.filter(({ account }) => {
        const limit = PLANS[account.subscription!.plan as PlanId]?.cowLimit;
        return limit !== null && limit !== undefined && account.herd_size > limit;
      }).map((x) => x.account),
    };
  }, [accounts]);

  const months = collections?.months ?? [];
  const thisMonth = months[months.length - 1];
  const lastMonth = months[months.length - 2];
  const top = Math.max(1, ...months.map((m) => m.amountKsh));

  return (
    <section aria-labelledby="billing-heading" className="space-y-4">
      <div>
        <h2 id="billing-heading" className="font-display text-2xl font-medium">Billing and follow-up</h2>
        <p className="mt-1 max-w-2xl text-sm text-charcoal-light">Mylkio takes no automatic payments. When someone pays you, open their account and record it: that moves their paid-until date and keeps the history.</p>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="card p-4"><p className="text-sm text-charcoal-light">Received this month</p><p className="mt-1 whitespace-nowrap font-display text-[1.65rem] font-medium tabular-nums sm:text-3xl">{thisMonth ? ksh(thisMonth.amountKsh) : '…'}</p><p className="mt-1 text-xs text-charcoal-muted">{thisMonth ? `${thisMonth.payments} ${thisMonth.payments === 1 ? 'payment' : 'payments'}` : ''}</p></div>
        <div className="card p-4"><p className="text-sm text-charcoal-light">Received last month</p><p className="mt-1 whitespace-nowrap font-display text-[1.65rem] font-medium tabular-nums sm:text-3xl">{lastMonth ? ksh(lastMonth.amountKsh) : '…'}</p><p className="mt-1 text-xs text-charcoal-muted">{lastMonth ? `${lastMonth.payments} ${lastMonth.payments === 1 ? 'payment' : 'payments'}` : ''}</p></div>
        <div className="card p-4">
          <p className="text-sm text-charcoal-light">Last six months</p>
          <div className="mt-3 flex h-16 items-end gap-1.5" role="img" aria-label={`Money received by month: ${months.map((m) => `${monthName(m.month)} ${ksh(m.amountKsh)}`).join(', ')}`}>
            {months.map((m) => <div key={m.month} title={`${monthName(m.month)}: ${ksh(m.amountKsh)}`} className="flex-1 rounded-t bg-sage" style={{ height: `${Math.max(m.amountKsh === 0 ? 4 : 12, (m.amountKsh / top) * 100)}%`, opacity: m.amountKsh === 0 ? 0.25 : 1 }} />)}
          </div>
          <div className="mt-1 flex gap-1.5 text-[0.7rem] text-charcoal-muted">{months.map((m) => <span key={m.month} className="flex-1 text-center">{monthName(m.month)}</span>)}</div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-bold">Needs a call or message ({followUp.length})</h3>
        {followUp.length === 0 && <p className="text-sm text-charcoal-muted">Nobody needs following up right now: no trials ending within a week, and no payments due or late.</p>}
        {followUp.map(({ account, state }) => {
          const plan = PLANS[account.subscription!.plan as PlanId];
          const message = reminderMessage(account.name, account.subscription!, plan?.name ?? account.subscription!.plan, plan?.priceKsh ?? 0);
          const canReach = usablePhone(account.phone);
          return <article key={account.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold">{account.farm_name || account.name}</h4>
                <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[state] ?? ''}`}>{STATE_LABEL[state]}</span>
              </div>
              <p className="text-sm text-charcoal-light">{account.name} · {plan?.name} plan, {ksh(plan?.priceKsh ?? 0)}/month</p>
              <p className="text-xs text-charcoal-muted">{whenLine(account)}{account.last_paid_on ? ` · last paid ${shortDate(account.last_paid_on)}` : ' · never paid'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canReach && <a className="btn btn-secondary" href={telHref(account.phone)}><Phone className="h-4 w-4" />Call</a>}
              {canReach && <a className="btn btn-secondary" href={whatsappHref(account.phone, message)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
              <button className="btn btn-primary" onClick={() => onOpen(account)}>Record payment</button>
            </div>
          </article>;
        })}
      </div>

      {overLimit.length > 0 && <div className="space-y-2">
        <h3 className="text-base font-bold">Herd larger than the plan covers ({overLimit.length})</h3>
        <p className="text-sm text-charcoal-muted">Nothing stops these farms working. It is a prompt to talk about a bigger plan. Only the number of live cows is read, never the records.</p>
        <ul className="space-y-2">{overLimit.map((a) => {
          const plan = PLANS[a.subscription!.plan as PlanId];
          return <li key={a.id} className="card flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <span><strong>{a.farm_name || a.name}</strong> · {a.herd_size} cows on {plan.name}, which covers up to {plan.cowLimit}</span>
            <button className="btn btn-secondary" onClick={() => onOpen(a)}>Open</button>
          </li>;
        })}</ul>
      </div>}
    </section>
  );
}
