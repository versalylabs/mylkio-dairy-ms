import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { adminCreateGroupInvite, adminGroupInvites, adminGroupMembers, adminRemoveGroupMember, adminRevokeGroupInvite } from '@/lib/server/community-api';
import { inviteInput } from '@/lib/server/community-schemas';
import { newGroupCode } from '@/lib/community';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ groupId: string }> };
const groupIdOf = async (context: Context) => z.uuid().parse((await context.params).groupId);

/** The open invitations and the farms of one group (names and places only). */
export async function GET(_request: Request, context: Context) {
  return endpoint(async () => {
    const groupId = await groupIdOf(context);
    const { db, user } = await signedIn();
    const [invites, members] = await Promise.all([adminGroupInvites(db, user.id, groupId), adminGroupMembers(db, user.id, groupId)]);
    return json({ invites, members });
  });
}

/** A new invitation link. The one-time code is returned once, here, and kept only as a hash. */
export async function POST(request: Request, context: Context) {
  return endpoint(async () => {
    sameOrigin(request);
    const groupId = await groupIdOf(context);
    const { db, user } = await signedIn();
    const input = inviteInput.parse(await body(request));
    const code = newGroupCode((n) => randomBytes(n));
    await adminCreateGroupInvite(db, user.id, groupId, input, code);
    return json({ code, days: input.days, maxUses: input.maxUses, role: input.role }, 201);
  });
}

/** Withdraws an invitation, or takes a farm out of the group. */
export async function DELETE(request: Request, context: Context) {
  return endpoint(async () => {
    sameOrigin(request);
    const groupId = await groupIdOf(context);
    const { db, user } = await signedIn();
    const input = z.union([
      z.object({ inviteId: z.uuid() }).strict(),
      z.object({ farmId: z.uuid() }).strict(),
    ]).parse(await body(request));
    if ('inviteId' in input) await adminRevokeGroupInvite(db, user.id, input.inviteId);
    else await adminRemoveGroupMember(db, user.id, groupId, input.farmId);
    return json({ success: true });
  });
}
