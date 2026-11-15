import { z } from 'zod';

// What the commercial-admin routes accept. The database checks the same limits again; these give a clear 400 first.

export const paymentMethod = z.enum(['mpesa', 'cash', 'bank', 'other']);

export const paymentInput = z.object({
  farmId: z.uuid(),
  amountKsh: z.number().int().min(1).max(1_000_000),
  method: paymentMethod,
  reference: z.string().trim().max(60).default(''),
  paidOn: z.iso.date(),
  months: z.number().int().min(1).max(12),
}).strict();

export const voidPaymentInput = z.object({
  paymentId: z.uuid(),
  reason: z.string().trim().min(3).max(200),
}).strict();

export const noteInput = z.object({
  farmId: z.uuid(),
  body: z.string().trim().min(1).max(500),
}).strict();

export const farmQuery = z.uuid();
