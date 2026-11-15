import { endpoint, json } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { adminCollections } from '@/lib/server/farm-api';

export const dynamic = 'force-dynamic';

export async function GET() {
  return endpoint(async () => {
    const { db, user } = await signedIn();
    return json({ collections: await adminCollections(db, user.id) });
  });
}
