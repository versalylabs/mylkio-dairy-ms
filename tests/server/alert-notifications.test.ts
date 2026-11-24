import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { randomBytes } from 'node:crypto';
import { freshDatabase } from '../db/harness';
import { acceptInvite, createInvite, onboard, type Db, type OnboardingInput, type SessionUser } from '@/lib/server/farm-api';
import { adminCreateGroupInvite, adminCreateOfficialAlert, adminSaveGroup, adminWithdrawOfficialAlert, createOutbreakReport, joinGroup } from '@/lib/server/community-api';
import { notifyOfficialAlert, notifyOutbreak, savePhone, type Sender } from '@/lib/server/push';
import { officialMessage, outbreakMessage } from '@/lib/alert-push';
import { newGroupCode } from '@/lib/community';
import { newInviteCode } from '@/lib/team';
import type { DigestMessage } from '@/lib/reminder-push';

const asDb = (pg: PGlite): Db => ({ query: async (text, params) => (await pg.query(text, params as never)).rows as never });
const user = (id: string): SessionUser => ({ id, email: `${id}@example.test`, name: `Name ${id}` });
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());
const report = (signs: string[]) => ({ signs, animals: 2, days: 1, seenOn: today(), vetSeen: 'no' as const });

let pg: PGlite;
let db: Db;
let group: string;

async function farm(id: string, county: string, language: OnboardingInput['language'] = 'en') {
  await onboard(db, user(id), { name: `Name ${id}`, phone: '0700', farmName: `${id} farm`, county, subCounty: 'Rongai', plan: 'farm_pro', language });
  await savePhone(db, id, { endpoint: `https://push.example.test/${id}`, keys: { p256dh: 'p'.repeat(87), auth: 'a'.repeat(22) } });
}

/** A sender that records who got what. */
function recorder() {
  const got: Record<string, DigestMessage> = {};
  const send: Sender = async (target, message) => { got[target.endpoint.split('/').pop()!] = message; };
  return { got, send };
}

beforeAll(async () => {
  pg = await freshDatabase();
  db = asDb(pg);
  await pg.query(`insert into public.profiles(id, email, name, role) values ('boss', 'boss@example.test', 'Staff', 'super_admin')`);
  for (const id of ['ann', 'bob', 'cyn']) await farm(id, 'Nakuru');
  await farm('sw', 'Nakuru', 'sw');
  await farm('far', 'Kiambu'); // in the Nakuru group, but its farm is in Kiambu
  await farm('dan', 'Kiambu'); // in another group
  await onboard(db, user('quiet'), { name: 'Quiet', phone: '0700', farmName: 'Quiet farm', county: 'Nakuru', plan: 'farm_pro', language: 'en' }); // no phone
  const w = newInviteCode((n) => randomBytes(n));
  const bobFarm = (await pg.query<{ farm_id: string }>(`select farm_id from public.farm_memberships where user_id = 'bob'`)).rows[0].farm_id;
  await createInvite(db, 'bob', bobFarm, 'worker', '', w);
  await acceptInvite(db, user('bobworker'), { name: 'Bob worker', phone: '0701', code: w });
  await savePhone(db, 'bobworker', { endpoint: 'https://push.example.test/bobworker', keys: { p256dh: 'p'.repeat(87), auth: 'a'.repeat(22) } });

  group = await adminSaveGroup(db, 'boss', null, { name: 'Rongai SACCO', kind: 'sacco', county: 'Nakuru' });
  const other = await adminSaveGroup(db, 'boss', null, { name: 'Kiambu group', kind: 'area', county: 'Kiambu' });
  const c1 = newGroupCode((n) => randomBytes(n)); const c2 = newGroupCode((n) => randomBytes(n));
  await adminCreateGroupInvite(db, 'boss', group, { role: 'member', label: '', maxUses: 50, days: 30 }, c1);
  await adminCreateGroupInvite(db, 'boss', other, { role: 'member', label: '', maxUses: 50, days: 30 }, c2);
  for (const id of ['ann', 'bob', 'cyn', 'sw', 'far', 'quiet']) await joinGroup(db, id, c1);
  await joinGroup(db, 'dan', c2);
}, 120_000);

