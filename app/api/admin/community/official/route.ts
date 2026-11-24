import { z } from 'zod';
import { after } from 'next/server';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { notifyOfficialAlert, quietly, webPushSender } from '@/lib/server/push';
import { signedIn } from '@/lib/server/neon-auth';
import { adminCreateOfficialAlert, adminListOfficialAlerts, adminWithdrawOfficialAlert } from '@/lib/server/community-api';
import { officialAlertInput } from '@/lib/server/community-schemas';

export const dynamic = 'force-dynamic';

// Official alerts to every group in a county. Staff only; the database re-checks.
export async function GET() {
  return endpoint(async () => {
    const { db, user } = await signedIn();
    return json({ alerts: await adminListOfficialAlerts(db, user.id) });
  });
}

export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { db, user } = await signedIn();
    const input = officialAlertInput.parse(await body(request));
    const id = await adminCreateOfficialAlert(db, user.id, input);
    const send = webPushSender();
    if (send) after(() => quietly(() => notifyOfficialAlert(db, { id, title: input.title, sourceName: input.sourceName }, send)));
    return json({ id }, 201);
  });
}

/** Withdraws an alert: it stops showing at once. */
export async function DELETE(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { db, user } = await signedIn();
    const { id } = z.object({ id: z.uuid() }).strict().parse(await body(request));
    await adminWithdrawOfficialAlert(db, user.id, id);
    return json({ success: true });
  });
}
