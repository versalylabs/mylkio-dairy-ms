import { z } from 'zod';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { groupFeed, leaveGroup } from '@/lib/server/community-api';
import { leaveInput } from '@/lib/server/community-schemas';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ groupId: string }> };
const groupIdOf = async (context: Context) => z.uuid().parse((await context.params).groupId);

/** The newest posts of a group (`?before=` for older ones). Members' farms only; a worker may read. */
export async function GET(request: Request, context: Context) {
  return endpoint(async () => {
    const groupId = await groupIdOf(context);
    const before = z.iso.datetime({ offset: true }).nullable().parse(new URL(request.url).searchParams.get('before'));
    const { db, user } = await signedIn();
    return json(await groupFeed(db, user.id, groupId, before));
  });
}

/** Leaves the group (owner or manager), and optionally deletes the farm's posts and replies there. */
export async function DELETE(request: Request, context: Context) {
  return endpoint(async () => {
    sameOrigin(request);
    const groupId = await groupIdOf(context);
    const { db, user } = await signedIn();
    const { deletePosts } = leaveInput.parse(await body(request));
    await leaveGroup(db, user.id, groupId, deletePosts);
    return json({ success: true });
  });
}
