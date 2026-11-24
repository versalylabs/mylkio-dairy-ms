// Database operations for Community groups (migration 0012). Like the rest of lib/server, this is free of Next.js and
// Neon Auth imports so tests can run it against an in-memory Postgres.
//
// The route verifies the session and passes the user id as `actor`. Every SQL function re-checks that the actor's farm
// is in the group, that its role may do this (workers read only) and that the plan includes Community, so a bug in a
// route cannot show one group's posts to another farm.

import { ApiError } from './errors';
import type { Db } from './farm-api';
import type { AlertAnswer, GroupAlerts, HomeAlert, ReportInput, ReporterRow } from '@/lib/community-outbreak';
import { COMMUNITY_LIMITS, type AdminFlag, type AdminOfficialAlert, type FlagReason, type GroupMemberRow, type OfficialAlert, type AdminGroup, type AdminGroupMember, type AdminInvite, type GroupFeed, type GroupKind, type GroupList, type GroupRole, type PostThread } from '@/lib/community';

export const COMMUNITY_PLAN_MESSAGE = 'Community groups are part of the Farm Pro plan.';

async function run<T>(db: Db, text: string, params: unknown[], opts: { denied?: string } = {}): Promise<T[]> {
  try {
    return await db.query<T>(text, params);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === '42501') throw new ApiError(403, opts.denied ?? 'You cannot do that in this group.');
    if (code === 'MY403') throw new ApiError(403, COMMUNITY_PLAN_MESSAGE);
    if (code === '22023') throw new ApiError(400, 'That could not be accepted. Please check what you typed.');
    if (code === 'MY429') throw new ApiError(429, 'You are posting a lot. Please wait a little before posting again.');
    if (code === 'MY431') throw new ApiError(409, 'This group is full.');
    if (code === 'MY432') throw new ApiError(409, `A farm can be in up to ${COMMUNITY_LIMITS.groupsPerFarm} groups. Leave one before joining another.`);
    throw error;
  }
}

const one = async <T>(db: Db, text: string, params: unknown[], opts?: { denied?: string }) => (await run<{ result: T }>(db, text, params, opts))[0].result;

// ---- Members: the owner or a manager joins, everyone on the farm may read ----

export const BAD_INVITE = 'That invitation is not valid. It may have expired, been used up or withdrawn. Ask your group for a new one.';

/** Joins the actor's farm to the group the code belongs to; returns the group id. A wrong code is a 400 (counted by the route). */
export async function joinGroup(db: Db, actor: string, code: string): Promise<string> {
  try {
    return await one<string>(db, 'select public.join_group($1, $2) as result', [actor, code], { denied: 'Only the farm owner or a manager can join a group.' });
  } catch (error) {
    // A wrong, used, expired or withdrawn code looks the same on purpose: it tells nobody which one it was.
    if (error instanceof ApiError && error.status === 400) throw new ApiError(400, BAD_INVITE);
    throw error;
  }
}

export async function leaveGroup(db: Db, actor: string, groupId: string, deletePosts: boolean): Promise<void> {
  await run(db, 'select public.leave_group($1, $2, $3)', [actor, groupId, deletePosts], { denied: 'Only the farm owner or a manager can leave a group.' });
}

export const myGroups = (db: Db, actor: string) =>
  one<GroupList>(db, 'select public.list_my_groups($1) as result', [actor], { denied: 'You do not have access to Community.' });

export const groupFeed = (db: Db, actor: string, groupId: string, before?: string | null) =>
  one<GroupFeed>(db, 'select public.list_group_posts($1, $2, $3::timestamptz, 30) as result', [actor, groupId, before ?? null], { denied: 'You are not a member of this group.' });

export const postThread = (db: Db, actor: string, postId: string) =>
  one<PostThread>(db, 'select public.get_group_post($1, $2) as result', [actor, postId], { denied: 'You are not a member of this group.' });

// ---- Writing (owner and manager) ----

