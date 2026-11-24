import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { randomBytes } from 'node:crypto';
import { freshDatabase } from '../db/harness';
import { acceptInvite, createInvite, onboard, type Db, type OnboardingInput, type SessionUser } from '@/lib/server/farm-api';
import {
  adminCreateGroupInvite, adminCreateOfficialAlert, adminListFlags, adminListOfficialAlerts, adminResolveFlags, adminSaveGroup, adminWithdrawOfficialAlert,
  createOutbreakReport, createPost, createReply, flagItem, groupAlerts, groupFeed, groupMembersForAdmin, joinGroup, markGroupRead, moderateRemoveItem,
  moderateRemoveMember, myGroups, myOfficialAlerts, type OfficialAlertInput,
} from '@/lib/server/community-api';
import { newGroupCode } from '@/lib/community';
import { newInviteCode } from '@/lib/team';

const asDb = (pg: PGlite): Db => ({ query: async (text, params) => (await pg.query(text, params as never)).rows as never });
const user = (id: string): SessionUser => ({ id, email: `${id}@example.test`, name: `Name ${id}` });
const code = () => newGroupCode((n) => randomBytes(n));
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());

let pg: PGlite;
let db: Db;
const farmIds: Record<string, string> = {};
const count = async (sql: string, params: unknown[] = []) => (await pg.query<{ n: number }>(sql, params as never)).rows[0].n;

async function makeFarm(id: string, plan: OnboardingInput['plan'], county = 'Nakuru') {
  await onboard(db, user(id), { name: `Name ${id}`, phone: '0700000000', farmName: `${id} farm`, county, subCounty: 'Rongai', plan, language: 'en' });
  farmIds[id] = (await pg.query<{ farm_id: string }>('select farm_id from public.farm_memberships where user_id = $1', [id])).rows[0].farm_id;
}
async function makeGroup(name: string, county = 'Nakuru') {
  const id = await adminSaveGroup(db, 'boss', null, { name, kind: 'sacco', county });
  const admin = code(); const member = code();
  await adminCreateGroupInvite(db, 'boss', id, { role: 'admin', label: '', maxUses: 5, days: 30 }, admin);
  await adminCreateGroupInvite(db, 'boss', id, { role: 'member', label: '', maxUses: 50, days: 30 }, member);
  return { id, admin, member };
}
const alert = (over: Partial<OfficialAlertInput> = {}): OfficialAlertInput => ({
  county: 'Nakuru', title: 'Foot-and-mouth confirmed in Rongai', body: 'The county has confirmed FMD. Do not move cattle.',
  sourceName: 'Nakuru County Veterinary Services', sourceUrl: 'https://nakuru.go.ke/notice', sourceDate: today(), days: 30, ...over,
});

let g: { id: string; admin: string; member: string };
let other: { id: string; admin: string; member: string };

beforeAll(async () => {
  pg = await freshDatabase();
  db = asDb(pg);
  await pg.query(`insert into public.profiles(id, email, name, role) values ('boss', 'boss@example.test', 'Staff', 'super_admin')`);
  for (const id of ['ann', 'bob', 'cyn', 'dan', 'outsider']) await makeFarm(id, 'farm_pro');
  await makeFarm('eve', 'farm_pro', 'Kiambu');
  const w = newInviteCode((n) => randomBytes(n));
  await createInvite(db, 'bob', farmIds.bob, 'worker', '', w);
  await acceptInvite(db, user('bob-worker'), { name: 'Bob worker', phone: '0700000001', code: w });

  g = await makeGroup('Rongai Dairy SACCO');
  await joinGroup(db, 'ann', g.admin);
  for (const id of ['bob', 'cyn', 'dan']) await joinGroup(db, id, g.member);
  other = await makeGroup('Kiambu Group', 'Kiambu');
  await joinGroup(db, 'eve', other.member);
}, 120_000);

