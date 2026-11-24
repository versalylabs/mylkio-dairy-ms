import { z } from 'zod';
import { COMMUNITY_LIMITS, FLAG_REASONS, cleanText, hasBadCharacters } from '@/lib/community';
import { REPORT_LIMITS, SIGN_IDS } from '@/lib/community-outbreak';

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

// ---- Outbreak reports (migration 0013). The sign ids must be ones in the vet guide's list. ----

const signId = z.string().refine((id) => SIGN_IDS.has(id), 'Unknown sign');

export const reportInput = z.object({
  signs: z.array(signId).min(1).max(REPORT_LIMITS.maxSigns).refine((signs) => new Set(signs).size === signs.length, 'Repeated sign'),
  animals: z.number().int().min(1).max(REPORT_LIMITS.maxAnimals),
  days: z.number().int().min(0).max(REPORT_LIMITS.maxDays),
  seenOn: z.iso.date(),
  vetSeen: z.enum(['yes', 'called', 'no']),
}).strict();

export const answerInput = z.object({
  areaKey: z.string().trim().min(1).max(120).refine((value) => !hasBadCharacters(value), 'Unsupported characters'),
  sign: signId,
  answer: z.enum(['also', 'not_here']).nullable(),
}).strict();

// ---- Moderation and official alerts (migration 0014) ----

/** Exactly one of a post or a reply. */
export const itemInput = z.union([z.object({ postId: z.uuid() }).strict(), z.object({ replyId: z.uuid() }).strict()]);

export const flagInput = z.union([
  z.object({ postId: z.uuid(), reason: z.enum(FLAG_REASONS) }).strict(),
  z.object({ replyId: z.uuid(), reason: z.enum(FLAG_REASONS) }).strict(),
]);

export const resolveInput = z.union([
  z.object({ postId: z.uuid(), action: z.enum(['remove', 'keep']) }).strict(),
  z.object({ replyId: z.uuid(), action: z.enum(['remove', 'keep']) }).strict(),
]);

export const officialAlertInput = z.object({
  county: plain(2, 80),
  title: plain(3, 120),
  body: plain(1, 1000),
  sourceName: plain(2, 160),
  // An empty link is the same as none.
  sourceUrl: z.string().trim().max(500).transform((v) => v || undefined).pipe(z.string().startsWith('https://', 'Use an https link').optional()).optional(),
  sourceDate: z.iso.date(),
  days: z.number().int().min(1).max(90).default(30),
}).strict();
