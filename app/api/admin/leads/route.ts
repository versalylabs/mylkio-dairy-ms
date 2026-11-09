import { z } from 'zod';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { adminListLeads, adminSetLeadStatus } from '@/lib/server/farm-api';

export const dynamic = 'force-dynamic';

// The database functions confirm the caller is a platform administrator.
export async function GET() {
  return endpoint(async () => {
    const { db, user } = await signedIn();
    return json({ leads: await adminListLeads(db, user.id) });
  });
}

export async function PATCH(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { db, user } = await signedIn();
    const input = z.object({ leadId: z.uuid(), status: z.enum(['new', 'contacted', 'converted', 'archived']) }).strict().parse(await body(request));
    await adminSetLeadStatus(db, user.id, input.leadId, input.status);
    return json({ success: true });
  });
}
