import { z } from 'zod';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { adminListVets, adminSaveVet, adminSetVetStatus } from '@/lib/server/farm-api';
import { adminVetInput, vetStatus } from '@/lib/server/vet-schemas';

export const dynamic = 'force-dynamic';

// The database functions confirm the caller is a platform administrator.
export async function GET(request: Request) {
  return endpoint(async () => {
    const raw = new URL(request.url).searchParams.get('status');
    const status = raw ? vetStatus.parse(raw) : undefined;
    const { db, user } = await signedIn();
    return json({ vets: await adminListVets(db, user.id, status) });
  });
}

/** Adds an entry, or edits one when `id` is given. */
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { db, user } = await signedIn();
    const { id, ...entry } = adminVetInput.parse(await body(request));
    return json({ id: await adminSaveVet(db, user.id, id ?? null, entry) });
  });
}

export async function PATCH(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { db, user } = await signedIn();
    const input = z.object({ id: z.uuid(), status: vetStatus, confirmedOn: z.iso.date().nullable().optional() }).strict().parse(await body(request));
    await adminSetVetStatus(db, user.id, input.id, input.status, input.confirmedOn);
    return json({ success: true });
  });
}
