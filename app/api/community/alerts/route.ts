import { endpoint, json } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { homeAlerts } from '@/lib/server/community-api';

export const dynamic = 'force-dynamic';

// For the Home screen: open outbreak alerts, in the farm's own county, across the groups it belongs to (not the ones it
// reported itself). Counts only. The plan and the farm are checked by the database.
export async function GET() {
  return endpoint(async () => {
    const { db, user } = await signedIn();
    return json({ alerts: await homeAlerts(db, user.id) });
  });
}
