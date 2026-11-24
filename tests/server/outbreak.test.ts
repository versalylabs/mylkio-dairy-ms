import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { freshDatabase } from '../db/harness';
import { acceptInvite, createInvite, onboard, type Db, type OnboardingInput, type SessionUser } from '@/lib/server/farm-api';
import {
  adminCreateGroupInvite, adminSaveGroup, answerAlert, createOutbreakReport, createPost, createReply, deletePost, groupAlerts, groupFeed,
  homeAlerts, joinGroup, myGroups, postThread, reportersForAdmin,
} from '@/lib/server/community-api';
import { REPORT_LIMITS, outbreakReportsOpen, type ReportInput } from '@/lib/community-outbreak';
import { newGroupCode } from '@/lib/community';
import { newInviteCode } from '@/lib/team';

const asDb = (pg: PGlite): Db => ({ query: async (text, params) => (await pg.query(text, params as never)).rows as never });
const user = (id: string): SessionUser => ({ id, email: `${id}@example.test`, name: `Name ${id}` });
const code = () => newGroupCode((n) => randomBytes(n));
const nairobiToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());
const daysAgo = (n: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date(Date.now() - n * 86_400_000));

let pg: PGlite;
let db: Db;
const farmIds: Record<string, string> = {};
const farmOf = async (id: string) => (await pg.query<{ farm_id: string }>('select farm_id from public.farm_memberships where user_id = $1', [id])).rows[0].farm_id;

const report = (over: Partial<ReportInput> = {}): ReportInput => ({ signs: ['blisters_mouth'], animals: 3, days: 2, seenOn: nairobiToday(), vetSeen: 'called', ...over });

async function makeFarm(id: string, plan: OnboardingInput['plan'], county: string, subCounty?: string) {
  await onboard(db, user(id), { name: `Name ${id}`, phone: `07000000${id.length}${id.charCodeAt(0)}`, farmName: `${id} farm`, county, subCounty, plan, language: 'en' });
  farmIds[id] = await farmOf(id);
}
async function groupWithInvite(name: string, role: 'member' | 'admin' = 'member') {
  const id = await adminSaveGroup(db, 'boss', null, { name, kind: 'sacco', county: 'Nakuru' });
  const c = code();
  await adminCreateGroupInvite(db, 'boss', id, { role, label: '', maxUses: 50, days: 30 }, c);
  const join = code();
  await adminCreateGroupInvite(db, 'boss', id, { role: 'member', label: '', maxUses: 50, days: 30 }, join);
  return { id, adminCode: c, code: join };
}

let g: { id: string; adminCode: string; code: string };

beforeAll(async () => {
  pg = await freshDatabase();
  db = asDb(pg);
  await pg.query(`insert into public.profiles(id, email, name, role) values ('boss', 'boss@example.test', 'Staff', 'super_admin')`);
  await makeFarm('ann', 'farm_pro', 'Nakuru', 'Rongai');   // the group's admin
  await makeFarm('bob', 'farm_pro', 'Nakuru', 'Rongai');
  await makeFarm('cyn', 'farm_pro', 'Nakuru', 'Rongai');
  await makeFarm('dan', 'farm_pro', 'Nakuru', 'Njoro');
  await makeFarm('eve', 'farm_pro', 'Kiambu', 'Kikuyu');
  await makeFarm('fay', 'farm_pro', 'Nakuru');             // no sub-county: the area is the county
  await makeFarm('small', 'farmer', 'Nakuru', 'Rongai');
  await makeFarm('outsider', 'farm_pro', 'Nakuru', 'Rongai');
  // Bob's farm has a worker.
  const c = newInviteCode((n) => randomBytes(n));
  await createInvite(db, 'bob', farmIds.bob, 'worker', '', c);
  await acceptInvite(db, user('bob-worker'), { name: 'Bob worker', phone: '0700000000', code: c });

  g = await groupWithInvite('Rongai Dairy SACCO', 'admin');
  await joinGroup(db, 'ann', g.adminCode);
  for (const id of ['bob', 'cyn', 'dan', 'fay']) await joinGroup(db, id, g.code);
  // Eve is in Kiambu, in a group of her own.
}, 120_000);

const alertsOf = async (actor: string) => (await groupAlerts(db, actor, g.id));
const clearReports = async () => { await pg.query(`delete from public.group_posts where kind = 'outbreak'`); await pg.query('delete from public.group_alert_answers'); };

