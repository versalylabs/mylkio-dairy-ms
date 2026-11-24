import { endpoint, json } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { homeAlerts, myOfficialAlerts } from '@/lib/server/community-api';

export const dynamic = 'force-dynamic';

// For the Home screen: open outbreak alerts, in the farm's own county, across the groups it belongs to (not the ones it
// reported itself). Counts only. Also the official alerts showing in the counties of its groups. The plan and the farm are checked by the database.
export async function GET() {
  return endpoint(async () => {
    const { db, user } = await signedIn();
    const [alerts, official] = await Promise.all([homeAlerts(db, user.id), myOfficialAlerts(db, user.id)]);
    return json({ alerts, official });
  });
}
