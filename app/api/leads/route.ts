import { z } from 'zod';
import { ApiError } from '@/lib/server/errors';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { database } from '@/lib/server/db';
import { submitLead } from '@/lib/server/farm-api';

export const dynamic = 'force-dynamic';

const input = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(5).max(32),
  county: z.string().trim().max(80).optional(),
  cowsCount: z.number().int().min(0).max(100000).optional(),
  preferredContact: z.enum(['whatsapp', 'call', 'sms']).default('call'),
  message: z.string().trim().max(2000).optional(),
  source: z.string().trim().max(80).default('website'),
  // Hidden field a person never fills in; many bots do.
  website: z.string().max(200).optional(),
}).strict();

/**
 * A website enquiry. Open to visitors who are not signed in, so it only accepts a small, strictly
 * validated message and the database limits how often one number can send one. The visitor is told
 * it was received only after it has actually been stored.
 */
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { website, ...lead } = input.parse(await body(request, 16 * 1024));
    if (website) return json({ success: true }); // A bot: look successful, store nothing.
    let db;
    try { db = database(); }
    catch (error) {
      if (error instanceof ApiError) throw new ApiError(503, 'Messages cannot be sent from this site yet. Please contact us on WhatsApp.');
      throw error;
    }
    await submitLead(db, lead);
    return json({ success: true });
  });
}
