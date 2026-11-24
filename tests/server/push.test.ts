import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { randomBytes, randomUUID } from 'node:crypto';
import { freshDatabase } from '../db/harness';
import { acceptInvite, applyOperations, createInvite, onboard, type Db, type SessionUser } from '@/lib/server/farm-api';
import { cronAuthorized, phoneCount, removePhone, savePhone, sendMorningReminders, type PushTarget, type Sender } from '@/lib/server/push';
import { digestMessage } from '@/lib/reminder-push';
import { newInviteCode } from '@/lib/team';
import type { DigestMessage } from '@/lib/reminder-push';

const asDb = (pg: PGlite): Db => ({ query: async (text, params) => (await pg.query(text, params as never)).rows as never });
const user = (id: string): SessionUser => ({ id, email: `${id}@example.test`, name: `Name ${id}` });
const phone = (n: number | string): PushTarget => ({ endpoint: `https://push.example.test/${n}`, keys: { p256dh: 'p'.repeat(87), auth: 'a'.repeat(22) } });
const TODAY = '2026-11-24';

let pg: PGlite;
let db: Db;
let farm: string;

const reminder = (id: string, over: Record<string, unknown>) => ({
  opId: randomUUID(), groupId: randomUUID(), bucket: 'reminders' as const, recordId: id, action: 'upsert' as const, baseVersion: 0,
  data: { id, farmId: farm, type: 'vaccination', title: id, description: '', dueDate: TODAY, severity: 'medium', completed: false, createdAt: TODAY, ...over },
});

beforeAll(async () => {
  pg = await freshDatabase();
  db = asDb(pg);
  await onboard(db, user('owner'), { name: 'Owner', phone: '0700', farmName: 'Farm', county: 'Nakuru', plan: 'starter', language: 'sw' });
  farm = (await pg.query<{ farm_id: string }>(`select farm_id from public.farm_memberships where user_id = 'owner'`)).rows[0].farm_id;
  await pg.query(`update public.subscriptions set details = details || '{"plan":"farm_pro"}' where farm_id = $1`, [farm]);
  const c = newInviteCode((n) => randomBytes(n));
  await createInvite(db, 'owner', farm, 'worker', '', c);
  await acceptInvite(db, user('worker'), { name: 'Worker', phone: '0701', code: c });
  await onboard(db, user('quiet'), { name: 'Quiet', phone: '0702', farmName: 'Quiet farm', county: 'Nakuru', plan: 'starter', language: 'en' });
  await applyOperations(db, 'owner', farm, [
    reminder('Vaccinate Zawadi', {}),
    reminder('Deworm calves', { dueDate: '2026-11-20' }), // overdue
    reminder('Calving Baraka', { dueDate: '2026-12-01' }), // not yet
    reminder('Already done', { completed: true }),
    reminder('Withdrawal over', { type: 'withdrawal', dueDate: '2026-11-23' }), // its date passed: over, as on Home
    reminder('Withdrawal ends today', { type: 'withdrawal' }),
    reminder('Bill due', { type: 'payment_due' }),
  ]);
  await applyOperations(db, 'owner', farm, [{ ...reminder('Deleted one', {}), action: 'delete', data: undefined as never }]);
}, 60_000);

const due = async (day = TODAY) => (await pg.query<{ subscription_id: string; endpoint: string; language: string; reminders: { title: string }[] }>(
  'select * from public.push_digest_due($1::date)', [day])).rows;

describe('turning phone reminders on and off', () => {
  it('saves a phone for anyone on a farm, workers too, and refuses an identity with no farm or a bad address', async () => {
    await savePhone(db, 'owner', phone(1));
    await savePhone(db, 'worker', phone(2));
    expect(await phoneCount(db, 'owner')).toBe(1);
    await expect(savePhone(db, 'nobody', phone(9))).rejects.toMatchObject({ status: 403 });
    await expect(savePhone(db, 'owner', { ...phone(9), endpoint: 'http://insecure.example/9' })).rejects.toMatchObject({ status: 400 });
    await expect(savePhone(db, 'owner', { ...phone(9), keys: { p256dh: 'short', auth: 'a'.repeat(22) } })).rejects.toMatchObject({ status: 400 });
  });

  it('keeps five phones per person, and a phone saved again by someone else moves to them', async () => {
    for (let i = 10; i < 16; i++) await savePhone(db, 'quiet', phone(i));
    expect(await phoneCount(db, 'quiet')).toBe(5);
    await savePhone(db, 'owner', phone(15));
    expect(await phoneCount(db, 'quiet')).toBe(4);
    await removePhone(db, 'owner', phone(15).endpoint);
    await removePhone(db, 'owner', phone(2).endpoint); // not the owner's phone: nothing happens
    expect(await phoneCount(db, 'worker')).toBe(1);
  });
});

