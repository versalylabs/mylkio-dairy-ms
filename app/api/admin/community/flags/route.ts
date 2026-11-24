import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { adminListFlags, adminResolveFlags } from '@/lib/server/community-api';
import { resolveInput } from '@/lib/server/community-schemas';

export const dynamic = 'force-dynamic';

// The staff review queue of reported posts and replies. The database checks the caller is a platform administrator.
export async function GET() {
  return endpoint(async () => {
    const { db, user } = await signedIn();
    return json({ flags: await adminListFlags(db, user.id) });
  });
}

/** Remove the reported post or reply, or keep it and close its reports. */
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { db, user } = await signedIn();
    const { action, ...item } = resolveInput.parse(await body(request));
    await adminResolveFlags(db, user.id, item, action);
    return json({ success: true });
  });
}
