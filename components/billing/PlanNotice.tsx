'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';
import { whatsappLink } from '@/lib/contact';
import { useSiteContent } from '@/components/site/SiteContentProvider';
import { whatsappDigits } from '@/lib/site-content';
import { PLANS, type PlanId } from '@/lib/plans';
import { billingState, daysLeft, describeBilling, extrasLapsed, type BillingSubscription } from '@/lib/billing';

const sentence = (line: string) => (/[.!?]$/.test(line) ? line : `${line}.`);

/** What the farmer types to Mylkio to pay or change plan. Names the farm only; sent by the farmer themself. */
export function payMessage(farmName: string, planName: string) {
  return `Hello Mylkio, I would like to pay for my ${planName} plan. Farm: ${farmName}.`;
}

/**
 * A calm line on Home when the trial is ending or a payment is due or late. It never blocks anything: records
 * stay open and exportable, and it says so. Nothing is shown while all is well.
 */
export function PlanNotice({ subscription, farmName }: { subscription?: (BillingSubscription & { plan: string }) | null; farmName: string }) {
  const { contact } = useSiteContent();
  if (!subscription) return null;
  const state = billingState(subscription);
  if (state === 'complimentary' || state === 'trial' || state === 'paid') return null;

  const plan = PLANS[subscription.plan as PlanId];
  const left = daysLeft(subscription);
  const headline = {
    trial_ending: left !== null && left <= 0 ? 'Your free trial ends today' : `Your free trial ends in ${left === 1 ? '1 day' : `${left} days`}`,
    trial_ended: 'Your free trial has ended',
    due_soon: left !== null && left <= 0 ? 'Your plan is due today' : `Your plan is due in ${left === 1 ? '1 day' : `${left} days`}`,
    overdue: 'Your payment is overdue',
    cancelled: 'Your plan was cancelled',
  }[state];
  const urgent = state === 'trial_ended' || state === 'overdue' || state === 'cancelled';
  // Only say extras are paused when they have been, and the farm had them in the first place.
  const hadExtras = state === 'trial_ended' || Boolean(plan?.features.healthChecker || plan?.features.vetFinder);
  const paused = extrasLapsed(subscription) && hadExtras;

  return (
    <section aria-label="Your plan" className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${urgent ? 'border-gold-border bg-gold-subtle' : 'border-ivory-border bg-white shadow-soft'}`}>
      <div className="min-w-0">
        <p className="font-semibold text-charcoal">{headline}</p>
        <p className="mt-0.5 text-sm text-charcoal-light">
          {sentence(describeBilling(subscription))}
          {paused ? ' The symptom checker and vet finder are paused until payment; everything else keeps working.' : ' Your records stay safe either way.'}
        </p>
      </div>
      <a className="btn btn-primary shrink-0" href={whatsappLink(whatsappDigits(contact), payMessage(farmName, plan?.name ?? subscription.plan))} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4" />Message Mylkio
      </a>
    </section>
  );
}
