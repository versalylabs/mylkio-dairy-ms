import { z } from 'zod';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { answerAlert, groupAlerts } from '@/lib/server/community-api';
import { answerInput } from '@/lib/server/community-schemas';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ groupId: string }> };
const groupIdOf = async (context: Context) => z.uuid().parse((await context.params).groupId);

/** The group's outbreak alerts: counts by area for the last 7 days. No farm is named. Members' farms only. */
export async function GET(_request: Request, context: Context) {
  return endpoint(async () => {
    const groupId = await groupIdOf(context);
    const { db, user } = await signedIn();
    return json(await groupAlerts(db, user.id, groupId));
  });
}

/** "We see this too" or "Not here" for one alert (answer null takes it back). Counted, never named. */
export async function POST(request: Request, context: Context) {
  return endpoint(async () => {
    sameOrigin(request);
    const groupId = await groupIdOf(context);
    const { db, user } = await signedIn();
    const input = answerInput.parse(await body(request));
    await answerAlert(db, user.id, groupId, input.areaKey, input.sign, input.answer);
    return json({ success: true });
  });
}
