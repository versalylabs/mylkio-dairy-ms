import { z } from 'zod';
import { farmAccess } from '@/lib/server/supabase';
import { endpoint, json } from '@/lib/server/http';
import { bucketNames, type BucketName } from '@/lib/backend-contract';

export const dynamic = 'force-dynamic';
export async function GET(_request: Request, context: { params: Promise<{farmId: string}> }) {
  return endpoint(async () => {
    const farmId = z.uuid().parse((await context.params).farmId);
    const { db } = await farmAccess(farmId);
    const table: Partial<Record<BucketName, string>> = {
      cows: 'cows', buyers: 'buyers', milk: 'milk_entries', deliveries: 'deliveries', payments: 'payments',
      health: 'health_events', breeding: 'breeding_events', expenses: 'expenses', reminders: 'reminders',
    };
    const buckets = await Promise.all(bucketNames.map(async bucket => {
      if (bucket === 'farm') {
        const [farm, state] = await Promise.all([
          db.from('farms').select('data').eq('id', farmId).single(),
          db.from('farm_sync_state').select('revision').eq('farm_id', farmId).eq('bucket', bucket).maybeSingle(),
        ]);
        if (farm.error || state.error) throw farm.error || state.error;
        return { bucket, data: farm.data.data, revision: state.data?.revision ?? 0 };
      }
      const [records, state] = await Promise.all([
        db.from(table[bucket]!).select('data').eq('farm_id', farmId),
        db.from('farm_sync_state').select('revision').eq('farm_id', farmId).eq('bucket', bucket).maybeSingle(),
      ]);
      if (records.error || state.error) throw records.error || state.error;
      return { bucket, data: records.data.map(row => row.data), revision: state.data?.revision ?? 0 };
    }));
    return json({ buckets });
  });
}
