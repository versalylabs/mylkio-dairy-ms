import { z } from 'zod';
import { endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { deleteReply } from '@/lib/server/community-api';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ replyId: string }> };

/** Deletes a reply the caller's farm wrote. */
export async function DELETE(request: Request, context: Context) {
  return endpoint(async () => {
    sameOrigin(request);
    const replyId = z.uuid().parse((await context.params).replyId);
    const { db, user } = await signedIn();
    await deleteReply(db, user.id, replyId);
    return json({ success: true });
  });
}
