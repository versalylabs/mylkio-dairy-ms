import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { randomUUID, randomBytes } from 'node:crypto';
import { freshDatabase } from '../db/harness';
import {
  acceptInvite, adminListAccounts, adminUsage, applyOperations, createInvite, farmChanges, getAccount, listTeam, onboard, removeMember,
  revokeInvite, setMemberRole, type Db, type OnboardingInput, type SessionUser,
} from '@/lib/server/farm-api';
import { bucketNames, type BucketName, type RecordOperation } from '@/lib/backend-contract';
import { INVITE_CODE_LENGTH, TEAM_LOGINS, canRead, canWrite, inviteLink, looksLikeInviteCode, newInviteCode, normaliseInviteCode, tabsFor } from '@/lib/team';

const asDb = (pg: PGlite): Db => ({ query: async (text, params) => (await pg.query(text, params as never)).rows as never });
const user = (id: string): SessionUser => ({ id, email: `${id}@example.test`, name: `Name ${id}` });
const details = (plan: OnboardingInput['plan']): OnboardingInput => ({ name: 'Owner', phone: '0712345678', farmName: 'Farm', county: 'Nakuru', plan, language: 'en' });

let pg: PGlite;
let db: Db;
let proFarm: string;
let farmerFarm: string;
const code = () => newInviteCode((n) => randomBytes(n));

const op = (bucket: BucketName, farm: string, id: string, extra: Record<string, unknown> = {}): RecordOperation => ({
  opId: randomUUID(), groupId: randomUUID(), bucket, recordId: id, action: 'upsert', baseVersion: 0, data: { id, farmId: farm, ...extra },
});
const buckets = async (actor: string, farm: string) => [...new Set((await farmChanges(db, actor, farm, 0)).changes.map((c) => c.bucket))].sort();
const join = async (id: string, invite: string, who = user(id)) => acceptInvite(db, who, { name: who.name, phone: '0700000000', code: invite });
const invite = async (owner: string, farm: string, role: 'manager' | 'worker', label = '') => {
  const c = code();
  await createInvite(db, owner, farm, role, label, c);
  return c;
};

beforeAll(async () => {
  pg = await freshDatabase();
  db = asDb(pg);
  await onboard(db, user('pro'), details('farm_pro'));
  await onboard(db, user('small'), details('farmer'));
  const farmOf = async (id: string) => (await pg.query<{ farm_id: string }>('select farm_id from public.farm_memberships where user_id = $1', [id])).rows[0].farm_id;
  proFarm = await farmOf('pro');
  farmerFarm = await farmOf('small');
  // Some farm records of every kind, written by the owner.
  await applyOperations(db, 'pro', proFarm, [
    op('cows', proFarm, 'cow-1', { tag: 'GH-1' }), op('milk', proFarm, 'milk-1', { totalLitres: 20 }), op('health', proFarm, 'health-1'),
    op('buyers', proFarm, 'buyer-1', { name: 'Co-op' }), op('payments', proFarm, 'pay-1', { amount: 5000 }), op('expenses', proFarm, 'exp-1', { amount: 100 }),
    op('deliveries', proFarm, 'del-1', { litres: 20 }), op('breeding', proFarm, 'br-1'), op('reminders', proFarm, 'rem-1'),
  ]);
}, 60_000);

