import { z } from 'zod';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { REPORTS_CLOSED_MESSAGE, createOutbreakReport, reportersForAdmin } from '@/lib/server/community-api';
import { reportInput } from '@/lib/server/community-schemas';
import { ApiError } from '@/lib/server/errors';
import { outbreakReportsOpen } from '@/lib/community-outbreak';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ groupId: string }> };
const groupIdOf = async (context: Context) => z.uuid().parse((await context.params).groupId);

/**
 * A new outbreak report from the caller's farm (owner or manager of a member farm). Reporting stays closed until a
 * veterinarian has approved the health guide it is built on (lib/community-outbreak.ts), and the server enforces that
 * here, not only on the screen. The area is read from the farm's own profile by the database.
 */
export async function POST(request: Request, context: Context) {
  return endpoint(async () => {
    sameOrigin(request);
    const groupId = await groupIdOf(context);
    const { db, user } = await signedIn();
    if (!outbreakReportsOpen()) throw new ApiError(403, REPORTS_CLOSED_MESSAGE);
    const input = reportInput.parse(await body(request));
    return json({ id: await createOutbreakReport(db, user.id, groupId, input) }, 201);
  });
}

/** Which farm made each report in the last 30 days. Only for an owner or manager of a farm that is this group's admin. */
export async function GET(_request: Request, context: Context) {
  return endpoint(async () => {
    const groupId = await groupIdOf(context);
    const { db, user } = await signedIn();
    return json({ reports: await reportersForAdmin(db, user.id, groupId) });
  });
}