describe('who may report', () => {
  it('lets an owner or manager of a member farm report, and refuses a worker, an outsider and a farm without the plan', async () => {
    await createOutbreakReport(db, 'bob', g.id, report());
    await expect(createOutbreakReport(db, 'bob-worker', g.id, report())).rejects.toMatchObject({ status: 403 });
    await expect(createOutbreakReport(db, 'outsider', g.id, report())).rejects.toMatchObject({ status: 403 });
    await expect(createOutbreakReport(db, 'small', g.id, report())).rejects.toMatchObject({ status: 403 });
    await expect(createOutbreakReport(db, 'boss', g.id, report())).rejects.toMatchObject({ status: 403 });
    await clearReports();
  });
});

describe('what a report must contain', () => {
  it('refuses a report with bad signs, numbers or dates', async () => {
    const bad: Partial<ReportInput>[] = [
      { signs: [] }, { signs: ['A_B'] }, { signs: ['x'] }, { signs: ['blisters_mouth', 'blisters_mouth'] },
      { signs: ['a_1', 'b_1', 'c_1', 'd_1', 'e_1', 'f_1', 'g_1', 'h_1', 'i_1'].map((s) => s.replace(/\d/g, 'z')) },
      { animals: 0 }, { animals: REPORT_LIMITS.maxAnimals + 1 }, { days: -1 }, { days: REPORT_LIMITS.maxDays + 1 },
      { seenOn: daysAgo(-1) }, { seenOn: daysAgo(REPORT_LIMITS.seenWithinDays + 1) }, { vetSeen: 'maybe' as never },
    ];
    for (const b of bad) await expect(createOutbreakReport(db, 'bob', g.id, report(b)), JSON.stringify(b)).rejects.toMatchObject({ status: 400 });
    await createOutbreakReport(db, 'bob', g.id, report({ signs: ['blisters_mouth', 'blisters_feet', 'not_eating', 'milk_dropped', 'cough', 'lameness', 'ticks_many', 'calf_weak'], animals: REPORT_LIMITS.maxAnimals, days: REPORT_LIMITS.maxDays, seenOn: daysAgo(REPORT_LIMITS.seenWithinDays) }));
    await clearReports();
  });

  it('keeps five reports a day per farm, then lets them through again', async () => {
    for (let i = 0; i < REPORT_LIMITS.perDay; i++) await createOutbreakReport(db, 'cyn', g.id, report());
    await expect(createOutbreakReport(db, 'cyn', g.id, report())).rejects.toMatchObject({ status: 429 });
    await pg.query(`update public.group_posts set created_at = now() - interval '2 days' where farm_id = $1`, [farmIds.cyn]);
    await createOutbreakReport(db, 'cyn', g.id, report());
    await clearReports();
  });

  it('refuses a group the farm is not in, and an archived group', async () => {
    const other = await groupWithInvite('Another group');
    await expect(createOutbreakReport(db, 'bob', other.id, report())).rejects.toMatchObject({ status: 403 });
    await joinGroup(db, 'bob', other.code);
    await adminSaveGroup(db, 'boss', other.id, { name: 'Another group', kind: 'sacco', county: 'Nakuru', archived: true });
    await expect(createOutbreakReport(db, 'bob', other.id, report())).rejects.toMatchObject({ status: 403 });
  });
});

