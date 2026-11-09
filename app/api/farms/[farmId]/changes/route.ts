import { z } from 'zod';
import { endpoint, json } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { farmChanges } from '@/lib/server/farm-api';

export const dynamic = 'force-dynamic';

/** Records changed since a device's last download, in change order (membership checked in SQL). */
export async function GET(request: Request, context: { params: Promise<{ farmId: string }> }) {
  return endpoint(async () => {
    const farmId = z.uuid().parse((await context.params).farmId);
    const since = z.coerce.number().int().nonnegative().parse(new URL(request.url).searchParams.get('since') ?? 0);
    const { db, user } = await signedIn();
    return json(await farmChanges(db, user.id, farmId, since));
  });
}