describe('what each phone is sent', () => {
  it('lists the reminders due today and overdue, not future, done, deleted or ended ones', async () => {
    const owner = (await due()).find((r) => r.endpoint === phone(1).endpoint)!;
    expect(owner.reminders.map((r) => r.title)).toEqual(['Deworm calves', 'Bill due', 'Vaccinate Zawadi', 'Withdrawal ends today']);
    expect(owner.language).toBe('sw');
  });

  it('never sends a worker payment reminders', async () => {
    const worker = (await due()).find((r) => r.endpoint === phone(2).endpoint)!;
    expect(worker.reminders.map((r) => r.title)).not.toContain('Bill due');
    expect(worker.reminders).toHaveLength(3);
  });

  it('sends nothing to a farm with nothing due', async () => {
    expect((await due()).some((r) => r.endpoint.endsWith('/10'))).toBe(false);
  });
});

describe('the morning job', () => {
  it('sends each phone once a day, forgets phones that are gone, and leaves other failures for tomorrow', async () => {
    await savePhone(db, 'owner', phone('gone'));
    await savePhone(db, 'owner', phone('flaky'));
    const delivered: { endpoint: string; message: DigestMessage }[] = [];
    const send: Sender = async (target, message) => {
      if (target.endpoint.endsWith('/gone')) throw Object.assign(new Error('gone'), { statusCode: 410 });
      if (target.endpoint.endsWith('/flaky')) throw Object.assign(new Error('busy'), { statusCode: 503 });
      delivered.push({ endpoint: target.endpoint, message });
    };
    expect(await sendMorningReminders(db, TODAY, send)).toEqual({ sent: 2, dropped: 1, failed: 1 });
    expect(delivered.find((d) => d.endpoint === phone(1).endpoint)!.message.title).toBe('Mylkio: vikumbusho 4 leo (1 vimechelewa)');
    expect(await pg.query(`select 1 from public.push_subscriptions where endpoint like '%/gone'`).then((r) => r.rows.length)).toBe(0);

    // Run again the same day: only the phone that failed is tried again.
    delivered.length = 0;
    expect(await sendMorningReminders(db, TODAY, send)).toEqual({ sent: 0, dropped: 0, failed: 1 });
    // The next day everyone is due again.
    expect((await sendMorningReminders(db, '2026-11-25', async (t, m) => { delivered.push({ endpoint: t.endpoint, message: m }); })).sent).toBe(3);
  });

  it('runs only with the secret Vercel Cron sends', () => {
    const secret = 'x'.repeat(32);
    expect(cronAuthorized(`Bearer ${secret}`, secret)).toBe(true);
    expect(cronAuthorized('Bearer wrong', secret)).toBe(false);
    expect(cronAuthorized(null, secret)).toBe(false);
    expect(cronAuthorized('Bearer short', 'short')).toBe(false); // a secret under 16 characters never counts
    expect(cronAuthorized('Bearer ', undefined)).toBe(false);
  });
});

describe('the words of the summary', () => {
  const r = (title: string, dueDate = TODAY) => ({ title, type: 'vaccination', dueDate });
  it('says how many, how many are overdue, and lists the first three', () => {
    expect(digestMessage([r('A')], 'en', TODAY)).toEqual({ title: 'Mylkio: 1 reminder today', body: 'A', url: '/' });
    const many = digestMessage([r('A', '2026-11-20'), r('B'), r('C'), r('D'), r('E')], 'en', TODAY);
    expect(many.title).toBe('Mylkio: 5 reminders today (1 overdue)');
    expect(many.body).toBe('A; B; C; and 2 more');
    expect(digestMessage([r('A'), r('B'), r('C'), r('D')], 'sw', TODAY).body).toBe('A; B; C; na 1 zaidi');
  });
});
