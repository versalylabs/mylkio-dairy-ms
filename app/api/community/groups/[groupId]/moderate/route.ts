import { z } from 'zod';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { groupMembersForAdmin, moderateRemoveItem, moderateRemoveMember } from '@/lib/server/community-api';
import { itemInput } from '@/lib/server/community-schemas';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ groupId: string }> };
const groupIdOf = async (context: Context) => z.uuid().parse((await context.params).groupId);

// The group admin's tools. The database checks that the caller is an owner or manager of a farm that is this group's admin.

/** The member farms (names and places). */
export async function GET(_request: Request, context: Context) {
  return endpoint(async () => {
    const groupId = await groupIdOf(context);
    const { db, user } = await signedIn();
    return json({ members: await groupMembersForAdmin(db, user.id, groupId) });
  });
}

/** Removes a post or reply in the group, or takes a member farm out of it. */
export async function DELETE(request: Request, context: Context) {
  return endpoint(async () => {
    sameOrigin(request);
    const groupId = await groupIdOf(context);
    const { db, user } = await signedIn();
    const input = z.union([itemInput, z.object({ farmId: z.uuid() }).strict()]).parse(await body(request));
    if ('farmId' in input) await moderateRemoveMember(db, user.id, groupId, input.farmId);
    else await moderateRemoveItem(db, user.id, groupId, input);
    return json({ success: true });
  });
}
