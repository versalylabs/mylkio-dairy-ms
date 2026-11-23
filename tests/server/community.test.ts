import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { randomBytes } from 'node:crypto';
import { freshDatabase } from '../db/harness';
import { acceptInvite, createInvite, onboard, type Db, type OnboardingInput, type SessionUser } from '@/lib/server/farm-api';
import {
  adminCreateGroupInvite, adminGroupInvites, adminGroupMembers, adminListGroups, adminRemoveGroupMember, adminRevokeGroupInvite, adminSaveGroup,
  createPost, createReply, deletePost, deleteReply, groupFeed, joinGroup, leaveGroup, myGroups, postThread, BAD_INVITE, COMMUNITY_PLAN_MESSAGE,
} from '@/lib/server/community-api';
import { ACCOUNT_MAX_ATTEMPTS, withAttemptLimit } from '@/lib/server/attempts';
import { ApiError } from '@/lib/server/errors';
import { COMMUNITY_LIMITS, communityIncluded, groupLink, newGroupCode, normaliseGroupCode } from '@/lib/community';
import { newInviteCode } from '@/lib/team';

const asDb = (pg: PGlite): Db => ({ query: async (text, params) => (await pg.query(text, params as never)).rows as never });
const user = (id: string): SessionUser => ({ id, email: `${id}@example.test`, name: `Name ${id}` });
const details = (plan: OnboardingInput['plan'], farmName = 'Farm', name = 'Owner'): OnboardingInput => ({ name, phone: '0712345678', farmName, county: 'Nakuru', plan, language: 'en' });
const code = () => newGroupCode((n) => randomBytes(n));

let pg: PGlite;
let db: Db;
const farmIds: Record<string, string> = {};
const farmOf = async (id: string) => (await pg.query<{ farm_id: string }>('select farm_id from public.farm_memberships where user_id = $1', [id])).rows[0].farm_id;
const setSubscription = (actor: string, patch: Record<string, unknown>) =>
  pg.query(`update public.subscriptions set details = details || $2::jsonb where farm_id = (select farm_id from public.farm_memberships where user_id = $1)`, [actor, JSON.stringify(patch)]);

/** Staff make a group and an invitation, and return the code. */
async function groupWithInvite(name: string, extra: { role?: 'member' | 'admin'; maxUses?: number; days?: number } = {}) {
  const id = await adminSaveGroup(db, 'boss', null, { name, kind: 'sacco', county: 'Nakuru', description: 'Test group' });
  const c = code();
  await adminCreateGroupInvite(db, 'boss', id, { role: extra.role ?? 'member', label: 'test', maxUses: extra.maxUses ?? 50, days: extra.days ?? 30 }, c);
  return { id, code: c };
}

beforeAll(async () => {
  pg = await freshDatabase();
  db = asDb(pg);
  for (const id of ['ann', 'bob', 'cyn', 'dan', 'eve', 'witness']) await onboard(db, user(id), details('farm_pro', `${id} farm`, `Name ${id}`));
  await onboard(db, user('small'), details('farmer', 'Small farm'));
  await onboard(db, user('custom'), details('farm_pro', 'Custom farm'));
  await setSubscription('custom', { plan: 'custom' });
  await pg.query(`insert into public.profiles(id, email, name, role) values ('boss', 'boss@example.test', 'Staff', 'super_admin')`);
  for (const id of ['ann', 'bob', 'cyn', 'dan', 'eve', 'small', 'custom']) farmIds[id] = await farmOf(id);
  // Ann's farm also has a manager and a worker.
  for (const [id, role] of [['ann-manager', 'manager'], ['ann-worker', 'worker']] as const) {
    const c = newInviteCode((n) => randomBytes(n));
    await createInvite(db, 'ann', farmIds.ann, role, '', c);
    await acceptInvite(db, user(id), { name: id, phone: '0700000000', code: c });
  }
}, 60_000);

