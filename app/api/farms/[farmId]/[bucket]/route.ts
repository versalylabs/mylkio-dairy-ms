import { z } from 'zod';
import { farmAccess, ApiError } from '@/lib/server/supabase';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { bucketName, validBucketIdentity, writeBucket } from '@/lib/backend-contract';

export const dynamic = 'force-dynamic';
export async function PUT(request: Request, context: { params: Promise<{farmId: string; bucket: string}> }) {
  return endpoint(async () => {
    sameOrigin(request);
    const params = await context.params;
    const farmId = z.uuid().parse(params.farmId);
    const bucket = bucketName.parse(params.bucket);
    const { db } = await farmAccess(farmId);
    const input = writeBucket.parse(await body(request, 4 * 1024 * 1024));
    if (!validBucketIdentity(farmId, bucket, input.data)) throw new ApiError(400, 'Record identities do not match this farm.');
    const { data, error } = await db.rpc('write_farm_bucket', { p_farm: farmId, p_bucket: bucket, p_data: input.data, p_revision: input.revision });
    if (error?.code === '40001' || error?.code === 'P0001') throw new ApiError(409, 'This data changed on another device. Your local changes are retained for review.');
    if (error) throw error;
    return json({ revision: data });
  });
}
