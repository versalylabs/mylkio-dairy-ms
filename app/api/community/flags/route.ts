import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { flagItem } from '@/lib/server/community-api';
import { flagInput } from '@/lib/server/community-schemas';

export const dynamic = 'force-dynamic';

/** Reports a discussion post or reply to Mylkio staff, with a reason. Anyone in the group may, workers included. */
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { db, user } = await signedIn();
    const { reason, ...item } = flagInput.parse(await body(request));
    await flagItem(db, user.id, item, reason);
    return json({ success: true });
  });
}