describe('reporting a post to staff', () => {
  it('puts a reported post in the staff queue with its text, writer and reasons, one report per farm', async () => {
    const post = await createPost(db, 'bob', g.id, 'Farm X down the road has foot-and-mouth');
    await createPost(db, 'bob', g.id, 'A private sentence nobody reported');
    await flagItem(db, 'cyn', { postId: post }, 'rumour');
    await flagItem(db, 'cyn', { postId: post }, 'abuse'); // the same farm again: still one report
    await flagItem(db, 'dan', { postId: post }, 'private');
    const queue = await adminListFlags(db, 'boss');
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ postId: post, replyId: null, groupName: 'Rongai Dairy SACCO', authorName: 'Name bob', farmName: 'bob farm', reports: 2 });
    expect(queue[0].reasons.sort()).toEqual(['private', 'rumour']);
    // Staff see only what was reported.
    expect(JSON.stringify(queue)).not.toContain('private sentence');
  });

  it('lets a worker report, but not a farm\'s own post, an outsider, or an outbreak report', async () => {
    const post = await createPost(db, 'ann', g.id, 'Selling hay');
    await flagItem(db, 'bob-worker', { postId: post }, 'spam');
    await expect(flagItem(db, 'ann', { postId: post }, 'spam')).rejects.toMatchObject({ status: 400 });
    await expect(flagItem(db, 'outsider', { postId: post }, 'spam')).rejects.toMatchObject({ status: 403 });
    await expect(flagItem(db, 'eve', { postId: post }, 'spam')).rejects.toMatchObject({ status: 403 });
    await expect(flagItem(db, 'cyn', { postId: post }, 'nonsense' as never)).rejects.toMatchObject({ status: 400 });
    const report = await createOutbreakReport(db, 'bob', g.id, { signs: ['cough'], animals: 1, days: 1, seenOn: today(), vetSeen: 'no' });
    await expect(flagItem(db, 'cyn', { postId: report }, 'rumour')).rejects.toMatchObject({ status: 403 });
  });

  it('can report a reply too', async () => {
    const post = await createPost(db, 'cyn', g.id, 'Question');
    const reply = await createReply(db, 'bob', post, 'A rude reply');
    await flagItem(db, 'cyn', { replyId: reply }, 'abuse');
    expect((await adminListFlags(db, 'boss')).some((f) => f.replyId === reply && f.body === 'A rude reply')).toBe(true);
  });

  it('keeps reports to twenty a day per farm', async () => {
    // 21 posts from Ann, inserted directly (posting itself is limited to 10 an hour).
    const posts = (await pg.query<{ id: string }>(`insert into public.group_posts(group_id, farm_id, author_id, body)
      select $1, $2, 'ann', 'post ' || n from generate_series(1, 21) n returning id`, [g.id, farmIds.ann])).rows.map((r) => r.id);
    await pg.query(`delete from public.group_flags where farm_id = $1`, [farmIds.dan]);
    for (let i = 0; i < 20; i++) await flagItem(db, 'dan', { postId: posts[i] }, 'spam');
    await expect(flagItem(db, 'dan', { postId: posts[20] }, 'spam')).rejects.toMatchObject({ status: 429 });
  });

  it('lets only staff see and settle the queue: keep closes the reports, remove deletes the post', async () => {
    await expect(adminListFlags(db, 'ann')).rejects.toMatchObject({ status: 403 });
    const queue = await adminListFlags(db, 'boss');
    const rumour = queue.find((f) => f.body.startsWith('Farm X'))!;
    const spam = queue.find((f) => f.body === 'Selling hay')!;
    await expect(adminResolveFlags(db, 'ann', { postId: spam.postId! }, 'keep')).rejects.toMatchObject({ status: 403 });
    await adminResolveFlags(db, 'boss', { postId: spam.postId! }, 'keep');
    await adminResolveFlags(db, 'boss', { postId: rumour.postId! }, 'remove');
    const after = await adminListFlags(db, 'boss');
    expect(after.find((f) => f.postId === spam.postId || f.postId === rumour.postId)).toBeUndefined();
    expect(await count(`select count(*)::int as n from public.group_posts where id = $1`, [spam.postId])).toBe(1);
    expect(await count(`select count(*)::int as n from public.group_posts where id = $1`, [rumour.postId])).toBe(0);
    await expect(adminResolveFlags(db, 'boss', { postId: spam.postId! }, 'keep')).rejects.toMatchObject({ status: 400 });
    expect(await count(`select count(*)::int as n from public.audit_logs where action like 'community.flags.%'`)).toBe(2);
  });
});

describe('the group admin\'s tools', () => {
  it('lets the admin remove a post or a reply in the group, and nobody else', async () => {
    const post = await createPost(db, 'bob', g.id, 'Off topic');
    const keep = await createPost(db, 'cyn', g.id, 'Keep me');
    const reply = await createReply(db, 'bob', keep, 'Bad reply');
    for (const actor of ['bob', 'cyn', 'bob-worker', 'outsider', 'boss']) {
      await expect(moderateRemoveItem(db, actor, g.id, { postId: post }), actor).rejects.toMatchObject({ status: 403 });
    }
    await moderateRemoveItem(db, 'ann', g.id, { postId: post });
    await moderateRemoveItem(db, 'ann', g.id, { replyId: reply });
    expect(await count(`select count(*)::int as n from public.group_posts where id = $1`, [post])).toBe(0);
    expect(await count(`select count(*)::int as n from public.group_replies where id = $1`, [reply])).toBe(0);
    expect(await count(`select count(*)::int as n from public.group_posts where id = $1`, [keep])).toBe(1);
    expect(await count(`select count(*)::int as n from public.audit_logs where action = 'community.moderate.remove' and farm_id = $1`, [farmIds.ann])).toBe(2);
  });

  it('cannot remove something in another group, or an outbreak report', async () => {
    const elsewhere = await createPost(db, 'eve', other.id, 'In Kiambu');
    await expect(moderateRemoveItem(db, 'ann', g.id, { postId: elsewhere })).rejects.toMatchObject({ status: 400 });
    const { rows } = await pg.query<{ id: string }>(`select id from public.group_posts where kind = 'outbreak' and group_id = $1 limit 1`, [g.id]);
    await expect(moderateRemoveItem(db, 'ann', g.id, { postId: rows[0].id })).rejects.toMatchObject({ status: 400 });
  });

  it('shows the admin the member farms and lets them take a member out, but not themselves or another admin', async () => {
    expect((await groupMembersForAdmin(db, 'ann', g.id)).map((m) => m.farmName).sort()).toEqual(['ann farm', 'bob farm', 'cyn farm', 'dan farm']);
    await expect(groupMembersForAdmin(db, 'bob', g.id)).rejects.toMatchObject({ status: 403 });
    await expect(moderateRemoveMember(db, 'ann', g.id, farmIds.ann)).rejects.toMatchObject({ status: 400 });
    await expect(moderateRemoveMember(db, 'bob', g.id, farmIds.dan)).rejects.toMatchObject({ status: 403 });
    await moderateRemoveMember(db, 'ann', g.id, farmIds.dan);
    await expect(groupFeed(db, 'dan', g.id)).rejects.toMatchObject({ status: 403 });
    await joinGroup(db, 'dan', g.member);
  });
});