describe('joining with an invitation', () => {
  it('adds the person to the owner\'s farm with the invited role, and not as a new farm', async () => {
    const c = await invite('pro', proFarm, 'worker', 'Mary, milker');
    const account = await join('mary', c);
    expect(account.farmId).toBe(proFarm);
    expect(account.farmRole).toBe('worker');
    const owner = await getAccount(db, 'pro');
    expect(owner?.farmRole).toBe('owner');
    expect((await pg.query(`select count(*)::int as n from public.farms`)).rows[0]).toEqual({ n: 2 });
  });

  it('accepts the code in any case, with or without the dash, and only once', async () => {
    const c = await invite('pro', proFarm, 'manager');
    await join('peter', c.toLowerCase().replace('-', ' '));
    await expect(join('latecomer', c)).rejects.toMatchObject({ status: 400 });
  });

  it('refuses a wrong code with a message that does not say why', async () => {
    await expect(join('stranger', 'ZZZZZ-ZZZZZ')).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/not valid/) });
    expect((await pg.query(`select count(*)::int as n from public.farm_memberships where user_id = 'stranger'`)).rows[0]).toEqual({ n: 0 });
  });

  it('refuses someone who already belongs to a farm', async () => {
    const c = await invite('pro', proFarm, 'worker');
    await expect(join('small', c)).rejects.toMatchObject({ status: 409 });
  });

  it('stores only a hash of the code, never the code', async () => {
    const c = await invite('pro', proFarm, 'worker', 'check');
    const { rows } = await pg.query<{ token_hash: string }>(`select token_hash from public.farm_invites where label = 'check'`);
    expect(rows[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(rows)).not.toContain(normaliseInviteCode(c));
    await pg.query(`delete from public.farm_invites where label = 'check'`);
  });

  it('refuses an expired or revoked invitation', async () => {
    const expired = await invite('pro', proFarm, 'worker');
    await pg.query(`update public.farm_invites set expires_at = now() - interval '1 minute' where token_hash = public.invite_hash($1)`, [expired]);
    await expect(join('tooslow', expired)).rejects.toMatchObject({ status: 400 });

    const revoked = await invite('pro', proFarm, 'worker', 'to revoke');
    const team = await listTeam(db, 'pro', proFarm);
    const target = team.invites.find((i) => i.label === 'to revoke')!;
    await revokeInvite(db, 'pro', proFarm, target.id);
    await expect(join('revoked', revoked)).rejects.toMatchObject({ status: 400 });
    await pg.query(`delete from public.farm_invites where accepted_at is null`);
  });
});

describe('what each role can see and change', () => {
  it('a worker only receives daily-work records, never money', async () => {
    expect(await buckets('mary', proFarm)).toEqual(['breeding', 'cows', 'farm', 'health', 'milk', 'reminders']);
  });

  it('a manager and the owner receive everything', async () => {
    const all = await buckets('pro', proFarm);
    expect(await buckets('peter', proFarm)).toEqual(all);
    expect(all).toEqual(expect.arrayContaining(['buyers', 'payments', 'expenses', 'deliveries']));
  });

  it('a worker can record milk and health but is refused everything else', async () => {
    await applyOperations(db, 'mary', proFarm, [op('milk', proFarm, 'milk-mary', { totalLitres: 12 }), op('health', proFarm, 'health-mary')]);
    for (const bucket of ['cows', 'buyers', 'payments', 'expenses', 'deliveries', 'bills', 'statements', 'allocations'] as BucketName[]) {
      await expect(applyOperations(db, 'mary', proFarm, [op(bucket, proFarm, `x-${bucket}`)]), bucket).rejects.toMatchObject({ status: 403 });
    }
    expect((await pg.query(`select count(*)::int as n from public.farm_records where id like 'x-%'`)).rows[0]).toEqual({ n: 0 });
  });

  it('a refused batch writes nothing, even the allowed part', async () => {
    await expect(applyOperations(db, 'mary', proFarm, [op('milk', proFarm, 'milk-half'), op('payments', proFarm, 'pay-sneaky', { amount: 1 })])).rejects.toMatchObject({ status: 403 });
    expect((await pg.query(`select count(*)::int as n from public.farm_records where id in ('milk-half','pay-sneaky')`)).rows[0]).toEqual({ n: 0 });
  });

  it('a manager can change money records and cows', async () => {
    await applyOperations(db, 'peter', proFarm, [op('payments', proFarm, 'pay-peter', { amount: 10 }), op('cows', proFarm, 'cow-peter', { tag: 'GH-9' })]);
    expect((await buckets('pro', proFarm))).toContain('payments');
  });

  it('the database and the screens agree, for every role and kind of record', async () => {
    for (const role of ['owner', 'manager', 'worker', 'advisor', 'nobody']) {
      for (const bucket of bucketNames) {
        const { rows } = await pg.query<{ r: boolean; w: boolean }>('select public.role_can_read($1, $2) as r, public.role_can_write($1, $2) as w', [role, bucket]);
        expect(rows[0].r, `${role} reads ${bucket}`).toBe(canRead(role as never, bucket));
        expect(rows[0].w, `${role} writes ${bucket}`).toBe(canWrite(role as never, bucket));
      }
    }
  });

  it('is refused for a stranger and for someone on another farm', async () => {
    await expect(farmChanges(db, 'small', proFarm, 0)).rejects.toMatchObject({ status: 403 });
    await expect(applyOperations(db, 'small', proFarm, [op('milk', proFarm, 'm-x')])).rejects.toMatchObject({ status: 403 });
    await expect(farmChanges(db, 'mary', farmerFarm, 0)).rejects.toMatchObject({ status: 403 });
  });
});

