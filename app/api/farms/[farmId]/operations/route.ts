import { z } from 'zod';
import { ApiError } from '@/lib/server/errors';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { applyOperations } from '@/lib/server/farm-api';
import { MAX_REQUEST_BYTES, operationBatch, validOperationIdentity } from '@/lib/backend-contract';

export const dynamic = 'force-dynamic';

/**
 * Applies a batch of record operations. Each group (one user action) is applied
 * all-or-nothing by `apply_farm_operations`; retried operations are recognised by
 * their opId and never applied twice. The function also confirms farm membership.
 */
export async function POST(request: Request, context: { params: Promise<{ farmId: string }> }) {
  return endpoint(async () => {
    sameOrigin(request);
    const farmId = z.uuid().parse((await context.params).farmId);
    const { db, user } = await signedIn();
    const { operations } = operationBatch.parse(await body(request, MAX_REQUEST_BYTES));
    if (!operations.every((op) => validOperationIdentity(farmId, op))) {
      throw new ApiError(400, 'Record identities do not match this farm.');
    }
    return json({ results: await applyOperations(db, user.id, farmId, operations) });
  });
}
