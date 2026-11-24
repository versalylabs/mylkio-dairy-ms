import { z } from 'zod';
import { endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { markGroupRead } from '@/lib/server/community-api';

export const dynamic = 'force-dynamic';

/** Marks the group as read for the signed-in person, so its unread count starts again from now. */
export async function POST(request: Request, context: { params: Promise<{ groupId: string }> }) {
  return endpoint(async () => {
    sameOrigin(request);
    const groupId = z.uuid().parse((await context.params).groupId);
    const { db, user } = await signedIn();
    await markGroupRead(db, user.id, groupId);
    return json({ success: true });
  });
}
