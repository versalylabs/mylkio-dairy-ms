// Where a farm stands commercially, worked out from its subscription and today's date.
//
// Mylkio takes no automatic payments. An administrator records each payment received, and that moves the
// paid-until date (`renewsAt`). Nothing changes by itself in the database when a date passes, so the state is
// derived here from the dates, the same way everywhere (Settings, Home and the administration screens).
//
// Policy, chosen to be safe for farmers:
//   * A farm's records are never locked or hidden. They stay readable and exportable whatever the state.
//   * When a trial has ended, or a payment is more than GRACE_DAYS late, or the plan is cancelled, the
//     paid-only extras (symptom checker, vet finder) fall back to the Starter set. See `featuresFor`.
//   * The herd limit on each plan is a guide for follow-up, not a lock: nothing stops a farm adding a cow.

import { BILLING_COPY, type Lang } from './app-copy';

export const SOON_DAYS = 7;
/** How long after the paid-until date the extras keep working. Trials get none. */
export const GRACE_DAYS = 7;

export type BillingState =
  | 'complimentary' // the platform's own account: no plan to pay for
  | 'trial'
  | 'trial_ending'
  | 'trial_ended'
  | 'paid'
  | 'due_soon'
  | 'overdue'
  | 'cancelled';

export interface BillingSubscription { plan: string; status?: string; renewsAt?: string }

const DAY = 86_400_000;

function endTime(subscription: BillingSubscription): number | null {
  const time = subscription.renewsAt ? new Date(subscription.renewsAt).getTime() : NaN;
  return Number.isNaN(time) ? null : time;
}

/** Whole days from `now` until the paid-until date. Negative once it has passed. Null if there is no date. */
export function daysLeft(subscription: BillingSubscription, now: Date = new Date()): number | null {
  const end = endTime(subscription);
  return end === null ? null : Math.ceil((end - now.getTime()) / DAY);
}

export function billingState(subscription: BillingSubscription | null | undefined, now: Date = new Date()): BillingState {
  if (!subscription || subscription.plan === 'admin') return 'complimentary';
  if (subscription.status === 'cancelled') return 'cancelled';
  const left = daysLeft(subscription, now);
  if (subscription.status === 'trial') {
    if (left === null) return 'trial';
    return left < 0 ? 'trial_ended' : left <= SOON_DAYS ? 'trial_ending' : 'trial';
  }
  if (subscription.status === 'past_due') return 'overdue';
  if (left === null) return 'paid';
  return left < 0 ? 'overdue' : left <= SOON_DAYS ? 'due_soon' : 'paid';
}

/** True when the paid-only extras should be switched off (trial over, payment well late, or cancelled). */
export function extrasLapsed(subscription: BillingSubscription | null | undefined, now: Date = new Date()): boolean {
  if (!subscription || subscription.plan === 'admin') return false;
  if (subscription.status === 'cancelled') return true;
  const end = endTime(subscription);
  if (end === null) return false;
  const grace = subscription.status === 'trial' ? 0 : GRACE_DAYS * DAY;
  return now.getTime() > end + grace;
}

/** Needs a phone call or message from the administrator. */
export const needsFollowUp = (state: BillingState) =>
  state === 'trial_ending' || state === 'trial_ended' || state === 'due_soon' || state === 'overdue';

// The administration screens use the English labels; a farmer sees their own language (see lib/app-copy.ts).
export const STATE_LABEL: Record<BillingState, string> = BILLING_COPY.en.stateLabel;
export const stateLabel = (state: BillingState, lang: Lang = 'en') => BILLING_COPY[lang].stateLabel[state];

export const shortDate = (iso: string, lang: Lang = 'en') =>
  new Date(iso).toLocaleDateString(lang === 'sw' ? 'sw-KE' : 'en-KE', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', year: 'numeric' });

/** One line a farmer can read: "Free trial: 9 days left (ends 24 Nov 2026)". */
export function describeBilling(subscription: BillingSubscription, now: Date = new Date(), lang: Lang = 'en'): string {
  const state = billingState(subscription, now);
  const left = daysLeft(subscription, now);
  const date = subscription.renewsAt ? shortDate(subscription.renewsAt, lang) : '';
  const d = BILLING_COPY[lang].describe;
  switch (state) {
    case 'complimentary': return d.complimentary;
    case 'cancelled': return d.cancelled;
    case 'trial':
    case 'trial_ending': return left === null ? d.trialUnknown : d.trial(left, date);
    case 'trial_ended': return d.trialEnded(date);
    case 'paid':
    case 'due_soon': return d.paid(date);
    case 'overdue': return d.overdue(date);
  }
}

/** A short message an administrator can send. Edited by hand before sending. */
export function reminderMessage(name: string, subscription: BillingSubscription, planName: string, priceKsh: number, now: Date = new Date()): string {
  const state = billingState(subscription, now);
  const first = name.trim().split(/\s+/)[0] || 'there';
  const date = subscription.renewsAt ? shortDate(subscription.renewsAt) : '';
  const price = `KSh ${priceKsh.toLocaleString('en-KE')}/month`;
  if (state === 'trial_ending') return `Hello ${first}, your Mylkio free trial ends on ${date}. To keep the ${planName} plan (${price}) going, reply here and we will help you with payment. Your records stay safe either way.`;
  if (state === 'trial_ended') return `Hello ${first}, your Mylkio free trial ended on ${date}. Your records are safe. To continue on the ${planName} plan (${price}), reply here and we will help you with payment.`;
  if (state === 'due_soon') return `Hello ${first}, your Mylkio ${planName} plan is paid until ${date}. To renew (${price}), reply here and we will help you.`;
  if (state === 'overdue') return `Hello ${first}, your Mylkio ${planName} plan payment was due on ${date}. To renew (${price}), reply here and we will help you. Your records are safe.`;
  return `Hello ${first}, this is Mylkio. How is the system working for you?`;
}

/** Cows that count towards a plan's herd limit: the same rule the administration screen uses on the server. */
export const liveCowCount = (cows: { status: string }[]) =>
  cows.filter((c) => c.status !== 'sold' && c.status !== 'deceased' && c.status !== 'archived').length;

/** The few words for the plan pill in the sidebar. */
export function planPillLabel(subscription: BillingSubscription, lang: Lang = 'en'): string {
  const p = BILLING_COPY[lang].pill;
  switch (billingState(subscription)) {
    case 'trial':
    case 'trial_ending': return p.trial;
    case 'trial_ended': return p.trial_ended;
    case 'overdue': return p.overdue;
    case 'cancelled': return p.cancelled;
    default: return p.plan(subscription.plan.replace('_', ' ').toUpperCase());
  }
}
