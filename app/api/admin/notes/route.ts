import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { adminAddNote, adminListNotes } from '@/lib/server/farm-api';
import { farmQuery, noteInput } from '@/lib/server/billing-schemas';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return endpoint(async () => {
    const farmId = farmQuery.parse(new URL(request.url).searchParams.get('farmId'));
    const { db, user } = await signedIn();
    return json({ notes: await adminListNotes(db, user.id, farmId) });
  });
}

export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { db, user } = await signedIn();
    const input = noteInput.parse(await body(request));
    return json({ id: await adminAddNote(db, user.id, input.farmId, input.body) });
  });
}