describe('official alerts', () => {
  let id: string;

  it('lets only staff post one, with a source, and checks what it holds', async () => {
    await expect(adminCreateOfficialAlert(db, 'ann', alert())).rejects.toMatchObject({ status: 403 });
    for (const bad of [{ title: 'ab' }, { body: '' }, { sourceName: 'x' }, { sourceUrl: 'http://not-secure.example' }, { sourceDate: '2099-01-01' }, { days: 0 }, { days: 91 }, { county: 'K' }]) {
      await expect(adminCreateOfficialAlert(db, 'boss', alert(bad)), JSON.stringify(bad)).rejects.toMatchObject({ status: 400 });
    }
    id = await adminCreateOfficialAlert(db, 'boss', alert());
    await adminCreateOfficialAlert(db, 'boss', alert({ sourceUrl: undefined, title: 'No link alert' }));
  });

  it('shows it pinned in every group of that county, including a group made later, and on those farms\' Home', async () => {
    const view = await groupAlerts(db, 'cyn', g.id);
    expect(view.official.map((a) => a.title)).toContain('Foot-and-mouth confirmed in Rongai');
    expect(view.official[0]).toMatchObject({ sourceName: 'Nakuru County Veterinary Services' });
    expect((await groupAlerts(db, 'eve', other.id)).official).toEqual([]);
    const later = await makeGroup('Later Nakuru group', 'nakuru ');
    await joinGroup(db, 'outsider', later.member);
    expect((await groupAlerts(db, 'outsider', later.id)).official.length).toBe(2);
    expect((await myOfficialAlerts(db, 'bob-worker')).map((a) => a.id)).toContain(id);
    expect(await myOfficialAlerts(db, 'eve')).toEqual([]);
    expect((await adminListOfficialAlerts(db, 'boss')).find((a) => a.id === id)).toMatchObject({ active: true, groups: 2 });
  });

  it('stops showing it once withdrawn or expired', async () => {
    await expect(adminWithdrawOfficialAlert(db, 'ann', id)).rejects.toMatchObject({ status: 403 });
    await adminWithdrawOfficialAlert(db, 'boss', id);
    expect((await groupAlerts(db, 'cyn', g.id)).official.map((a) => a.id)).not.toContain(id);
    await expect(adminWithdrawOfficialAlert(db, 'boss', id)).rejects.toMatchObject({ status: 400 });
    await pg.query(`update public.official_alerts set expires_at = now() - interval '1 minute'`);
    expect((await groupAlerts(db, 'cyn', g.id)).official).toEqual([]);
    expect(await myOfficialAlerts(db, 'cyn')).toEqual([]);
  });
});

describe('unread counts', () => {
  it('counts other farms\' posts and new official alerts since a person last opened the group, per person', async () => {
    await pg.query('delete from public.group_posts where group_id = $1', [g.id]);
    for (const actor of ['ann', 'bob', 'bob-worker', 'cyn']) await markGroupRead(db, actor, g.id);
    const unread = async (actor: string) => (await myGroups(db, actor)).groups.find((x) => x.id === g.id)!.unread;
    expect(await unread('cyn')).toBe(0);

    await createPost(db, 'bob', g.id, 'one');
    await createPost(db, 'bob', g.id, 'two');
    await adminCreateOfficialAlert(db, 'boss', alert({ title: 'A new official alert' }));
    expect(await unread('cyn')).toBe(3);
    expect(await unread('bob')).toBe(1); // his own farm's posts do not count
    expect(await unread('bob-worker')).toBe(1);

    await markGroupRead(db, 'cyn', g.id);
    expect(await unread('cyn')).toBe(0);
    expect(await unread('ann')).toBe(3); // each person has their own count
    await expect(markGroupRead(db, 'eve', g.id)).rejects.toMatchObject({ status: 403 });
  });
});
