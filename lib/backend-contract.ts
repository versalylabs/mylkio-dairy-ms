import { z } from 'zod';

export const bucketNames = ['farm','cows','buyers','milk','deliveries','payments','health','breeding','expenses','reminders'] as const;
export type BucketName = typeof bucketNames[number];
export const bucketName = z.enum(bucketNames);
export const writeBucket = z.object({
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  data: z.union([z.array(z.record(z.string(), z.unknown())).max(10000), z.record(z.string(), z.unknown())]),
}).strict();

export function validBucketIdentity(farmId: string, bucket: BucketName, data: unknown): boolean {
  if (bucket === 'farm') return !!data && !Array.isArray(data) && typeof data === 'object' && (data as {id?: string}).id === farmId;
  if (!Array.isArray(data)) return false;
  const ids = new Set<string>();
  return data.every(row => {
    if (!row || typeof row !== 'object' || row.farmId !== farmId || typeof row.id !== 'string' || !row.id || row.id.length > 160 || ids.has(row.id)) return false;
    ids.add(row.id); return true;
  });
}
