import { z } from 'zod';
import { ApiError } from '@/lib/server/errors';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { adminListAccounts, adminUpdateSubscription } from '@/lib/server/farm-api';

export const dynamic = 'force-dynamic';

// The database functions confirm the caller is a platform administrator.
export async function GET() {
  return endpoint(async () => {
    const { db, user } = await signedIn();
    return json({ accounts: await adminListAccounts(db, user.id) });
  });
}

export async function PATCH(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { db, user } = await signedIn();
    const input = z.object({
      farmId: z.uuid(),
      plan: z.enum(['starter', 'farmer', 'farm_pro', 'custom']),
      status: z.enum(['trial', 'active', 'past_due', 'cancelled']),
      // Custom plan only: the price agreed with this farm, what was agreed, and how many logins it has.
      monthlyPriceKsh: z.number().int().min(1).max(1_000_000).optional(),
      note: z.string().trim().max(500).optional(),
      teamLimit: z.number().int().min(1).max(100).optional(),
    }).strict().parse(await body(request));
    if (input.plan !== 'custom' && (input.monthlyPriceKsh !== undefined || input.note !== undefined || input.teamLimit !== undefined)) {
      throw new ApiError(400, 'A price, note or team size can only be set on a Custom plan.');
    }
    await adminUpdateSubscription(db, user.id, input.farmId, input.plan, input.status,
      { monthlyPriceKsh: input.monthlyPriceKsh, note: input.note, teamLimit: input.teamLimit });
    return json({ success: true });
  });
}
