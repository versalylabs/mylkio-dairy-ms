import { z } from 'zod';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { phoneCount, removePhone, savePhone } from '@/lib/server/push';

export const dynamic = 'force-dynamic';

const target = z.object({
  endpoint: z.url().startsWith('https://').max(1000),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(10).max(100) }).strip(),
}).strip();

/** How many phones the signed-in person has turned reminders on for. */
export async function GET() {
  return endpoint(async () => {
    const { db, user } = await signedIn();
    return json({ count: await phoneCount(db, user.id) });
  });
}

/** Turns morning reminders on for this phone (the browser's push subscription). */
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { db, user } = await signedIn();
    await savePhone(db, user.id, target.parse(await body(request)));
    return json({ success: true });
  });
}

/** Turns them off for this phone. */
export async function DELETE(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { db, user } = await signedIn();
    const { endpoint: address } = z.object({ endpoint: z.string().max(1000) }).strip().parse(await body(request));
    await removePhone(db, user.id, address);
    return json({ success: true });
  });
}
