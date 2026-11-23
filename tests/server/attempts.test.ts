import { beforeEach, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { randomBytes } from 'node:crypto';
import { freshDatabase } from '../db/harness';
import { acceptInvite, createInvite, onboard, type Db, type OnboardingInput, type SessionUser } from '@/lib/server/farm-api';
import { ApiError } from '@/lib/server/errors';
import {
  ACCOUNT_MAX_ATTEMPTS, ATTEMPT_WINDOW_MINUTES, IP_MAX_ATTEMPTS, TOO_MANY_ATTEMPTS, codeAttemptsBlocked, ipHashOf, recordCodeAttempt, withAttemptLimit,
} from '@/lib/server/attempts';
import { newInviteCode } from '@/lib/team';

const asDb = (pg: PGlite): Db => ({ query: async (text, params) => (await pg.query(text, params as never)).rows as never });
const user = (id: string): SessionUser => ({ id, email: `${id}@example.test`, name: id });
const details: OnboardingInput = { name: 'Owner', phone: '0712345678', farmName: 'Farm', county: 'Nakuru', plan: 'farm_pro', language: 'en' };

let pg: PGlite;
let db: Db;
let farm: string;
const wrong = (e: unknown) => e instanceof ApiError && e.status === 400;
const tries = async (id: string) => (await pg.query<{ n: number }>(`select count(*)::int as n from public.code_attempts where actor_id = $1`, [id])).rows[0].n;
const badCode = () => { throw new ApiError(400, 'That invitation is not valid.'); };

beforeAll(async () => {
  pg = await freshDatabase();
  db = asDb(pg);
  await onboard(db, user('owner'), details);
  farm = (await pg.query<{ farm_id: string }>(`select farm_id from public.farm_memberships where user_id = 'owner'`)).rows[0].farm_id;
}, 60_000);

beforeEach(async () => { await pg.query('delete from public.code_attempts'); });

describe('a limit on wrong invitation codes', () => {
  it('counts wrong tries, and holds the account after the limit with the same message whatever it types', async () => {
    for (let i = 0; i < ACCOUNT_MAX_ATTEMPTS; i++) {
      await expect(withAttemptLimit(db, 'guesser', 'ip-1', 'join', wrong, async () => badCode())).rejects.toMatchObject({ status: 400 });
    }
    expect(await tries('guesser')).toBe(ACCOUNT_MAX_ATTEMPTS);
    // now held: even a perfectly good request is refused for a while, and it is not run at all
    let ran = false;
    await expect(withAttemptLimit(db, 'guesser', 'ip-1', 'join', wrong, async () => { ran = true; return 'ok'; })).rejects.toMatchObject({ status: 429, message: TOO_MANY_ATTEMPTS });
    expect(ran).toBe(false);
    expect(await tries('guesser')).toBe(ACCOUNT_MAX_ATTEMPTS); // being held does not add to the count
  });

  it('does not count a right code, or any other failure', async () => {
    for (let i = 0; i < ACCOUNT_MAX_ATTEMPTS * 2; i++) await withAttemptLimit(db, 'fine', 'ip-2', 'join', wrong, async () => 'ok');
    await expect(withAttemptLimit(db, 'fine', 'ip-2', 'join', wrong, async () => { throw new ApiError(500, 'server trouble'); })).rejects.toMatchObject({ status: 500 });
    expect(await tries('fine')).toBe(0);
  });

  it('holds a network address that tries across many accounts, but not a different address', async () => {
    for (let i = 0; i < IP_MAX_ATTEMPTS; i++) {
      await expect(withAttemptLimit(db, `acct-${i}`, 'shared-ip', 'start', wrong, async () => badCode())).rejects.toMatchObject({ status: 400 });
    }
    await expect(withAttemptLimit(db, 'someone-new', 'shared-ip', 'start', wrong, async () => 'ok')).rejects.toMatchObject({ status: 429 });
    await expect(withAttemptLimit(db, 'someone-new', 'other-ip', 'start', wrong, async () => 'ok')).resolves.toBe('ok');
  });

  it('lets go after the window, and one account being held does not hold another', async () => {
    for (let i = 0; i < ACCOUNT_MAX_ATTEMPTS; i++) await recordCodeAttempt(db, 'old', null, 'join');
    expect(await codeAttemptsBlocked(db, 'old', null)).toBe(true);
    expect(await codeAttemptsBlocked(db, 'neighbour', null)).toBe(false);
    await pg.query(`update public.code_attempts set at = now() - make_interval(mins => $1)`, [ATTEMPT_WINDOW_MINUTES + 1]);
    expect(await codeAttemptsBlocked(db, 'old', null)).toBe(false);
  });

  it('removes tries older than a day, so the table stays small', async () => {
    await pg.query(`insert into public.code_attempts(actor_id, kind, at) values ('ancient', 'join', now() - interval '3 days')`);
    await recordCodeAttempt(db, 'fresh', null, 'join');
    expect(await tries('ancient')).toBe(0);
    expect(await tries('fresh')).toBe(1);
  });

  it('never stops a real person because the count could not be read or written', async () => {
    const broken: Db = { query: async () => { throw new Error('database unavailable'); } };
    await expect(withAttemptLimit(broken, 'a', null, 'join', wrong, async () => 'through')).resolves.toBe('through');
    await expect(withAttemptLimit(broken, 'a', null, 'join', wrong, async () => badCode())).rejects.toMatchObject({ status: 400 }); // the real error, not the broken table
  });

  it('works with a real team invitation: wrong codes are counted and then held, and a good code is held too until the window passes', async () => {
    const good = newInviteCode((n) => randomBytes(n));
    await createInvite(db, 'owner', farm, 'worker', '', good);
    const join = (who: string, code: string) => withAttemptLimit(db, who, 'ip-3', 'join', wrong, () => acceptInvite(db, user(who), { name: who, phone: '0700000000', code }));
    for (let i = 0; i < ACCOUNT_MAX_ATTEMPTS; i++) await expect(join('mary', 'ZZZZZ-ZZZZZ')).rejects.toMatchObject({ status: 400 });
    await expect(join('mary', good)).rejects.toMatchObject({ status: 429 });
    // someone else, from a different address, joins normally with the good code
    const ok = await withAttemptLimit(db, 'peter', 'ip-4', 'join', wrong, () => acceptInvite(db, user('peter'), { name: 'Peter', phone: '0700000000', code: good }));
    expect(ok.farmId).toBe(farm);
  });

  it('keeps the address only as a hash', async () => {
    const request = new Request('https://example.test/api/account/join', { headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } });
    const hash = ipHashOf(request)!;
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
    expect(hash).not.toContain('203');
    expect(ipHashOf(new Request('https://example.test/', { headers: { 'x-forwarded-for': '203.0.113.7' } }))).toBe(hash); // the first address in the list
    expect(ipHashOf(new Request('https://example.test/'))).toBeNull();
    await recordCodeAttempt(db, 'x', hash, 'join');
    const { rows } = await pg.query<{ ip_hash: string }>(`select ip_hash from public.code_attempts where actor_id = 'x'`);
    expect(rows[0].ip_hash).toBe(hash);
  });
});