describe('managing the team', () => {
  it('is for the owner only', async () => {
    for (const actor of ['mary', 'peter', 'small', 'nobody']) {
      await expect(listTeam(db, actor, proFarm), actor).rejects.toMatchObject({ status: 403 });
      await expect(createInvite(db, actor, proFarm, 'worker', '', code()), actor).rejects.toMatchObject({ status: 403 });
      await expect(setMemberRole(db, actor, proFarm, 'mary', 'manager'), actor).rejects.toMatchObject({ status: 403 });
      await expect(removeMember(db, actor, proFarm, 'mary'), actor).rejects.toMatchObject({ status: 403 });
    }
  });

  it('lists members with their roles and open invitations', async () => {
    const open = await invite('pro', proFarm, 'worker', 'Open one');
    const team = await listTeam(db, 'pro', proFarm);
    expect(team.limit).toBe(6);
    expect(team.members.map((m) => `${m.id}:${m.role}`)).toEqual(['pro:owner', 'mary:worker', 'peter:manager']);
    expect(team.invites.map((i) => i.label)).toContain('Open one');
    expect(JSON.stringify(team)).not.toContain(normaliseInviteCode(open));
  });

  it('changes a role, which applies at once', async () => {
    await setMemberRole(db, 'pro', proFarm, 'mary', 'manager');
    await applyOperations(db, 'mary', proFarm, [op('expenses', proFarm, 'exp-mary', { amount: 5 })]);
    expect(await buckets('mary', proFarm)).toContain('expenses');
    await setMemberRole(db, 'pro', proFarm, 'mary', 'worker');
    await expect(applyOperations(db, 'mary', proFarm, [op('expenses', proFarm, 'exp-mary-2')])).rejects.toMatchObject({ status: 403 });
  });

  it('never demotes or removes the owner', async () => {
    await expect(setMemberRole(db, 'pro', proFarm, 'pro', 'worker')).rejects.toMatchObject({ status: 400 });
    await expect(removeMember(db, 'pro', proFarm, 'pro')).rejects.toMatchObject({ status: 400 });
  });

  it('removes a person, who then loses all access straight away', async () => {
    await removeMember(db, 'pro', proFarm, 'peter');
    await expect(farmChanges(db, 'peter', proFarm, 0)).rejects.toMatchObject({ status: 403 });
    await expect(applyOperations(db, 'peter', proFarm, [op('milk', proFarm, 'm-peter')])).rejects.toMatchObject({ status: 403 });
    expect((await getAccount(db, 'peter'))?.farmId).toBe('');
    // What they recorded stays.
    expect((await pg.query(`select count(*)::int as n from public.farm_records where id = 'pay-peter'`)).rows[0]).toEqual({ n: 1 });
  });
});

