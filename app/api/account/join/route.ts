import { z } from 'zod';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { acceptInvite, getAccount } from '@/lib/server/farm-api';
import { ApiError } from '@/lib/server/errors';
import { ipHashOf, withAttemptLimit } from '@/lib/server/attempts';

export const dynamic = 'force-dynamic';

const input = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(32),
  code: z.string().trim().min(8).max(40),
}).strict();

/**
 * Joins the signed-in person to the farm an invitation code belongs to, as the role the owner chose. Repeating the
 * request for someone who already belongs to a farm just returns that farm. The code is what proves they were invited:
 * signing up alone gives access to nothing.
 */
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { db, user } = await signedIn();
    const details = input.parse(await body(request));
    const existing = await getAccount(db, user.id);
    if (existing?.farmId) return json({ user: existing });
    // A wrong, used, expired or withdrawn code is a 400 and counts as a wrong try; too many tries are held for a while.
    const wrongCode = (error: unknown) => error instanceof ApiError && error.status === 400;
    return json({ user: await withAttemptLimit(db, user.id, ipHashOf(request), 'join', wrongCode, () => acceptInvite(db, user, details)) });
  });
}