describe('the plan check', () => {
  it('lets Farm Pro and Custom farms in, and keeps Starter and Farmer farms out, on the server', async () => {
    await expect(myGroups(db, 'ann')).resolves.toMatchObject({ canPost: true, groups: [] });
    await expect(myGroups(db, 'custom')).resolves.toMatchObject({ groups: [] });
    await expect(myGroups(db, 'small')).rejects.toMatchObject({ status: 403, message: COMMUNITY_PLAN_MESSAGE });
  });

  it('pauses Community when the trial has ended, a payment is over 7 days late or the plan is cancelled', async () => {
    const day = 86_400_000;
    const at = (days: number) => new Date(Date.now() + days * day).toISOString();
    for (const patch of [
      { status: 'trial', renewsAt: at(-1) }, { status: 'active', renewsAt: at(-8) }, { status: 'cancelled', renewsAt: at(10) },
    ]) {
      await setSubscription('dan', patch);
      await expect(myGroups(db, 'dan'), JSON.stringify(patch)).rejects.toMatchObject({ status: 403 });
    }
    await setSubscription('dan', { status: 'active', renewsAt: at(-3) }); // inside the 7-day grace
    await expect(myGroups(db, 'dan')).resolves.toMatchObject({ groups: [] });
    await setSubscription('dan', { status: 'trial', renewsAt: at(5) });
  });

  it('agrees with featuresFor() in the app for every kind of subscription', async () => {
    const day = 86_400_000;
    const at = (days: number) => new Date(Date.now() + days * day).toISOString();
    const plans = ['starter', 'farmer', 'farm_pro', 'custom'];
    const cases = [{ status: 'trial', d: 5 }, { status: 'trial', d: -1 }, { status: 'active', d: 20 }, { status: 'active', d: -3 }, { status: 'active', d: -9 }, { status: 'past_due', d: -3 }, { status: 'past_due', d: -9 }, { status: 'cancelled', d: 20 }];
    for (const plan of plans) {
      for (const c of cases) {
        const sub = { plan, status: c.status, renewsAt: at(c.d) };
        const { rows } = await pg.query<{ ok: boolean }>('select public.community_allowed($1::jsonb) as ok', [JSON.stringify(sub)]);
        expect(rows[0].ok, JSON.stringify(sub)).toBe(communityIncluded(sub));
      }
    }
  });

  it('refuses a person with no farm, and an administrator, since staff do not read groups', async () => {
    await expect(myGroups(db, 'nobody')).rejects.toMatchObject({ status: 403 });
    await expect(myGroups(db, 'boss')).rejects.toMatchObject({ status: 403 });
  });
});