describe('plans', () => {
  it('only Farm Pro has a team: other plans cannot invite anyone', async () => {
    expect(TEAM_LOGINS).toEqual({ starter: 1, farmer: 1, farm_pro: 6, custom: 6 });
    await expect(createInvite(db, 'small', farmerFarm, 'worker', '', code())).rejects.toMatchObject({ status: 409, message: expect.stringMatching(/Farm Pro/) });
  });

  it('stops at the plan limit, counting members and open invitations together', async () => {
    await onboard(db, user('big'), details('farm_pro'));
    const bigFarm = (await pg.query<{ farm_id: string }>(`select farm_id from public.farm_memberships where user_id = 'big'`)).rows[0].farm_id;
    for (let i = 0; i < 5; i++) await invite('big', bigFarm, 'worker', `w${i}`);
    await expect(createInvite(db, 'big', bigFarm, 'worker', 'one too many', code())).rejects.toMatchObject({ status: 409 });
    // Accepting one does not free a place: it only turns an invitation into a member.
    const team = await listTeam(db, 'big', bigFarm);
    expect(team.members).toHaveLength(1);
    expect(team.invites).toHaveLength(5);
    await revokeInvite(db, 'big', bigFarm, team.invites[0].id);
    await invite('big', bigFarm, 'manager', 'fits again');
  });

  it('refuses a join when the farm moved to a smaller plan and is already over', async () => {
    await onboard(db, user('shrink'), details('farm_pro'));
    const farm = (await pg.query<{ farm_id: string }>(`select farm_id from public.farm_memberships where user_id = 'shrink'`)).rows[0].farm_id;
    const c = await invite('shrink', farm, 'worker');
    await pg.query(`update public.subscriptions set details = details || '{"plan":"farmer"}'::jsonb where farm_id = $1`, [farm]);
    await expect(join('latejoiner', c)).rejects.toMatchObject({ status: 409 });
  });
});

describe('administration counts farms, not logins', () => {
  it('lists and counts owners only', async () => {
    await onboard(db, user('boss'), details('farmer'));
    await pg.query(`update public.profiles set role = 'super_admin' where id = 'boss'`);
    const accounts = (await adminListAccounts(db, 'boss')) as { id: string; role: string }[];
    expect(accounts.find((a) => a.id === 'mary')).toBeUndefined();
    expect(accounts.find((a) => a.id === 'pro')).toBeDefined();
    const usage = await adminUsage(db, 'boss');
    // Farm owners: pro, small, big and shrink; and peter, who was removed from a farm and now has none. Mary (a worker) is not an account.
    expect(usage.accounts).toBe(5);
    // Each farm counts once in the plan breakdown, however many logins it has.
    expect(Object.values(usage.byPlan).reduce((a, b) => a + b, 0)).toBe(4);
  });
});

describe('the pieces the screens use', () => {
  it('makes ten-character codes from an alphabet without look-alike characters', () => {
    const c = newInviteCode((n) => randomBytes(n));
    expect(c).toMatch(/^[A-HJKMNP-Z2-9]{5}-[A-HJKMNP-Z2-9]{5}$/);
    expect(normaliseInviteCode(c)).toHaveLength(INVITE_CODE_LENGTH);
    expect(new Set(Array.from({ length: 50 }, () => newInviteCode((n) => randomBytes(n)))).size).toBe(50);
  });

  it('reads a pasted code however it was typed', () => {
    expect(normaliseInviteCode(' abcde-fghjk ')).toBe('ABCDEFGHJK');
    expect(looksLikeInviteCode('abc')).toBe(false);
    expect(looksLikeInviteCode('ABCDE-FGHJK')).toBe(true);
  });

  it('builds a link that opens the join step', () => {
    expect(inviteLink('https://mylkio-dairy-ms.vercel.app/', 'ABCDE-FGHJK')).toBe('https://mylkio-dairy-ms.vercel.app/?join=ABCDE-FGHJK');
  });

  it('shows workers only the screens they can use', () => {
    expect(tabsFor('worker')).toEqual(['home', 'milk', 'herd', 'community', 'settings']);
    expect(tabsFor('manager')).toContain('finance');
    expect(tabsFor('owner')).toContain('sales');
  });
});
