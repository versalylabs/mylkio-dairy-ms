import { z } from 'zod';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { addMyVet, listMyVets, removeMyVet } from '@/lib/server/farm-api';
import { myVetInput } from '@/lib/server/vet-schemas';

export const dynamic = 'force-dynamic';

// A farm's own vet contacts. Farm membership is checked in the database functions.
export async function GET(_request: Request, context: { params: Promise<{ farmId: string }> }) {
  return endpoint(async () => {
    const farmId = z.uuid().parse((await context.params).farmId);
    const { db, user } = await signedIn();
    return json({ vets: await listMyVets(db, user.id, farmId) });
  });
}

export async function POST(request: Request, context: { params: Promise<{ farmId: string }> }) {
  return endpoint(async () => {
    sameOrigin(request);
    const farmId = z.uuid().parse((await context.params).farmId);
    const { db, user } = await signedIn();
    const id = await addMyVet(db, user.id, farmId, myVetInput.parse(await body(request)));
    return json({ id, vets: await listMyVets(db, user.id, farmId) });
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ farmId: string }> }) {
  return endpoint(async () => {
    sameOrigin(request);
    const farmId = z.uuid().parse((await context.params).farmId);
    const { db, user } = await signedIn();
    const { id } = z.object({ id: z.uuid() }).strict().parse(await body(request));
    await removeMyVet(db, user.id, farmId, id);
    return json({ vets: await listMyVets(db, user.id, farmId) });
  });
}
