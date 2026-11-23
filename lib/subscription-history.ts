// Turns a recorded subscription change (what it was, what it became) into plain lines for the account's history:
// "Plan: Farmer to Farm Pro", "Status: Trial to Active", "Price: KSh 1,300 to KSh 2,800 a month".

import { formatKsh } from './money';
import { PLANS, type PlanId } from './plans';

export type ChangeSource = 'admin' | 'payment' | 'payment_void';

export const SOURCE_LABEL: Record<ChangeSource, string> = {
  admin: 'Changed by hand',
  payment: 'Payment recorded',
  payment_void: 'Payment voided',
};

const STATUS_LABEL: Record<string, string> = { trial: 'Free trial', active: 'Paid', past_due: 'Past due', cancelled: 'Cancelled' };

const planName = (value: unknown) => (typeof value === 'string' ? PLANS[value as PlanId]?.name ?? value : 'none');
const statusName = (value: unknown) => (typeof value === 'string' ? STATUS_LABEL[value] ?? value : 'none');
const day = (value: unknown) => {
  const time = typeof value === 'string' ? new Date(value) : null;
  return time && !Number.isNaN(time.getTime())
    ? new Intl.DateTimeFormat('en-KE', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', year: 'numeric' }).format(time)
    : 'none';
};
const money = (value: unknown) => (typeof value === 'number' ? `${formatKsh(value)} a month` : 'none');

/** The lines that changed, in a fixed order. Nothing for a key that did not change. */
export function describeChange(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  const lines: string[] = [];
  const differs = (key: string) => JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null);
  if (differs('plan')) lines.push(`Plan: ${planName(before.plan)} to ${planName(after.plan)}`);
  if (differs('status')) lines.push(`Status: ${statusName(before.status)} to ${statusName(after.status)}`);
  if (differs('monthlyPriceKsh')) lines.push(`Price: ${money(before.monthlyPriceKsh)} to ${money(after.monthlyPriceKsh)}`);
  if (differs('teamLimit')) lines.push(`Logins: ${before.teamLimit ?? 'the plan default'} to ${after.teamLimit ?? 'the plan default'}`);
  if (differs('customNote')) lines.push(`Agreed with the farm: ${after.customNote ? `"${String(after.customNote)}"` : 'note removed'}`);
  if (differs('renewsAt')) lines.push(`Paid until: ${day(before.renewsAt)} to ${day(after.renewsAt)}`);
  return lines;
}
