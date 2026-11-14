import { z } from 'zod';
import { endpoint, json } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { adminUsage } from '@/lib/server/farm-api';
import { ApiError } from '@/lib/server/errors';

export const dynamic = 'force-dynamic';

// Usage "as at" a chosen moment (ISO time); omit `at` for now. The database function confirms the
// caller is a platform administrator.
export async function GET(request: Request) {
  return endpoint(async () => {
    const raw = new URL(request.url).searchParams.get('at');
    let at: string | undefined;
    if (raw) {
      const parsed = z.iso.datetime({ offset: true }).safeParse(raw);
      if (!parsed.success) throw new ApiError(400, 'Choose a valid date and time.');
      at = parsed.data;
    }
    const { db, user } = await signedIn();
    return json({ usage: await adminUsage(db, user.id, at) });
  });
}
