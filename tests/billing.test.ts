import { describe, expect, it } from 'vitest';
import { GRACE_DAYS, billingState, daysLeft, describeBilling, extrasLapsed, needsFollowUp, reminderMessage } from '@/lib/billing';
import { PLANS, canUse, featuresFor } from '@/lib/plans';

const NOW = new Date('2026-11-15T09:00:00Z');
const inDays = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString();
const sub = (status: string, days: number | null, plan = 'farmer') => ({ plan, status, ...(days === null ? {} : { renewsAt: inDays(days) }) });

describe('where a farm stands', () => {
  it('follows the trial from running to ending to ended', () => {
    expect(billingState(sub('trial', 12), NOW)).toBe('trial');
    expect(billingState(sub('trial', 7), NOW)).toBe('trial_ending');
    expect(billingState(sub('trial', 1), NOW)).toBe('trial_ending');
    expect(billingState(sub('trial', -1), NOW)).toBe('trial_ended');
  });

  it('follows a paid plan from paid to due soon to overdue', () => {
    expect(billingState(sub('active', 20), NOW)).toBe('paid');
    expect(billingState(sub('active', 5), NOW)).toBe('due_soon');
    expect(billingState(sub('active', -2), NOW)).toBe('overdue');
  });

  it('treats a manually set past-due or cancelled account as such, whatever the date', () => {
    expect(billingState(sub('past_due', 30), NOW)).toBe('overdue');
    expect(billingState(sub('cancelled', 30), NOW)).toBe('cancelled');
  });

  it('has no plan to pay for on the platform account, and copes with a missing date', () => {
    expect(billingState({ plan: 'admin', status: 'active' }, NOW)).toBe('complimentary');
    expect(billingState(null, NOW)).toBe('complimentary');
    expect(billingState(sub('active', null), NOW)).toBe('paid');
    expect(billingState(sub('trial', null), NOW)).toBe('trial');
    expect(daysLeft({ plan: 'farmer', renewsAt: 'not a date' }, NOW)).toBeNull();
  });

  it('counts whole days left, rounding a part day up', () => {
    expect(daysLeft({ plan: 'farmer', renewsAt: new Date(NOW.getTime() + 3.2 * 86_400_000).toISOString() }, NOW)).toBe(4);
    expect(daysLeft(sub('active', -3), NOW)).toBe(-3);
  });

  it('asks for a follow-up exactly when someone needs a call', () => {
    expect(['trial', 'trial_ending', 'trial_ended', 'paid', 'due_soon', 'overdue', 'cancelled', 'complimentary'].filter((s) => needsFollowUp(s as never)))
      .toEqual(['trial_ending', 'trial_ended', 'due_soon', 'overdue']);
  });
});

describe('when the paid extras pause', () => {
  it('pauses them the moment a trial ends, with no grace', () => {
    expect(extrasLapsed(sub('trial', 1), NOW)).toBe(false);
    expect(extrasLapsed(sub('trial', -1), NOW)).toBe(true);
  });

  it(`gives a paying farm ${GRACE_DAYS} days after its date`, () => {
    expect(extrasLapsed(sub('active', -(GRACE_DAYS - 1)), NOW)).toBe(false);
    expect(extrasLapsed(sub('active', -(GRACE_DAYS + 1)), NOW)).toBe(true);
  });

  it('pauses them for a cancelled plan, never for the platform account, and never without a date', () => {
    expect(extrasLapsed(sub('cancelled', 90), NOW)).toBe(true);
    expect(extrasLapsed({ plan: 'admin', status: 'active', renewsAt: inDays(-900) }, NOW)).toBe(false);
    expect(extrasLapsed(sub('active', null), NOW)).toBe(false);
  });

  it('drops a lapsed farm to the Starter set, but only the extras', () => {
    expect(featuresFor(sub('active', 20, 'farm_pro'), NOW)).toEqual(PLANS.farm_pro.features);
    expect(featuresFor(sub('active', -30, 'farm_pro'), NOW)).toEqual(PLANS.starter.features);
    expect(featuresFor(sub('trial', -1, 'starter'), NOW)).toEqual(PLANS.starter.features); // no trial bonus once ended
    expect(featuresFor(sub('trial', 3, 'starter'), NOW)).toEqual(PLANS.farmer.features); // trial bonus while it runs
    const lapsed = featuresFor(sub('cancelled', 10, 'farm_pro'), NOW);
    expect(lapsed.illnessGuide).toBe(true); // safety information is never behind a payment
    expect(lapsed.seasonalCalendar).toBe(true);
    expect(canUse(sub('active', -30, 'farmer'), 'healthChecker')).toBe(false);
  });
});

describe('the words shown to farmers and sent by administrators', () => {
  it('describes each state in one plain line', () => {
    expect(describeBilling(sub('trial', 9), NOW)).toMatch(/^Free trial: 9 days left \(ends 24 Nov 2026\)$/);
    expect(describeBilling(sub('trial', 1), NOW)).toContain('1 day left');
    expect(describeBilling(sub('trial', -2), NOW)).toMatch(/Free trial ended on 13 Nov 2026\. Your records are safe/);
    expect(describeBilling(sub('active', 40), NOW)).toBe('Paid until 25 Dec 2026');
    expect(describeBilling(sub('active', -3), NOW)).toBe('Payment was due on 12 Nov 2026');
    expect(describeBilling(sub('cancelled', 40), NOW)).toContain('records are still here');
  });

  it('writes a reminder with the first name, the date and the price, and always says the records are safe when late', () => {
    const late = reminderMessage('Amina Wanjiru', sub('active', -3), 'Farmer', 1000, NOW);
    expect(late).toContain('Hello Amina');
    expect(late).toContain('12 Nov 2026');
    expect(late).toContain('KSh 1,000/month');
    expect(late).toContain('records are safe');
    expect(reminderMessage('', sub('trial', 3), 'Starter', 500, NOW)).toContain('Hello there');
    expect(reminderMessage('Amina', sub('active', 60), 'Farmer', 1000, NOW)).toContain('How is the system working');
  });
});
