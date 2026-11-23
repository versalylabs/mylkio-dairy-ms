import { z } from 'zod';
import { COMMUNITY_LIMITS, cleanText, hasBadCharacters } from '@/lib/community';

/** Text a farmer types: cleaned, not empty, within the limit and free of control characters. */
const text = (max: number) =>
  z.string().max(max * 3).transform(cleanText).pipe(
    z.string().min(1).max(max).refine((value) => !hasBadCharacters(value), 'Unsupported characters'));

export const postInput = z.object({ body: text(COMMUNITY_LIMITS.postChars) }).strict();
export const replyInput = z.object({ body: text(COMMUNITY_LIMITS.replyChars) }).strict();
export const joinInput = z.object({ code: z.string().trim().min(8).max(40) }).strict();
export const leaveInput = z.object({ deletePosts: z.boolean().default(false) }).strict();

const plain = (min: number, max: number) => z.string().trim().min(min).max(max).refine((value) => !hasBadCharacters(value), 'Unsupported characters');

export const groupInput = z.object({
  id: z.uuid().nullish(),
  name: plain(3, 80),
  kind: z.enum(['sacco', 'area']),
  county: plain(2, 80),
  description: plain(0, COMMUNITY_LIMITS.descriptionChars).default(''),
  archived: z.boolean().default(false),
}).strict();

export const inviteInput = z.object({
  role: z.enum(['member', 'admin']).default('member'),
  label: plain(0, 80).default(''),
  maxUses: z.number().int().min(1).max(COMMUNITY_LIMITS.inviteMaxUses).default(50),
  days: z.number().int().min(1).max(COMMUNITY_LIMITS.inviteMaxDays).default(30),
}).strict();
