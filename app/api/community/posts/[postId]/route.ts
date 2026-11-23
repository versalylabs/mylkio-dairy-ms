import { z } from 'zod';
import { endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { deletePost, postThread } from '@/lib/server/community-api';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ postId: string }> };
const postIdOf = async (context: Context) => z.uuid().parse((await context.params).postId);

/** One post with its replies. Members' farms only. */
export async function GET(_request: Request, context: Context) {
  return endpoint(async () => {
    const postId = await postIdOf(context);
    const { db, user } = await signedIn();
    return json(await postThread(db, user.id, postId));
  });
}

/** Deletes a post the caller's farm wrote (its replies go with it). */
export async function DELETE(request: Request, context: Context) {
  return endpoint(async () => {
    sameOrigin(request);
    const postId = await postIdOf(context);
    const { db, user } = await signedIn();
    await deletePost(db, user.id, postId);
    return json({ success: true });
  });
}
