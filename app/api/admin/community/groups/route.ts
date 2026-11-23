import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { adminListGroups, adminSaveGroup } from '@/lib/server/community-api';
import { groupInput } from '@/lib/server/community-schemas';

export const dynamic = 'force-dynamic';

// Staff create and edit the groups. The database functions confirm the caller is a platform administrator.
// Staff see group names and counts only, never what members write.
export async function GET() {
  return endpoint(async () => {
    const { db, user } = await signedIn();
    return json({ groups: await adminListGroups(db, user.id) });
  });
}

/** Creates a group, or edits one when `id` is given (`archived` hides it from members without deleting anything). */
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { db, user } = await signedIn();
    const { id, ...group } = groupInput.parse(await body(request));
    return json({ id: await adminSaveGroup(db, user.id, id ?? null, group) });
  });
}
