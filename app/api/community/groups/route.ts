import { endpoint, json } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { myGroups } from '@/lib/server/community-api';

export const dynamic = 'force-dynamic';

// The groups the caller's farm belongs to. Community is a Farm Pro and Custom feature: the database checks the plan
// (and that the caller is on a farm) on every call, so a farm without it gets a 403 here, not just a hidden menu item.
export async function GET() {
  return endpoint(async () => {
    const { db, user } = await signedIn();
    return json(await myGroups(db, user.id));
  });
}
