import { z } from 'zod';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { createReply } from '@/lib/server/community-api';
import { replyInput } from '@/lib/server/community-schemas';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ postId: string }> };

/** A reply to a post. Owner or manager of a member farm; the database limits replies per farm per hour. */
export async function POST(request: Request, context: Context) {
  return endpoint(async () => {
    sameOrigin(request);
    const postId = z.uuid().parse((await context.params).postId);
    const { db, user } = await signedIn();
    const input = replyInput.parse(await body(request));
    return json({ id: await createReply(db, user.id, postId, input.body) }, 201);
  });
}
