// Database operations for Community groups (migration 0012). Like the rest of lib/server, this is free of Next.js and
// Neon Auth imports so tests can run it against an in-memory Postgres.
//
// The route verifies the session and passes the user id as `actor`. Every SQL function re-checks that the actor's farm
// is in the group, that its role may do this (workers read only) and that the plan includes Community, so a bug in a
// route cannot show one group's posts to another farm.

import { ApiError } from './errors';
import type { Db } from './farm-api';
import { COMMUNITY_LIMITS, type AdminGroup, type AdminGroupMember, type AdminInvite, type GroupFeed, type GroupKind, type GroupList, type GroupRole, type PostThread } from '@/lib/community';

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
