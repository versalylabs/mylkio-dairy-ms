import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { joinGroup } from '@/lib/server/community-api';
import { joinInput } from '@/lib/server/community-schemas';
import { ApiError } from '@/lib/server/errors';
import { ipHashOf, withAttemptLimit } from '@/lib/server/attempts';

export const dynamic = 'force-dynamic';

/**
 * Joins the caller's farm to the group an invitation link belongs to (owner or manager only). A wrong, used, expired or
 * withdrawn code is a 400 and counts as a wrong try, with the same limits as team invitations (migration 0011).
 */
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { db, user } = await signedIn();
    const { code } = joinInput.parse(await body(request));
    const wrongCode = (error: unknown) => error instanceof ApiError && error.status === 400;
    const groupId = await withAttemptLimit(db, user.id, ipHashOf(request), 'join', wrongCode, () => joinGroup(db, user.id, code));
    return json({ groupId });
  });
}