const WRITE_DENIED = 'Only the farm owner or a manager can post. Workers can read the group.';

export const createPost = (db: Db, actor: string, groupId: string, body: string) =>
  one<string>(db, 'select public.create_group_post($1, $2, $3) as result', [actor, groupId, body], { denied: WRITE_DENIED });

export const createReply = (db: Db, actor: string, postId: string, body: string) =>
  one<string>(db, 'select public.create_group_reply($1, $2, $3) as result', [actor, postId, body], { denied: WRITE_DENIED });

export async function deletePost(db: Db, actor: string, postId: string): Promise<void> {
  await run(db, 'select public.delete_group_post($1, $2)', [actor, postId], { denied: WRITE_DENIED });
}

export async function deleteReply(db: Db, actor: string, replyId: string): Promise<void> {
  await run(db, 'select public.delete_group_reply($1, $2)', [actor, replyId], { denied: WRITE_DENIED });
}

// ---- Administration (Mylkio staff). The database re-checks that the caller is an administrator. ----

const ADMIN_ONLY = { denied: 'Administrator access required.' };

export const adminListGroups = (db: Db, actor: string) => one<AdminGroup[]>(db, 'select public.admin_list_groups($1) as result', [actor], ADMIN_ONLY);

export interface GroupInput { name: string; kind: GroupKind; county: string; description?: string; archived?: boolean }

export const adminSaveGroup = (db: Db, actor: string, id: string | null, g: GroupInput) =>
  one<string>(db, 'select public.admin_save_group($1, $2, $3, $4, $5, $6, $7) as result', [actor, id, g.name, g.kind, g.county, g.description ?? null, g.archived ?? false], ADMIN_ONLY);

export const adminCreateGroupInvite = (db: Db, actor: string, groupId: string, input: { role: GroupRole; label: string; maxUses: number; days: number }, code: string) =>
  one<string>(db, 'select public.admin_create_group_invite($1, $2, $3, $4, $5, $6, $7) as result', [actor, groupId, input.role, input.label, code, input.maxUses, input.days], ADMIN_ONLY);

export const adminGroupInvites = (db: Db, actor: string, groupId: string) =>
  one<AdminInvite[]>(db, 'select public.admin_list_group_invites($1, $2) as result', [actor, groupId], ADMIN_ONLY);

export async function adminRevokeGroupInvite(db: Db, actor: string, inviteId: string): Promise<void> {
  await run(db, 'select public.admin_revoke_group_invite($1, $2)', [actor, inviteId], ADMIN_ONLY);
}

export const adminGroupMembers = (db: Db, actor: string, groupId: string) =>
  one<AdminGroupMember[]>(db, 'select public.admin_list_group_members($1, $2) as result', [actor, groupId], ADMIN_ONLY);

export async function adminRemoveGroupMember(db: Db, actor: string, groupId: string, farmId: string): Promise<void> {
  await run(db, 'select public.admin_remove_group_member($1, $2, $3)', [actor, groupId, farmId], ADMIN_ONLY);
}

// ---- Outbreak reports (migration 0013) ----

export const REPORTS_CLOSED_MESSAGE = 'Outbreak reports open once a veterinarian has checked the health guide.';

export const createOutbreakReport = (db: Db, actor: string, groupId: string, r: ReportInput) =>
  one<string>(db, 'select public.create_outbreak_report($1, $2, $3::text[], $4, $5, $6::date, $7) as result', [actor, groupId, r.signs, r.animals, r.days, r.seenOn, r.vetSeen], { denied: WRITE_DENIED });

export const groupAlerts = (db: Db, actor: string, groupId: string) =>
  one<GroupAlerts>(db, 'select public.list_group_alerts($1, $2) as result', [actor, groupId], { denied: 'You are not a member of this group.' });

export const homeAlerts = (db: Db, actor: string) =>
  one<HomeAlert[]>(db, 'select public.my_group_alerts($1) as result', [actor], { denied: 'You do not have access to Community.' });

