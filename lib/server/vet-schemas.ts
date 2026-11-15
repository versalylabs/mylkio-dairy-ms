import { z } from 'zod';

// What the vet routes accept. The database checks the same limits again; these give a clear 400 first.

export const vetKind = z.enum(['veterinarian', 'animal_health_assistant', 'co_op_vet', 'agrovet', 'clinic']);

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || undefined);

const phone = z.string().trim().refine((value) => {
  const digits = value.replace(/[^0-9]/g, '').length;
  return digits >= 9 && digits <= 15 && value.length <= 30;
}, 'Enter a phone number with 9 to 15 digits.');

export const myVetInput = z.object({
  name: z.string().trim().min(2).max(120),
  kind: vetKind,
  phone,
  notes: optionalText(300),
}).strict();

export const vetSuggestionInput = z.object({
  name: z.string().trim().min(2).max(120),
  kind: vetKind,
  county: z.string().trim().min(2).max(80),
  areas: optionalText(300),
  phone,
  whatsapp: z.boolean().optional(),
  emergency: z.boolean().optional(),
  hours: optionalText(120),
  kvbRegNo: optionalText(40),
  notes: optionalText(500),
}).strict();

export const vetStatus = z.enum(['pending', 'confirmed', 'rejected', 'hidden']);

export const adminVetInput = vetSuggestionInput.extend({
  id: z.uuid().nullable().optional(),
  status: vetStatus,
  confirmedOn: z.iso.date().nullable().optional(),
}).strict();
