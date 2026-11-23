import { z } from 'zod';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { getAccount, onboard } from '@/lib/server/farm-api';
import { ApiError } from '@/lib/server/errors';
import { inviteAccepted, inviteRequired } from '@/lib/server/invites';
import { ipHashOf, withAttemptLimit } from '@/lib/server/attempts';

export const dynamic = 'force-dynamic';

const input = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(32),
  farmName: z.string().trim().min(1).max(160),
  county: z.string().trim().min(1).max(80),
  subCounty: z.string().trim().max(80).optional(),
  plan: z.enum(['starter', 'farmer', 'farm_pro']).default('farmer'),
  language: z.enum(['en', 'sw']).default('en'),
  inviteCode: z.string().trim().max(64).optional(),
}).strict();

/**
 * Creates the signed-in user's farm. Repeating the request returns the existing farm. While
 * SIGNUP_INVITE_CODES is set, creating a new farm requires one of those codes.
 */
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { db, user } = await signedIn();
    const { inviteCode, ...details } = input.parse(await body(request));
    // A user who already has a farm just gets it back; only creating a new farm needs a code.
    const existing = await getAccount(db, user.id);
    if (existing?.farmId) return json({ user: existing });
    // While farm-start codes are required, wrong ones are counted and too many are held for a while.
    const check = async () => {
      if (!inviteAccepted(inviteCode)) throw new ApiError(403, 'That invitation code is not valid. Check it, or ask Mylkio for one.');
      return onboard(db, user, details);
    };
    if (!inviteRequired()) return json({ user: await check() });
    const wrongCode = (error: unknown) => error instanceof ApiError && error.status === 403;
    return json({ user: await withAttemptLimit(db, user.id, ipHashOf(request), 'start', wrongCode, check) });
  });
}
