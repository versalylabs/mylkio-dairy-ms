import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { freshDatabase } from '../db/harness';
import {
  adminRecordPayment, adminSubscriptionHistory, adminUpdateSubscription, adminVoidPayment, onboard, type Db, type OnboardingInput, type SessionUser,
} from '@/lib/server/farm-api';
import { SOURCE_LABEL, describeChange } from '@/lib/subscription-history';

const asDb = (pg: PGlite): Db => ({ query: async (text, params) => (await pg.query(text, params as never)).rows as never });
const user = (id: string): SessionUser => ({ id, email: `${id}@example.test`, name: id });
const details = (farmName: string, plan: OnboardingInput['plan']): OnboardingInput => ({ name: 'Farmer', phone: '0712345678', farmName, county: 'Nakuru', plan, language: 'en' });
const day = (offset = 0) => new Date(Date.now() + offset * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });

let pg: PGlite;
let db: Db;
const farmOf: Record<string, string> = {};
const history = (farm: string) => adminSubscriptionHistory(db, 'boss', farm);

beforeAll(async () => {
  pg = await freshDatabase();
  db = asDb(pg);
  for (const [id, plan] of [['amina', 'farmer'], ['baraka', 'starter'], ['kuku', 'farmer'], ['boss', 'farmer']] as const) {
    await onboard(db, user(id), details(`${id} farm`, plan));
    farmOf[id] = (await pg.query<{ farm_id: string }>('select farm_id from public.farm_memberships where user_id = $1', [id])).rows[0].farm_id;
  }
  await pg.query(`update public.profiles set role = 'super_admin' where id = 'boss'`);
}, 60_000);

