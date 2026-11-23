import { z } from 'zod';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { createPost } from '@/lib/server/community-api';
import { postInput } from '@/lib/server/community-schemas';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ groupId: string }> };

/** A new discussion post. Owner or manager of a member farm; the database limits posts per farm per hour. */
export async function POST(request: Request, context: Context) {
  return endpoint(async () => {
    sameOrigin(request);
    const groupId = z.uuid().parse((await context.params).groupId);
    const { db, user } = await signedIn();
    const input = postInput.parse(await body(request));
    return json({ id: await createPost(db, user.id, groupId, input.body) }, 201);
  });
}
