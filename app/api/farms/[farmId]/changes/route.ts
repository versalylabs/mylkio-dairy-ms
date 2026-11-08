import { z } from 'zod';
import { farmAccess } from '@/lib/server/supabase';
import { endpoint, json } from '@/lib/server/http';
import { CHANGES_PAGE_SIZE, type RecordChange } from '@/lib/backend-contract';

export const dynamic = 'force-dynamic';

/**
 * Records changed since a device's last download, in change order. Writers are
 * serialised per farm, so a page never skips a change that commits later.
 */
export async function GET(request: Request, context: { params: Promise<{ farmId: string }> }) {
  return endpoint(async () => {
    const farmId = z.uuid().parse((await context.params).farmId);
    const since = z.coerce.number().int().nonnegative().parse(new URL(request.url).searchParams.get('since') ?? 0);
    const { db } = await farmAccess(farmId);
    const { data, error } = await db
      .from('farm_records')
      .select('bucket,id,version,change_seq,deleted,data')
      .eq('farm_id', farmId)
      .gt('change_seq', since)
      .order('change_seq')
      .limit(CHANGES_PAGE_SIZE);
    if (error) throw error;
    const changes: RecordChange[] = data.map((row) => ({
      bucket: row.bucket, id: row.id, version: row.version, seq: row.change_seq, deleted: row.deleted, data: row.data,
    }));
    return json({
      changes,
      cursor: changes.length ? changes[changes.length - 1].seq : since,
      more: changes.length === CHANGES_PAGE_SIZE,
    });
  });
}