describe('staff make groups and invitations', () => {
  it('only an administrator can create a group, an invitation or see the lists', async () => {
    await expect(adminSaveGroup(db, 'ann', null, { name: 'Sneaky', kind: 'area', county: 'Nakuru' })).rejects.toMatchObject({ status: 403 });
    const id = await adminSaveGroup(db, 'boss', null, { name: 'Rongai Dairy SACCO', kind: 'sacco', county: 'Nakuru', description: 'Members around Rongai' });
    await expect(adminCreateGroupInvite(db, 'ann', id, { role: 'member', label: '', maxUses: 5, days: 7 }, code())).rejects.toMatchObject({ status: 403 });
    await expect(adminListGroups(db, 'ann')).rejects.toMatchObject({ status: 403 });
    await expect(adminGroupMembers(db, 'ann', id)).rejects.toMatchObject({ status: 403 });
    expect((await adminListGroups(db, 'boss')).map((g) => g.name)).toContain('Rongai Dairy SACCO');
  });

  it('refuses a group or an invitation with bad details', async () => {
    await expect(adminSaveGroup(db, 'boss', null, { name: 'ab', kind: 'sacco', county: 'Nakuru' })).rejects.toMatchObject({ status: 400 });
    await expect(adminSaveGroup(db, 'boss', null, { name: 'Fine name', kind: 'club' as never, county: 'Nakuru' })).rejects.toMatchObject({ status: 400 });
    const id = await adminSaveGroup(db, 'boss', null, { name: 'Bad invites group', kind: 'area', county: 'Nakuru' });
    for (const bad of [{ maxUses: 0, days: 7 }, { maxUses: 301, days: 7 }, { maxUses: 5, days: 0 }, { maxUses: 5, days: 61 }]) {
      await expect(adminCreateGroupInvite(db, 'boss', id, { role: 'member', label: '', ...bad }, code()), JSON.stringify(bad)).rejects.toMatchObject({ status: 400 });
    }
    await expect(adminCreateGroupInvite(db, 'boss', id, { role: 'member', label: '', maxUses: 5, days: 7 }, 'short')).rejects.toMatchObject({ status: 400 });
  });

  it('keeps only a hash of the code, never the code', async () => {
    const g = await groupWithInvite('Hash check group');
    const { rows } = await pg.query<{ token_hash: string }>('select token_hash from public.group_invites where group_id = $1', [g.id]);
    expect(rows[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(rows)).not.toContain(normaliseGroupCode(g.code));
  });

  it('builds a link that opens the Community screen with the code filled in', () => {
    expect(groupLink('https://mylkio-dairy-ms.vercel.app/', 'ABCDE-FGHJK')).toBe('https://mylkio-dairy-ms.vercel.app/?community=ABCDE-FGHJK');
  });
});

describe('joining a group', () => {
  it('lets the owner or a manager join, and a worker is refused', async () => {
    const g = await groupWithInvite('Joining group');
    await expect(joinGroup(db, 'ann-worker', g.code)).rejects.toMatchObject({ status: 403 });
    expect((await joinGroup(db, 'ann-manager', g.code))).toBe(g.id);
    // The manager joined the farm, so the owner and the worker of that farm are in too.
    expect((await myGroups(db, 'ann')).groups.map((x) => x.id)).toContain(g.id);
    expect((await myGroups(db, 'ann-worker')).groups.map((x) => x.id)).toContain(g.id);
    expect((await myGroups(db, 'ann-worker')).canPost).toBe(false);
  });

  it('refuses a wrong, expired, withdrawn or used-up code with one message that says nothing about why', async () => {
    await expect(joinGroup(db, 'bob', 'ZZZZZ-ZZZZZ')).rejects.toMatchObject({ status: 400, message: BAD_INVITE });

    const expired = await groupWithInvite('Expired group');
    await pg.query(`update public.group_invites set expires_at = now() - interval '1 minute' where group_id = $1`, [expired.id]);
    await expect(joinGroup(db, 'bob', expired.code)).rejects.toMatchObject({ status: 400, message: BAD_INVITE });

    const withdrawn = await groupWithInvite('Withdrawn group');
    const [invite] = await adminGroupInvites(db, 'boss', withdrawn.id);
    await adminRevokeGroupInvite(db, 'boss', invite.id);
    await expect(joinGroup(db, 'bob', withdrawn.code)).rejects.toMatchObject({ status: 400, message: BAD_INVITE });

    const once = await groupWithInvite('One use group', { maxUses: 1 });
    await joinGroup(db, 'bob', once.code);
    await expect(joinGroup(db, 'cyn', once.code)).rejects.toMatchObject({ status: 400, message: BAD_INVITE });
    expect((await adminGroupInvites(db, 'boss', once.id))).toEqual([]);
  });

  it('refuses an archived group, and a farm whose plan lacks Community', async () => {
    const archived = await groupWithInvite('Archived group');
    await adminSaveGroup(db, 'boss', archived.id, { name: 'Archived group', kind: 'sacco', county: 'Nakuru', archived: true });
    await expect(joinGroup(db, 'bob', archived.code)).rejects.toMatchObject({ status: 400 });
    const g = await groupWithInvite('Plan group');
    await expect(joinGroup(db, 'small', g.code)).rejects.toMatchObject({ status: 403, message: COMMUNITY_PLAN_MESSAGE });
  });

  it('does not use up the invitation when the farm is already in, and an admin invitation makes the farm an admin', async () => {
    const g = await groupWithInvite('Repeat group', { maxUses: 2 });
    await joinGroup(db, 'cyn', g.code);
    await joinGroup(db, 'cyn', g.code);
    expect((await adminGroupInvites(db, 'boss', g.id))[0].uses).toBe(1);
    const adminCode = code();
    await adminCreateGroupInvite(db, 'boss', g.id, { role: 'admin', label: 'first admin', maxUses: 1, days: 7 }, adminCode);
    await joinGroup(db, 'cyn', adminCode);
    expect((await myGroups(db, 'cyn')).groups.find((x) => x.id === g.id)?.role).toBe('admin');
  });

  it('keeps a group to 300 farms and a farm to 5 groups', async () => {
    const full = await groupWithInvite('Full group');
    const { rows } = await pg.query<{ id: string }>(`insert into public.farms(data) select '{}'::jsonb from generate_series(1, ${COMMUNITY_LIMITS.membersPerGroup}) returning id`);
    await pg.query(`insert into public.group_members(group_id, farm_id) select $1, unnest($2::uuid[])`, [full.id, rows.map((r) => r.id)]);
    await expect(joinGroup(db, 'eve', full.code)).rejects.toMatchObject({ status: 409, message: 'This group is full.' });

    for (let i = 1; i <= COMMUNITY_LIMITS.groupsPerFarm; i++) {
      const g = await groupWithInvite(`Limit group ${i}`);
      await joinGroup(db, 'eve', g.code);
    }
    const sixth = await groupWithInvite('Limit group 6');
    await expect(joinGroup(db, 'eve', sixth.code)).rejects.toMatchObject({ status: 409, message: expect.stringContaining('up to 5 groups') });
    // Leaving one makes room again.
    const mine = (await myGroups(db, 'eve')).groups;
    await leaveGroup(db, 'eve', mine[0].id, false);
    await joinGroup(db, 'eve', sixth.code);
  });

  it('holds an account after too many wrong codes, with the same limit as team invitations', async () => {
    const g = await groupWithInvite('Guess group');
    const wrongCode = (error: unknown) => error instanceof ApiError && error.status === 400;
    for (let i = 0; i < ACCOUNT_MAX_ATTEMPTS; i++) {
      await expect(withAttemptLimit(db, 'dan', null, 'join', wrongCode, () => joinGroup(db, 'dan', newGroupCode((n) => randomBytes(n))))).rejects.toMatchObject({ status: 400 });
    }
    await expect(withAttemptLimit(db, 'dan', null, 'join', wrongCode, () => joinGroup(db, 'dan', g.code))).rejects.toMatchObject({ status: 429 });
  });
});

describe('the discussion', () => {
  let group: string;
  let postId: string;

  beforeAll(async () => {
    const g = await groupWithInvite('Discussion group');
    group = g.id;
    await joinGroup(db, 'ann', g.code);
    await joinGroup(db, 'bob', g.code);
  });

  it('lets members post and reply, and shows who wrote it', async () => {
    postId = await createPost(db, 'ann', group, '  Anyone selling hay near Rongai?  ');
    await createReply(db, 'bob', postId, 'Yes, call me.');
    const feed = await groupFeed(db, 'bob', group);
    expect(feed.group).toMatchObject({ name: 'Discussion group', role: 'member', members: 2 });
    expect(feed.canPost).toBe(true);
    expect(feed.posts).toHaveLength(1);
    expect(feed.posts[0]).toMatchObject({ body: 'Anyone selling hay near Rongai?', authorName: 'Name ann', farmName: 'ann farm', mine: false, replyCount: 1, kind: 'discussion' });
    const thread = await postThread(db, 'ann', postId);
    expect(thread.post).toMatchObject({ mine: true, groupId: group });
    expect(thread.replies).toEqual([expect.objectContaining({ body: 'Yes, call me.', authorName: 'Name bob', farmName: 'bob farm', mine: false })]);
  });

  it('lets a worker read but never write', async () => {
    const feed = await groupFeed(db, 'ann-worker', group);
    expect(feed.canPost).toBe(false);
    expect(feed.posts).toHaveLength(1);
    await expect(createPost(db, 'ann-worker', group, 'Hello')).rejects.toMatchObject({ status: 403 });
    await expect(createReply(db, 'ann-worker', postId, 'Hello')).rejects.toMatchObject({ status: 403 });
    await expect(deletePost(db, 'ann-worker', postId)).rejects.toMatchObject({ status: 403 });
  });

  it('keeps a group private to its member farms', async () => {
    await expect(groupFeed(db, 'cyn', group)).rejects.toMatchObject({ status: 403 });
    await expect(postThread(db, 'cyn', postId)).rejects.toMatchObject({ status: 403 });
    await expect(createPost(db, 'cyn', group, 'Let me in')).rejects.toMatchObject({ status: 403 });
    await expect(createReply(db, 'cyn', postId, 'Let me in')).rejects.toMatchObject({ status: 403 });
    await expect(groupFeed(db, 'small', group)).rejects.toMatchObject({ status: 403 });
    await expect(groupFeed(db, 'boss', group)).rejects.toMatchObject({ status: 403 });
  });

  it('keeps the post and reply sizes to the limits, and refuses empty ones', async () => {
    await createPost(db, 'bob', group, 'x'.repeat(COMMUNITY_LIMITS.postChars));
    await expect(createPost(db, 'bob', group, 'x'.repeat(COMMUNITY_LIMITS.postChars + 1))).rejects.toMatchObject({ status: 400 });
    await expect(createPost(db, 'bob', group, '   ')).rejects.toMatchObject({ status: 400 });
    await createReply(db, 'bob', postId, 'y'.repeat(COMMUNITY_LIMITS.replyChars));
    await expect(createReply(db, 'bob', postId, 'y'.repeat(COMMUNITY_LIMITS.replyChars + 1))).rejects.toMatchObject({ status: 400 });
    await expect(createReply(db, 'bob', postId, '')).rejects.toMatchObject({ status: 400 });
  });

  it('limits posts and replies per farm per hour, then lets them through again', async () => {
    await pg.query(`delete from public.group_posts where farm_id = $1`, [farmIds.bob]);
    for (let i = 0; i < COMMUNITY_LIMITS.postsPerHour; i++) await createPost(db, 'bob', group, `post ${i}`);
    await expect(createPost(db, 'bob', group, 'one too many')).rejects.toMatchObject({ status: 429 });
    await pg.query(`update public.group_posts set created_at = now() - interval '2 hours' where farm_id = $1`, [farmIds.bob]);
    await createPost(db, 'bob', group, 'back again');

    await pg.query(`delete from public.group_replies where farm_id = $1`, [farmIds.bob]);
    for (let i = 0; i < COMMUNITY_LIMITS.repliesPerHour; i++) await createReply(db, 'bob', postId, `reply ${i}`);
    await expect(createReply(db, 'bob', postId, 'one too many')).rejects.toMatchObject({ status: 429 });
  });

  it('pages through older posts', async () => {
    await pg.query(`delete from public.group_posts where group_id = $1`, [group]);
    await pg.query(`insert into public.group_posts(group_id, farm_id, body, created_at)
                    select $1, $2, 'older ' || n, now() - make_interval(mins => n * 70) from generate_series(1, 35) n`, [group, farmIds.ann]);
    const first = await groupFeed(db, 'ann', group);
    expect(first.posts).toHaveLength(30);
    expect(first.more).toBe(true);
    expect(first.posts[0].body).toBe('older 1');
    const next = await groupFeed(db, 'ann', group, first.posts[29].createdAt);
    expect(next.posts.map((p) => p.body)).toEqual(['older 31', 'older 32', 'older 33', 'older 34', 'older 35']);
    expect(next.more).toBe(false);
  });

  it('lets a farm delete only what it wrote, and a post takes its replies with it', async () => {
    const mine = await createPost(db, 'ann', group, 'To be deleted');
    const reply = await createReply(db, 'bob', mine, 'A reply');
    await expect(deletePost(db, 'bob', mine)).rejects.toMatchObject({ status: 400 });
    await expect(deleteReply(db, 'ann', reply)).rejects.toMatchObject({ status: 400 });
    await deleteReply(db, 'bob', reply);
    const again = await createReply(db, 'bob', mine, 'Another');
    await deletePost(db, 'ann', mine);
    expect((await pg.query(`select count(*)::int as n from public.group_replies where id = $1`, [again])).rows[0]).toEqual({ n: 0 });
  });
});

describe('leaving, removing and archiving', () => {
  it('lets a farm leave at any time, keeping or deleting its posts as it chooses', async () => {
    const g = await groupWithInvite('Leaving group');
    await joinGroup(db, 'ann', g.code);
    await joinGroup(db, 'bob', g.code);
    const kept = await createPost(db, 'bob', g.id, 'I stay');
    await createReply(db, 'bob', kept, 'my reply');
    await leaveGroup(db, 'bob', g.id, false);
    await expect(groupFeed(db, 'bob', g.id)).rejects.toMatchObject({ status: 403 });
    expect((await groupFeed(db, 'ann', g.id)).posts).toHaveLength(1);

    await joinGroup(db, 'bob', g.code);
    await leaveGroup(db, 'bob', g.id, true);
    expect((await groupFeed(db, 'ann', g.id)).posts).toHaveLength(0);
    await expect(leaveGroup(db, 'bob', g.id, false)).rejects.toMatchObject({ status: 403 });
    await expect(leaveGroup(db, 'ann-worker', g.id, false)).rejects.toMatchObject({ status: 403 });
  });

  it('lets staff take a farm out, and shows them only names and places', async () => {
    const g = await groupWithInvite('Staff view group');
    await joinGroup(db, 'ann', g.code);
    await joinGroup(db, 'cyn', g.code);
    await createPost(db, 'ann', g.id, 'A private sentence staff must not read');
    const members = await adminGroupMembers(db, 'boss', g.id);
    expect(members.map((m) => m.farmName).sort()).toEqual(['ann farm', 'cyn farm']);
    const listing = JSON.stringify([await adminListGroups(db, 'boss'), members]);
    expect(listing).not.toContain('private sentence');
    expect((await adminListGroups(db, 'boss')).find((x) => x.id === g.id)).toMatchObject({ members: 2 });
    await adminRemoveGroupMember(db, 'boss', g.id, farmIds.cyn);
    await expect(groupFeed(db, 'cyn', g.id)).rejects.toMatchObject({ status: 403 });
    await expect(adminRemoveGroupMember(db, 'boss', g.id, farmIds.cyn)).rejects.toMatchObject({ status: 400 });
  });

  it('hides an archived group from its members without deleting anything', async () => {
    const g = await groupWithInvite('Soon archived');
    await joinGroup(db, 'ann', g.code);
    await createPost(db, 'ann', g.id, 'Still stored');
    await adminSaveGroup(db, 'boss', g.id, { name: 'Soon archived', kind: 'sacco', county: 'Nakuru', archived: true });
    expect((await myGroups(db, 'ann')).groups.map((x) => x.id)).not.toContain(g.id);
    await expect(groupFeed(db, 'ann', g.id)).rejects.toMatchObject({ status: 403 });
    expect((await pg.query(`select count(*)::int as n from public.group_posts where group_id = $1`, [g.id])).rows[0]).toEqual({ n: 1 });
    await adminSaveGroup(db, 'boss', g.id, { name: 'Soon archived', kind: 'sacco', county: 'Nakuru', archived: false });
    expect((await groupFeed(db, 'ann', g.id)).posts).toHaveLength(1);
  });

  it('removes a farm\'s posts, replies and memberships when the farm is removed', async () => {
    await onboard(db, user('gone'), details('farm_pro', 'Gone farm', 'Name gone'));
    const gone = await farmOf('gone');
    const g = await groupWithInvite('Cascade group');
    await joinGroup(db, 'gone', g.code);
    await joinGroup(db, 'witness', g.code);
    const post = await createPost(db, 'gone', g.id, 'Bye');
    await createReply(db, 'witness', post, 'Reply to Bye');
    await createReply(db, 'gone', post, 'Reply from gone');
    await pg.query('delete from public.farms where id = $1', [gone]);
    for (const table of ['group_members', 'group_posts', 'group_replies']) {
      expect((await pg.query(`select count(*)::int as n from public.${table} where farm_id = $1`, [gone])).rows[0], table).toEqual({ n: 0 });
    }
    expect((await pg.query(`select count(*)::int as n from public.group_replies where post_id = $1`, [post])).rows[0]).toEqual({ n: 0 });
  });
});
