import { z } from 'zod';

export const bucketNames = ['farm','cows','buyers','milk','deliveries','payments','health','breeding','expenses','reminders'] as const;
export type BucketName = typeof bucketNames[number];
export const bucketName = z.enum(bucketNames);

/** Records that may only be created and then voided (see the per-record sync migration). */
export const appendOnlyBuckets: readonly BucketName[] = ['milk', 'deliveries', 'payments'];

export const MAX_OPERATIONS_PER_REQUEST = 500;
export const MAX_REQUEST_BYTES = 4 * 1024 * 1024;
export const MAX_RECORD_BYTES = 1024 * 1024;

const recordId = z.string().min(1).max(160);

export const recordOperation = z.object({
  opId: z.uuid(),
  groupId: z.uuid(),
  bucket: bucketName,
  recordId,
  action: z.enum(['upsert', 'delete']),
  baseVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  data: z.record(z.string(), z.unknown()).optional(),
}).strict();
export type RecordOperation = z.infer<typeof recordOperation>;

export const operationBatch = z.object({
  operations: z.array(recordOperation).min(1).max(MAX_OPERATIONS_PER_REQUEST),
}).strict();

/** Client and server both check that a record belongs to the farm it is written to. */
export function validOperationIdentity(farmId: string, op: RecordOperation): boolean {
  if (op.action === 'delete') return op.bucket !== 'farm' && op.data === undefined;
  if (!op.data || op.data.id !== op.recordId) return false;
  return op.bucket === 'farm' ? op.recordId === farmId : op.data.farmId === farmId;
}

export interface ServerRecord {
  version: number;
  deleted: boolean;
  data: Record<string, unknown>;
}

export type GroupResult =
  | { groupId: string; status: 'applied'; ops: { opId: string; version: number; seq: number; replayed?: boolean }[] }
  | { groupId: string; status: 'conflict'; conflicts: { opId: string; bucket: BucketName; recordId: string; reason: 'changed' | 'immutable'; server: ServerRecord | null }[] };

export interface RecordChange {
  bucket: BucketName;
  id: string;
  version: number;
  seq: number;
  deleted: boolean;
  data: Record<string, unknown>;
}

export const CHANGES_PAGE_SIZE = 1000;