describe('counts, not names', () => {
  it('counts farms by area and sign, once per farm, and shows the area from the farm\'s own profile', async () => {
    await createOutbreakReport(db, 'ann', g.id, report());
    await createOutbreakReport(db, 'bob', g.id, report({ signs: ['blisters_mouth', 'blisters_feet'] }));
    await createOutbreakReport(db, 'bob', g.id, report()); // the same farm again
    await createOutbreakReport(db, 'dan', g.id, report());
    await createOutbreakReport(db, 'fay', g.id, report({ signs: ['skin_nodules'] }));
    const { clusters } = await alertsOf('cyn');
    const find = (area: string, sign: string) => clusters.find((c) => c.area === area && c.sign === sign);
    expect(find('Rongai', 'blisters_mouth')).toMatchObject({ farms: 2, also: 0, notHere: 0, iReported: false, myAnswer: null });
    expect(find('Rongai', 'blisters_feet')).toMatchObject({ farms: 1 });
    expect(find('Njoro', 'blisters_mouth')).toMatchObject({ farms: 1 });
    expect(find('Nakuru', 'skin_nodules')).toMatchObject({ farms: 1, county: 'Nakuru' });
    expect(clusters[0].sign).toBe('blisters_mouth');
  });

  it('never names a farm, a person or an id to the other members', async () => {
    for (const actor of ['cyn', 'dan', 'bob-worker']) {
      const text = JSON.stringify(await alertsOf(actor));
      for (const secret of ['ann farm', 'bob farm', 'dan farm', 'fay farm', 'Name ann', 'Name bob', 'Name dan', '0700', ...Object.values(farmIds)]) {
        expect(text, `${actor} sees ${secret}`).not.toContain(secret);
      }
    }
  });

  it('shows a member only the groups it belongs to, and nothing to an outsider or a farm without the plan', async () => {
    await expect(groupAlerts(db, 'outsider', g.id)).rejects.toMatchObject({ status: 403 });
    await expect(groupAlerts(db, 'eve', g.id)).rejects.toMatchObject({ status: 403 });
    await expect(groupAlerts(db, 'small', g.id)).rejects.toMatchObject({ status: 403 });
  });

  it('lets a worker read the counts but not answer', async () => {
    const view = await alertsOf('bob-worker');
    expect(view.canAnswer).toBe(false);
    expect(view.clusters.length).toBeGreaterThan(0);
    await expect(answerAlert(db, 'bob-worker', g.id, 'rongai', 'blisters_mouth', 'also')).rejects.toMatchObject({ status: 403 });
  });

  it('only counts the last 7 days, and drops a report older than 90 days at the next report', async () => {
    await pg.query(`update public.group_posts set created_at = now() - interval '8 days' where farm_id = $1`, [farmIds.fay]);
    expect((await alertsOf('cyn')).clusters.find((c) => c.sign === 'skin_nodules')).toBeUndefined();
    await pg.query(`update public.group_posts set created_at = now() - interval '91 days' where farm_id = $1`, [farmIds.fay]);
    await createOutbreakReport(db, 'cyn', g.id, report({ signs: ['cough'] }));
    expect((await pg.query(`select count(*)::int as n from public.group_posts where farm_id = $1 and kind = 'outbreak'`, [farmIds.fay])).rows[0]).toEqual({ n: 0 });
  });
});

describe('"we see this too" and "not here"', () => {
  it('counts one answer per farm, lets a farm change or take back its answer, and never counts a reporting farm', async () => {
    await answerAlert(db, 'cyn', g.id, 'rongai', 'blisters_mouth', 'also');
    await answerAlert(db, 'dan', g.id, 'Rongai ', 'blisters_mouth', 'not_here'); // spelling and spaces do not matter
    let c = (await alertsOf('cyn')).clusters.find((x) => x.areaKey === 'rongai' && x.sign === 'blisters_mouth')!;
    expect(c).toMatchObject({ farms: 2, also: 1, notHere: 1, myAnswer: 'also' });
    await answerAlert(db, 'cyn', g.id, 'rongai', 'blisters_mouth', 'not_here');
    c = (await alertsOf('cyn')).clusters.find((x) => x.areaKey === 'rongai' && x.sign === 'blisters_mouth')!;
    expect(c).toMatchObject({ also: 0, notHere: 2, myAnswer: 'not_here' });
    await answerAlert(db, 'cyn', g.id, 'rongai', 'blisters_mouth', null);
    c = (await alertsOf('cyn')).clusters.find((x) => x.areaKey === 'rongai' && x.sign === 'blisters_mouth')!;
    expect(c).toMatchObject({ notHere: 1, myAnswer: null });
    // A farm that reported this cannot answer it, and its own view says so.
    await expect(answerAlert(db, 'bob', g.id, 'rongai', 'blisters_mouth', 'also')).rejects.toMatchObject({ status: 400 });
    expect((await alertsOf('bob')).clusters.find((x) => x.areaKey === 'rongai' && x.sign === 'blisters_mouth')!.iReported).toBe(true);
  });

  it('refuses an answer to an alert that is not open, an unknown value, or a farm that is not in the group', async () => {
    await expect(answerAlert(db, 'cyn', g.id, 'rongai', 'lameness', 'also')).rejects.toMatchObject({ status: 400 });
    await expect(answerAlert(db, 'cyn', g.id, 'rongai', 'blisters_mouth', 'maybe' as never)).rejects.toMatchObject({ status: 400 });
    await expect(answerAlert(db, 'eve', g.id, 'rongai', 'blisters_mouth', 'also')).rejects.toMatchObject({ status: 403 });
  });

  it('stops counting a farm\'s answer once that farm reports the same thing itself', async () => {
    await answerAlert(db, 'cyn', g.id, 'rongai', 'blisters_mouth', 'also');
    await createOutbreakReport(db, 'cyn', g.id, report());
    const c = (await alertsOf('dan')).clusters.find((x) => x.areaKey === 'rongai' && x.sign === 'blisters_mouth')!;
    expect(c).toMatchObject({ farms: 3, also: 0 });
  });

  it('removes answers older than 30 days at the next report', async () => {
    await pg.query(`update public.group_alert_answers set answered_at = now() - interval '31 days'`);
    await createOutbreakReport(db, 'dan', g.id, report({ signs: ['cough'] }));
    expect((await pg.query(`select count(*)::int as n from public.group_alert_answers`)).rows[0]).toEqual({ n: 0 });
  });
});