export async function answerAlert(db: Db, actor: string, groupId: string, areaKey: string, sign: string, answer: AlertAnswer | null): Promise<void> {
  await run(db, 'select public.answer_group_alert($1, $2, $3, $4, $5)', [actor, groupId, areaKey, sign, answer], { denied: WRITE_DENIED });
}

export const reportersForAdmin = (db: Db, actor: string, groupId: string) =>
  one<ReporterRow[]>(db, 'select public.list_group_reports_for_admin($1, $2) as result', [actor, groupId], { denied: 'Only the admin of this group can see who reported.' });

// ---- Moderation, official alerts and unread counts (migration 0014) ----

/** Reports a discussion post or reply to Mylkio staff. Anyone in the group may; not their own farm's. */
export async function flagItem(db: Db, actor: string, item: { postId?: string; replyId?: string }, reason: FlagReason): Promise<void> {
  await run(db, 'select public.flag_group_item($1, $2, $3, $4)', [actor, item.postId ?? null, item.replyId ?? null, reason], { denied: 'You are not a member of this group.' });
}

const GROUP_ADMIN_ONLY = { denied: 'Only the admin of this group can do this.' };

export async function moderateRemoveItem(db: Db, actor: string, groupId: string, item: { postId?: string; replyId?: string }): Promise<void> {
  await run(db, 'select public.moderate_remove_item($1, $2, $3, $4)', [actor, groupId, item.postId ?? null, item.replyId ?? null], GROUP_ADMIN_ONLY);
}

export async function moderateRemoveMember(db: Db, actor: string, groupId: string, farmId: string): Promise<void> {
  await run(db, 'select public.moderate_remove_member($1, $2, $3)', [actor, groupId, farmId], GROUP_ADMIN_ONLY);
}

export const groupMembersForAdmin = (db: Db, actor: string, groupId: string) =>
  one<GroupMemberRow[]>(db, 'select public.list_group_members_for_admin($1, $2) as result', [actor, groupId], GROUP_ADMIN_ONLY);

export async function markGroupRead(db: Db, actor: string, groupId: string): Promise<void> {
  await run(db, 'select public.mark_group_read($1, $2)', [actor, groupId], { denied: 'You are not a member of this group.' });
}

export const myOfficialAlerts = (db: Db, actor: string) =>
  one<OfficialAlert[]>(db, 'select public.my_official_alerts($1) as result', [actor], { denied: 'You do not have access to Community.' });

export const adminListFlags = (db: Db, actor: string) => one<AdminFlag[]>(db, 'select public.admin_list_flags($1) as result', [actor], ADMIN_ONLY);

export async function adminResolveFlags(db: Db, actor: string, item: { postId?: string; replyId?: string }, action: 'remove' | 'keep'): Promise<void> {
  await run(db, 'select public.admin_resolve_flags($1, $2, $3, $4)', [actor, item.postId ?? null, item.replyId ?? null, action], ADMIN_ONLY);
}

export interface OfficialAlertInput { county: string; title: string; body: string; sourceName: string; sourceUrl?: string; sourceDate: string; days: number }

export const adminCreateOfficialAlert = (db: Db, actor: string, a: OfficialAlertInput) =>
  one<string>(db, 'select public.admin_create_official_alert($1, $2, $3, $4, $5, $6, $7::date, $8) as result',
    [actor, a.county, a.title, a.body, a.sourceName, a.sourceUrl ?? null, a.sourceDate, a.days], ADMIN_ONLY);

export const adminListOfficialAlerts = (db: Db, actor: string) =>
  one<AdminOfficialAlert[]>(db, 'select public.admin_list_official_alerts($1) as result', [actor], ADMIN_ONLY);

export async function adminWithdrawOfficialAlert(db: Db, actor: string, id: string): Promise<void> {
  await run(db, 'select public.admin_withdraw_official_alert($1, $2)', [actor, id], ADMIN_ONLY);
}