describe('an official alert', () => {
  it('reaches every phone of every farm in a group of that county, in each farm\'s language, and no other', async () => {
    const id = await adminCreateOfficialAlert(db, 'boss', { county: 'Nakuru', title: 'FMD confirmed in Rongai', body: 'Do not move cattle.', sourceName: 'Nakuru County Vet', sourceDate: today(), days: 30 });
    const { got, send } = recorder();
    expect(await notifyOfficialAlert(db, { id, title: 'FMD confirmed in Rongai', sourceName: 'Nakuru County Vet' }, send)).toEqual({ sent: 6, dropped: 0, failed: 0 });
    expect(Object.keys(got).sort()).toEqual(['ann', 'bob', 'bobworker', 'cyn', 'far', 'sw']);
    expect(got.ann).toMatchObject({ title: 'Official alert: FMD confirmed in Rongai', tag: `mylkio-official-${id}` });
    expect(got.sw.title).toBe('Tahadhari rasmi: FMD confirmed in Rongai');
  });

  it('reaches nobody once withdrawn', async () => {
    const id = await adminCreateOfficialAlert(db, 'boss', { county: 'Nakuru', title: 'Withdrawn alert', body: 'x', sourceName: 'Vet', sourceDate: today(), days: 30 });
    await adminWithdrawOfficialAlert(db, 'boss', id);
    expect((await notifyOfficialAlert(db, { id, title: 'Withdrawn alert', sourceName: 'Vet' }, recorder().send)).sent).toBe(0);
  });

  it('forgets a phone the push service says is gone', async () => {
    const id = await adminCreateOfficialAlert(db, 'boss', { county: 'Kiambu', title: 'Kiambu alert', body: 'x', sourceName: 'Vet', sourceDate: today(), days: 30 });
    const gone: Sender = async () => { throw Object.assign(new Error('gone'), { statusCode: 410 }); };
    expect(await notifyOfficialAlert(db, { id, title: 'Kiambu alert', sourceName: 'Vet' }, gone)).toEqual({ sent: 0, dropped: 1, failed: 0 });
    expect((await pg.query(`select 1 from public.push_subscriptions where endpoint like '%/dan'`)).rows).toHaveLength(0);
  });
});

describe('an outbreak report', () => {
  it('reaches the group\'s other farms in the same county, not the reporter, not a farm in another county', async () => {
    const id = await createOutbreakReport(db, 'ann', group, report(['blisters_mouth']));
    const { got, send } = recorder();
    expect((await notifyOutbreak(db, id, send)).sent).toBe(4);
    expect(Object.keys(got).sort()).toEqual(['bob', 'bobworker', 'cyn', 'sw']);
    expect(got.bob.title).toBe('Outbreak alert: Rongai');
    expect(got.bob.body).toMatch(/^Rongai SACCO: a farm reports Blisters or sores in the mouth/);
    expect(got.bob.body).toMatch(/not a diagnosis/);
    expect(got.sw.title).toBe('Tahadhari ya mlipuko: Rongai');
  });

  it('does not ring phones again for the same sign in the same area, only for a new one', async () => {
    const again = await createOutbreakReport(db, 'bob', group, report(['blisters_mouth']));
    expect((await notifyOutbreak(db, again, recorder().send)).sent).toBe(0);
    const mixed = await createOutbreakReport(db, 'cyn', group, report(['blisters_mouth', 'cough']));
    const { got, send } = recorder();
    await notifyOutbreak(db, mixed, send);
    expect(Object.keys(got).sort()).toEqual(['ann', 'bob', 'bobworker', 'sw']);
    expect(got.ann.body).toMatch(/Coughing/);
    expect(got.ann.body).not.toMatch(/Blisters/);
  });
});

describe('the words', () => {
  it('keep a long title short and list more than one new sign', () => {
    expect(officialMessage({ id: 'x', title: 'A'.repeat(200), sourceName: 'S' }, 'en').title.length).toBeLessThanOrEqual(100);
    expect(outbreakMessage('Rongai', 'G', ['cough', 'lameness', 'not_eating'], 'en').body).toMatch(/Coughing; and 2 more/);
    expect(outbreakMessage('Rongai', 'G', ['cough', 'lameness'], 'sw').body).toMatch(/Coughing; na 1 zaidi/);
  });
});
