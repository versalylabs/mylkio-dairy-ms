import { endpoint, json } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { adminSubscriptionHistory } from '@/lib/server/farm-api';
import { farmQuery } from '@/lib/server/billing-schemas';

export const dynamic = 'force-dynamic';

/** The history of a farm's plan, price and status changes (by hand and from payments). The database confirms the caller is an administrator. */
export async function GET(request: Request) {
  return endpoint(async () => {
    const farmId = farmQuery.parse(new URL(request.url).searchParams.get('farmId'));
    const { db, user } = await signedIn();
    return json({ changes: await adminSubscriptionHistory(db, user.id, farmId) });
  });
}
