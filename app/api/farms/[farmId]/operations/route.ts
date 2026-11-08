import { z } from 'zod';
import { ApiError, farmAccess } from '@/lib/server/supabase';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { MAX_REQUEST_BYTES, operationBatch, validOperationIdentity, type GroupResult } from '@/lib/backend-contract';

export const dynamic = 'force-dynamic';

/**
 * Applies a batch of record operations. Each group (one user action) is applied
 * all-or-nothing by `apply_farm_operations`; retried operations are recognised by
 * their opId and never applied twice.
 */
export async function POST(request: Request, context: { params: Promise<{ farmId: string }> }) {
  return endpoint(async () => {
    sameOrigin(request);
    const farmId = z.uuid().parse((await context.params).farmId);
    const { db } = await farmAccess(farmId);
    const { operations } = operationBatch.parse(await body(request, MAX_REQUEST_BYTES));
    if (!operations.every((op) => validOperationIdentity(farmId, op))) {
      throw new ApiError(400, 'Record identities do not match this farm.');
    }
    const { data, error } = await db.rpc('apply_farm_operations', { p_farm: farmId, p_ops: operations });
    if (error?.code === '42501') throw new ApiError(403, 'You do not have permission to change this farm.');
    if (error?.code === '22023') throw new ApiError(400, 'Some records could not be accepted.');
    if (error) throw error;
    return json({ results: data as GroupResult[] });
  });
}