describe('a report is not a discussion post', () => {
  it('does not appear in the discussion, cannot be replied to, and does not count as the last post', async () => {
    const mine = (await alertsOf('dan')).mine;
    expect(mine.length).toBeGreaterThan(0);
    const feed = await groupFeed(db, 'ann', g.id);
    expect(feed.posts.filter((p) => p.kind === 'outbreak')).toEqual([]);
    expect(feed.posts).toHaveLength(0);
    const { rows } = await pg.query<{ id: string }>(`select id from public.group_posts where kind = 'outbreak' limit 1`);
    await expect(createReply(db, 'ann', rows[0].id, 'hello')).rejects.toMatchObject({ status: 403 });
    await expect(postThread(db, 'ann', rows[0].id)).rejects.toMatchObject({ status: 403 });
    expect((await myGroups(db, 'ann')).groups.find((x) => x.id === g.id)?.lastPostAt).toBeNull();
    await createPost(db, 'ann', g.id, 'A normal post');
    expect((await groupFeed(db, 'bob', g.id)).posts).toHaveLength(1);
  });

  it('lets a farm withdraw its own report, which stops it counting', async () => {
    await clearReports();
    await createOutbreakReport(db, 'bob', g.id, report());
    await createOutbreakReport(db, 'cyn', g.id, report());
    const bobs = (await alertsOf('bob')).mine;
    expect(bobs).toHaveLength(1);
    await expect(deletePost(db, 'cyn', bobs[0].id)).rejects.toMatchObject({ status: 400 });
    await deletePost(db, 'bob', bobs[0].id);
    expect((await alertsOf('dan')).clusters.find((x) => x.areaKey === 'rongai')).toMatchObject({ farms: 1 });
  });
});

describe('who sees which farm reported', () => {
  it('shows it only to the owner or a manager of a farm that is this group\'s admin, and records each look', async () => {
    await clearReports();
    await createOutbreakReport(db, 'bob', g.id, report({ signs: ['blisters_mouth', 'blisters_feet'], animals: 4, days: 3, vetSeen: 'yes' }));
    const rows = await reportersForAdmin(db, 'ann', g.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ farmName: 'bob farm', personName: 'Name bob', area: 'Rongai', animals: 4, days: 3, vetSeen: 'yes', signs: ['blisters_mouth', 'blisters_feet'] });
    expect(rows[0].phone).toMatch(/^0700/);
    expect((await pg.query<{ n: number }>(`select count(*)::int as n from public.audit_logs where action = 'community.reporters.view' and farm_id = $1`, [farmIds.ann])).rows[0].n).toBeGreaterThanOrEqual(1);

    for (const actor of ['bob', 'cyn', 'bob-worker', 'outsider', 'eve', 'small', 'boss']) {
      await expect(reportersForAdmin(db, actor, g.id), actor).rejects.toMatchObject({ status: 403 });
    }
  });

  it('lets a manager of the admin farm look, but not a worker of it', async () => {
    const c = newInviteCode((n) => randomBytes(n));
    await createInvite(db, 'ann', farmIds.ann, 'manager', '', c);
    await acceptInvite(db, user('ann-manager'), { name: 'Ann manager', phone: '0700000001', code: c });
    const w = newInviteCode((n) => randomBytes(n));
    await createInvite(db, 'ann', farmIds.ann, 'worker', '', w);
    await acceptInvite(db, user('ann-worker'), { name: 'Ann worker', phone: '0700000002', code: w });
    await expect(reportersForAdmin(db, 'ann-manager', g.id)).resolves.toHaveLength(1);
    await expect(reportersForAdmin(db, 'ann-worker', g.id)).rejects.toMatchObject({ status: 403 });
  });
});

