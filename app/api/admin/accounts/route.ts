import { z } from 'zod';
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
      plan: z.enum(['starter', 'farmer', 'farm_pro']),
      status: z.enum(['trial', 'active', 'past_due', 'cancelled']),
    }).strict().parse(await body(request));
    await adminUpdateSubscription(db, user.id, input.farmId, input.plan, input.status);
    return json({ success: true });
  });
}
