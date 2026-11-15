import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { freshDatabase } from '../db/harness';
import {
  adminAddNote, adminCollections, adminListAccounts, adminListNotes, adminListPayments, adminRecordPayment, adminVoidPayment,
  onboard, type Db, type OnboardingInput, type SessionUser,
} from '@/lib/server/farm-api';

const asDb = (pg: PGlite): Db => ({ query: async (text, params) => (await pg.query(text, params as never)).rows as never });
const user = (id: string): SessionUser => ({ id, email: `${id}@example.test`, name: id });
const details = (farmName: string, plan: OnboardingInput['plan']): OnboardingInput => ({ name: 'Farmer', phone: '0712345678', farmName, county: 'Nakuru', plan, language: 'en' });

let pg: PGlite;
let db: Db;
const farmOf: Record<string, string> = {};

/** Nairobi calendar date, N days from today. */
const day = (offset = 0) => new Date(Date.now() + offset * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
const sub = async (farm: string) => (await pg.query<{ details: { status: string; renewsAt: string; plan: string } }>('select details from public.subscriptions where farm_id = $1', [farm])).rows[0].details;
const renewsOn = async (farm: string) => new Date((await sub(farm)).renewsAt).toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
const pay = (farm: string, over: Partial<Parameters<typeof adminRecordPayment>[3]> = {}) =>
  adminRecordPayment(db, 'boss', farm, { amountKsh: 1000, method: 'mpesa', reference: '', paidOn: day(0), months: 1, ...over });

beforeAll(async () => {
  pg = await freshDatabase();
  db = asDb(pg);
  for (const [id, plan] of [['amina', 'farmer'], ['baraka', 'starter'], ['chebet', 'farm_pro'], ['boss', 'farmer']] as const) {
    await onboard(db, user(id), details(`${id} farm`, plan));
    farmOf[id] = (await pg.query<{ farm_id: string }>('select farm_id from public.farm_memberships where user_id = $1', [id])).rows[0].farm_id;
  }
  await pg.query(`update public.profiles set role = 'super_admin' where id = 'boss'`);
}, 60_000);

describe('who may use the commercial tools', () => {
  it('refuses farm owners and strangers on every one of them', async () => {
    for (const actor of ['amina', 'nobody']) {
      await expect(adminRecordPayment(db, actor, farmOf.amina, { amountKsh: 1000, method: 'cash', reference: '', paidOn: day(), months: 1 })).rejects.toMatchObject({ status: 403 });
      await expect(adminListPayments(db, actor, farmOf.amina)).rejects.toMatchObject({ status: 403 });
      await expect(adminAddNote(db, actor, farmOf.amina, 'hi')).rejects.toMatchObject({ status: 403 });
      await expect(adminListNotes(db, actor, farmOf.amina)).rejects.toMatchObject({ status: 403 });
      await expect(adminCollections(db, actor)).rejects.toMatchObject({ status: 403 });
      await expect(adminVoidPayment(db, actor, farmOf.amina, 'because')).rejects.toMatchObject({ status: 403 });
    }
  });
});

describe('recording a payment', () => {
  it('turns a trial into a paid plan and starts the paid month where the trial ends', async () => {
    const trialEnds = await renewsOn(farmOf.amina);
    expect((await sub(farmOf.amina)).status).toBe('trial');
    const result = await pay(farmOf.amina, { reference: 'TKR1AAA111' });
    expect(result.periodFrom).toBe(trialEnds);
    const after = await sub(farmOf.amina);
    expect(after.status).toBe('active');
    const expected = new Date(`${trialEnds}T00:00:00Z`); expected.setUTCMonth(expected.getUTCMonth() + 1);
    expect(await renewsOn(farmOf.amina)).toBe(result.periodTo);
    expect(result.periodTo).toBe(expected.toISOString().slice(0, 10));
  });

  it('stacks a second payment after the first, and a multi-month payment counts every month', async () => {
    const before = await renewsOn(farmOf.amina);
    const result = await pay(farmOf.amina, { amountKsh: 3000, months: 3, reference: 'TKR2BBB222' });
    expect(result.periodFrom).toBe(before);
    const after = new Date(`${before}T00:00:00Z`); after.setUTCMonth(after.getUTCMonth() + 3);
    expect(await renewsOn(farmOf.amina)).toBe(after.toISOString().slice(0, 10));
  });

  it('starts again from the day of payment when the farm had lapsed', async () => {
    await pg.query(`update public.subscriptions set details = details || jsonb_build_object('status','past_due','renewsAt', now() - interval '40 days') where farm_id = $1`, [farmOf.baraka]);
    const result = await pay(farmOf.baraka, { amountKsh: 500, method: 'cash' });
    expect(result.periodFrom).toBe(day(0));
    expect((await sub(farmOf.baraka)).status).toBe('active');
  });

  it('keeps the plan and price as they were', async () => {
    const after = await sub(farmOf.chebet);
    await pay(farmOf.chebet, { amountKsh: 2500, method: 'bank', reference: 'BANK-77' });
    expect((await sub(farmOf.chebet)).plan).toBe(after.plan);
  });

  it('refuses the same M-Pesa or bank reference twice, in any case, but allows cash with no reference again and again', async () => {
    await expect(pay(farmOf.chebet, { reference: 'tkr1aaa111' })).rejects.toMatchObject({ status: 409, message: expect.stringMatching(/already been recorded/) });
    await pay(farmOf.chebet, { method: 'cash', reference: '' });
    await pay(farmOf.chebet, { method: 'cash', reference: '' });
  });

  it('refuses nonsense: a future date, a zero amount, 13 months, an unknown method, an unknown farm', async () => {
    await expect(pay(farmOf.amina, { paidOn: day(2), reference: 'F1' })).rejects.toMatchObject({ status: 400 });
    await expect(pay(farmOf.amina, { amountKsh: 0, reference: 'F2' })).rejects.toMatchObject({ status: 400 });
    await expect(pay(farmOf.amina, { months: 13, reference: 'F3' })).rejects.toMatchObject({ status: 400 });
    await expect(pay(farmOf.amina, { method: 'cheque' as never, reference: 'F4' })).rejects.toMatchObject({ status: 400 });
    await expect(pay('00000000-0000-0000-0000-000000000000')).rejects.toMatchObject({ status: 400 });
    await expect(pay(farmOf.amina, { paidOn: day(-400), reference: 'F5' })).rejects.toMatchObject({ status: 400 });
  });

  it('writes an audit line for each payment', async () => {
    const { rows } = await pg.query<{ n: number }>(`select count(*)::int as n from public.audit_logs where action = 'subscription.payment'`);
    expect(rows[0].n).toBeGreaterThanOrEqual(5);
  });
});

describe('the payment list and voiding a mistake', () => {
  it('lists a farm\'s payments, newest first, with who recorded them', async () => {
    const list = await adminListPayments(db, 'boss', farmOf.amina);
    expect(list.length).toBe(2);
    expect(list[0]).toMatchObject({ amount_ksh: expect.any(Number), recorded_by_name: 'Farmer', voided_at: null });
    expect(list.map((p) => p.months).sort()).toEqual([1, 3]);
  });

  it('needs a reason, keeps the voided line, and moves the paid-until date back', async () => {
    const [latest] = (await adminListPayments(db, 'boss', farmOf.amina)).filter((p) => p.months === 3);
    const before = await renewsOn(farmOf.amina);
    await expect(adminVoidPayment(db, 'boss', latest.id, ' ')).rejects.toMatchObject({ status: 400 });
    await adminVoidPayment(db, 'boss', latest.id, 'Entered against the wrong farm');
    const after = new Date(`${before}T00:00:00Z`); after.setUTCMonth(after.getUTCMonth() - 3);
    expect(await renewsOn(farmOf.amina)).toBe(after.toISOString().slice(0, 10));
    const list = await adminListPayments(db, 'boss', farmOf.amina);
    expect(list.find((p) => p.id === latest.id)).toMatchObject({ void_reason: 'Entered against the wrong farm' });
    await expect(adminVoidPayment(db, 'boss', latest.id, 'again')).rejects.toMatchObject({ status: 400 });
  });

  it('frees the reference again and flags the account as past due when the date falls behind', async () => {
    await pg.query(`update public.subscriptions set details = details || jsonb_build_object('status','active','renewsAt', now() + interval '5 days') where farm_id = $1`, [farmOf.chebet]);
    const [target] = (await adminListPayments(db, 'boss', farmOf.chebet)).filter((p) => p.reference === 'BANK-77');
    await adminVoidPayment(db, 'boss', target.id, 'Wrong amount typed');
    expect((await sub(farmOf.chebet)).status).toBe('past_due');
    await pay(farmOf.chebet, { amountKsh: 2500, method: 'bank', reference: 'BANK-77' }); // allowed once the first is void
  });
});

describe('notes and the collections figures', () => {
  it('keeps notes newest first and refuses an empty or very long one', async () => {
    await adminAddNote(db, 'boss', farmOf.amina, 'Called: will pay on Friday');
    await adminAddNote(db, 'boss', farmOf.amina, 'Paid by M-Pesa');
    const notes = await adminListNotes(db, 'boss', farmOf.amina);
    expect(notes.map((n) => n.body)).toEqual(['Paid by M-Pesa', 'Called: will pay on Friday']);
    expect(notes[0].author_name).toBe('Farmer');
    await expect(adminAddNote(db, 'boss', farmOf.amina, '   ')).rejects.toMatchObject({ status: 400 });
    await expect(adminAddNote(db, 'boss', farmOf.amina, 'x'.repeat(501))).rejects.toMatchObject({ status: 400 });
    await expect(adminAddNote(db, 'boss', '00000000-0000-0000-0000-000000000000', 'hi')).rejects.toMatchObject({ status: 400 });
  });

  it('adds up money received this month without the voided payments, and shows six months', async () => {
    const { months } = await adminCollections(db, 'boss');
    expect(months).toHaveLength(6);
    const thisMonth = months[months.length - 1];
    const { rows } = await pg.query<{ total: string; n: number }>(
      `select coalesce(sum(amount_ksh),0) as total, count(*)::int as n from public.subscription_payments
        where voided_at is null and date_trunc('month', paid_on::timestamp) = date_trunc('month', (now() at time zone 'Africa/Nairobi'))`);
    expect(thisMonth.amountKsh).toBe(Number(rows[0].total));
    expect(thisMonth.payments).toBe(rows[0].n);
    expect(thisMonth.amountKsh).toBeGreaterThan(0);
    expect(months.slice(0, 5).every((m) => m.amountKsh === 0)).toBe(true);
  });
});

describe('the account list carries herd size, last payment and note count', () => {
  it('counts live cows only: not deleted, sold, dead or archived, and nothing else from the farm', async () => {
    const insert = (farm: string, id: string, status: string, deleted = false) =>
      pg.query(`insert into public.farm_records(farm_id, bucket, id, version, change_seq, deleted, data) values ($1, 'cows', $2, 1, nextval('public.farm_record_change_seq'), $3, $4::jsonb)`,
        [farm, id, deleted, JSON.stringify({ id, status })]);
    await insert(farmOf.amina, 'c1', 'lactating');
    await insert(farmOf.amina, 'c2', 'pregnant_heifer');
    await insert(farmOf.amina, 'c3', 'calf');
    await insert(farmOf.amina, 'c4', 'sold');
    await insert(farmOf.amina, 'c5', 'deceased');
    await insert(farmOf.amina, 'c6', 'archived');
    await insert(farmOf.amina, 'c7', 'lactating', true);
    const accounts = await adminListAccounts(db, 'boss') as { id: string; herd_size: number; last_paid_on: string | null; note_count: number }[];
    const amina = accounts.find((a) => a.id === 'amina')!;
    expect(amina.herd_size).toBe(3);
    expect(amina.note_count).toBe(2);
    expect(amina.last_paid_on).toBe(day(0));
    expect(accounts.find((a) => a.id === 'baraka')!.herd_size).toBe(0);
  });
});