describe('the Home alert', () => {
  it('shows a farm the open alerts in its own county that it did not report, with the group name and counts only', async () => {
    await clearReports();
    await createOutbreakReport(db, 'bob', g.id, report());
    await createOutbreakReport(db, 'cyn', g.id, report());
    const dan = await homeAlerts(db, 'dan');
    expect(dan).toEqual([expect.objectContaining({ groupId: g.id, groupName: 'Rongai Dairy SACCO', area: 'Rongai', sign: 'blisters_mouth', farms: 2 })]);
    expect(JSON.stringify(dan)).not.toMatch(/bob|cyn/);
    // The farms that reported it are not told about their own report.
    expect(await homeAlerts(db, 'bob')).toEqual([]);
    // A farm in another county and a group without alerts see nothing.
    expect(await homeAlerts(db, 'eve')).toEqual([]);
    await expect(homeAlerts(db, 'small')).rejects.toMatchObject({ status: 403 });
  });
});

describe('removal with the farm', () => {
  it('deletes a farm\'s reports and answers with it', async () => {
    await makeFarm('gone', 'farm_pro', 'Nakuru', 'Rongai');
    await joinGroup(db, 'gone', g.code);
    await createOutbreakReport(db, 'gone', g.id, report({ signs: ['cough'] }));
    await answerAlert(db, 'gone', g.id, 'rongai', 'blisters_mouth', 'also');
    await pg.query('delete from public.farms where id = $1', [farmIds.gone]);
    expect((await pg.query(`select count(*)::int as n from public.group_posts where farm_id = $1`, [farmIds.gone])).rows[0]).toEqual({ n: 0 });
    expect((await pg.query(`select count(*)::int as n from public.group_alert_answers where farm_id = $1`, [farmIds.gone])).rows[0]).toEqual({ n: 0 });
  });
});

describe('the limits the app shows are the ones the database enforces', () => {
  const sql = readFileSync(path.resolve(__dirname, '../../db/migrations/0013_outbreak_reports.sql'), 'utf8');
  it('reads the same numbers from migration 0013', () => {
    expect(sql).toContain(`cardinality(p_signs) not between 1 and ${REPORT_LIMITS.maxSigns}`);
    expect(sql).toContain(`p_animals not between 1 and ${REPORT_LIMITS.maxAnimals}`);
    expect(sql).toContain(`p_days not between 0 and ${REPORT_LIMITS.maxDays}`);
    expect(sql).toContain(`p_seen_on < today - ${REPORT_LIMITS.seenWithinDays}`);
    expect(sql).toContain(`>= ${REPORT_LIMITS.perDay} then`);
    expect(sql).toContain(`interval '${REPORT_LIMITS.alertDays} days'`);
    expect(sql).toContain(`interval '${REPORT_LIMITS.keepReportsDays} days'`);
    expect(sql).toContain(`interval '${REPORT_LIMITS.keepAnswersDays} days'`);
  });
});

describe('reporting stays closed until a veterinarian has approved the guide', () => {
  it('is closed for live farms while every entry is a draft, and open where drafts are allowed', () => {
    expect(outbreakReportsOpen(false)).toBe(false);
    expect(outbreakReportsOpen(true)).toBe(true);
  });
});

describe('old reports are really deleted', () => {
  it('removes reports older than 90 days when any farm opens Home, not only when someone reports', async () => {
    await clearReports();
    await createOutbreakReport(db, 'bob', g.id, report());
    await answerAlert(db, 'cyn', g.id, 'rongai', 'blisters_mouth', 'also');
    await pg.query(`update public.group_posts set created_at = now() - interval '91 days' where kind = 'outbreak'`);
    await pg.query(`update public.group_alert_answers set answered_at = now() - interval '31 days'`);
    await homeAlerts(db, 'dan');
    expect((await pg.query(`select count(*)::int as n from public.group_posts where kind = 'outbreak'`)).rows[0]).toEqual({ n: 0 });
    expect((await pg.query(`select count(*)::int as n from public.group_alert_answers`)).rows[0]).toEqual({ n: 0 });
  });
});