describe('the history of plan, price and status changes', () => {
  it('starts empty, and only an administrator can read it', async () => {
    expect(await history(farmOf.amina)).toEqual([]);
    await expect(adminSubscriptionHistory(db, 'amina', farmOf.amina)).rejects.toMatchObject({ status: 403 });
    await expect(adminSubscriptionHistory(db, 'nobody', farmOf.amina)).rejects.toMatchObject({ status: 403 });
  });

  it('records what a plan change was and what it became, with who did it', async () => {
    await adminUpdateSubscription(db, 'boss', farmOf.amina, 'farm_pro', 'active');
    const [row] = await history(farmOf.amina);
    expect(row.source).toBe('admin');
    expect(row.changed_by_name).toBe('Farmer'); // the administrator's profile name
    expect(row.before).toMatchObject({ plan: 'farmer', status: 'trial', monthlyPriceKsh: 1300 });
    expect(row.after).toMatchObject({ plan: 'farm_pro', status: 'active', monthlyPriceKsh: 2800 });
    expect(describeChange(row.before, row.after)).toEqual(['Plan: Farmer to Farm Pro', 'Status: Free trial to Paid', 'Price: KSh 1,300 a month to KSh 2,800 a month']);
  });

  it('records a Custom plan with its agreed price, note and team size', async () => {
    await adminUpdateSubscription(db, 'boss', farmOf.baraka, 'custom', 'active', { monthlyPriceKsh: 9500, note: 'Quarterly invoice', teamLimit: 8 });
    const [row] = await history(farmOf.baraka);
    expect(describeChange(row.before, row.after)).toEqual([
      'Plan: Starter to Custom', 'Status: Free trial to Paid', 'Price: KSh 700 a month to KSh 9,500 a month', 'Logins: the plan default to 8', 'Agreed with the farm: "Quarterly invoice"',
    ]);
    await adminUpdateSubscription(db, 'boss', farmOf.baraka, 'custom', 'active', { monthlyPriceKsh: 11_000 });
    const [again] = await history(farmOf.baraka);
    expect(describeChange(again.before, again.after)).toEqual(['Price: KSh 9,500 a month to KSh 11,000 a month']);
  });

  it('writes nothing for a call that changed nothing', async () => {
    const before = (await history(farmOf.amina)).length;
    await adminUpdateSubscription(db, 'boss', farmOf.amina, 'farm_pro', 'active');
    expect((await history(farmOf.amina)).length).toBe(before);
  });

  it('lists the newest change first, and keeps them all', async () => {
    await adminUpdateSubscription(db, 'boss', farmOf.amina, 'farm_pro', 'past_due');
    await adminUpdateSubscription(db, 'boss', farmOf.amina, 'farmer', 'cancelled');
    const rows = await history(farmOf.amina);
    expect(rows.map((r) => describeChange(r.before, r.after)[0])).toEqual(['Plan: Farm Pro to Farmer', 'Status: Paid to Past due', 'Plan: Farmer to Farm Pro']);
  });

  it('records what a payment, and the voiding of one, did to the status and the paid-until date', async () => {
    const paid = await adminRecordPayment(db, 'boss', farmOf.kuku, { amountKsh: 1300, method: 'mpesa', reference: 'TKR1HISTORY', paidOn: day(0), months: 1 });
    const [afterPay] = await history(farmOf.kuku);
    expect(afterPay.source).toBe('payment');
    expect(describeChange(afterPay.before, afterPay.after).some((l) => l.startsWith('Status: Free trial to Paid'))).toBe(true);
    expect(describeChange(afterPay.before, afterPay.after).some((l) => l.startsWith('Paid until:'))).toBe(true);

    await adminVoidPayment(db, 'boss', paid.id, 'entered twice');
    const rows = await history(farmOf.kuku);
    expect(rows[0].source).toBe('payment_void');
    expect(describeChange(rows[0].before, rows[0].after).some((l) => l.startsWith('Paid until:'))).toBe(true);
    expect(rows).toHaveLength(2);
    expect(SOURCE_LABEL.payment).toBe('Payment recorded');
  });

  it('is kept when the plan is changed back, and cannot be changed from the app', async () => {
    const { rows } = await pg.query(`select count(*)::int as n from public.subscription_changes where farm_id = $1`, [farmOf.amina]);
    expect((rows[0] as { n: number }).n).toBeGreaterThan(0);
    // there is no function for editing or deleting a history row: only the reading one is exposed
    const fns = (await pg.query<{ proname: string }>(`select proname from pg_proc where proname like '%subscription_hist%' or proname like '%subscription_change%'`)).rows.map((r) => r.proname).sort();
    expect(fns).toEqual(['admin_subscription_history', 'log_subscription_change']);
  });
});

describe('a payment can now be recorded for a Custom farm', () => {
  it('uses the price agreed with the farm and moves the paid-until date, as for any plan', async () => {
    const paid = await adminRecordPayment(db, 'boss', farmOf.baraka, { amountKsh: 11_000, method: 'bank', reference: 'BANK-CUSTOM-1', paidOn: day(0), months: 1 });
    expect(paid.periodTo > paid.periodFrom).toBe(true);
    const { rows } = await pg.query<{ plan: string; amount_ksh: number }>(`select plan, amount_ksh from public.subscription_payments where farm_id = $1`, [farmOf.baraka]);
    expect(rows).toEqual([{ plan: 'custom', amount_ksh: 11_000 }]);
    const status = (await pg.query<{ s: string }>(`select details->>'status' as s from public.subscriptions where farm_id = $1`, [farmOf.baraka])).rows[0].s;
    expect(status).toBe('active');
  });
});

describe('the wording', () => {
  it('says only what changed', () => {
    expect(describeChange({ plan: 'farmer', status: 'trial' }, { plan: 'farmer', status: 'trial' })).toEqual([]);
    expect(describeChange({ renewsAt: '2026-11-20T00:00:00Z' }, { renewsAt: '2026-12-20T00:00:00Z' })).toEqual(['Paid until: 20 Nov 2026 to 20 Dec 2026']);
    expect(describeChange({ plan: 'custom', customNote: 'a' }, { plan: 'farm_pro' })).toEqual(['Plan: Custom to Farm Pro', 'Agreed with the farm: note removed']);
  });
});
