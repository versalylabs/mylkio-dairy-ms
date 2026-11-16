'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';
import { supportMessageHref } from '@/lib/contact';
import { useSiteContent } from '@/components/site/SiteContentProvider';
import { PLANS, type PlanId } from '@/lib/plans';
import { billingState, daysLeft, describeBilling, extrasLapsed, type BillingSubscription } from '@/lib/billing';
import { BILLING_COPY, type Lang } from '@/lib/app-copy';
import { useLanguage } from '@/lib/use-language';

const sentence = (line: string) => (/[.!?]$/.test(line) ? line : `${line}.`);

/** What the farmer types to Mylkio to pay or change plan. Names the farm only; sent by the farmer themself. */
export function payMessage(farmName: string, planName: string, lang: Lang = 'en') {
  return BILLING_COPY[lang].payMessage(planName, farmName);
}

/**
 * A calm line on Home when the trial is ending or a payment is due or late. It never blocks anything: records
 * stay open and exportable, and it says so. Nothing is shown while all is well.
 */
export function PlanNotice({ subscription, farmName }: { subscription?: (BillingSubscription & { plan: string }) | null; farmName: string }) {
  const { contact } = useSiteContent();
  const [lang] = useLanguage();
  if (!subscription) return null;
  const state = billingState(subscription);
  if (state === 'complimentary' || state === 'trial' || state === 'paid') return null;

  const t = BILLING_COPY[lang].notice;
  const plan = PLANS[subscription.plan as PlanId];
  const left = daysLeft(subscription);
  const headline = {
    trial_ending: left !== null && left <= 0 ? t.trialEndsToday : t.trialEnds(left ?? 0),
    trial_ended: t.trialEnded,
    due_soon: left !== null && left <= 0 ? t.dueToday : t.due(left ?? 0),
    overdue: t.overdue,
    cancelled: t.cancelled,
  }[state];
  const urgent = state === 'trial_ended' || state === 'overdue' || state === 'cancelled';
  // Only say extras are paused when they have been, and the farm had them in the first place.
  const hadExtras = state === 'trial_ended' || (plan ? Object.entries(plan.features).some(([key, value]) => value && !(PLANS.starter.features as unknown as Record<string, unknown>)[key]) : false);
  const paused = extrasLapsed(subscription) && hadExtras;

  return (
    <section aria-label={lang === 'sw' ? 'Mpango wako' : 'Your plan'} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${urgent ? 'border-gold-border bg-gold-subtle' : 'border-ivory-border bg-white shadow-soft'}`}>
      <div className="min-w-0">
        <p className="font-semibold text-charcoal">{headline}</p>
        <p className="mt-0.5 text-sm text-charcoal-light">
          {sentence(describeBilling(subscription, new Date(), lang))}
          {paused ? t.paused : t.safe}
        </p>
      </div>
      <a className="btn btn-primary shrink-0" href={supportMessageHref(contact, payMessage(farmName, plan?.name ?? subscription.plan, lang))} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4" />{t.message}
      </a>
    </section>
  );
}
