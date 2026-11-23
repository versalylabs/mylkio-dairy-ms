// More than one login per farm: roles, what each may see and change, and the invitation code.
// No browser or Next.js imports, so the server, the screens and the tests share one set of rules.
//
// The database enforces all of this (db/migrations/0008_team_logins.sql); this file mirrors it so screens can hide
// what a person cannot use, and a test keeps the two in step.

import type { BucketName } from './backend-contract';
import { bucketNames } from './backend-contract';

export type FarmRole = 'owner' | 'manager' | 'worker';
export const INVITABLE_ROLES: readonly FarmRole[] = ['manager', 'worker'];

export const ROLE_LABEL: Record<FarmRole, { en: string; sw: string }> = {
  owner: { en: 'Owner', sw: 'Mmiliki' },
  manager: { en: 'Manager', sw: 'Meneja' },
  worker: { en: 'Worker', sw: 'Mfanyakazi' },
};

export const ROLE_SUMMARY: Record<FarmRole, { en: string; sw: string }> = {
  owner: { en: 'Everything, including the team and the plan.', sw: 'Kila kitu, pamoja na timu na mpango.' },
  manager: { en: 'All farm records (milk, herd, sales and money). Not the team or the plan.', sw: 'Rekodi zote za shamba (maziwa, mifugo, mauzo na fedha). Si timu wala mpango.' },
  worker: { en: 'Daily work only: milk, cow health and breeding. Never sees money.', sw: 'Kazi ya kila siku tu: maziwa, afya ya ng’ombe na uzazi. Haoni fedha.' },
};

/** Total logins a plan includes, the owner counted as one. Mirrors team_limit() in the database. */
export const TEAM_LOGINS: Record<string, number> = { starter: 1, farmer: 1, farm_pro: 6, custom: 6 };
/** A Custom farm's own limit (set by an administrator) wins; otherwise the plan's. Mirrors team_limit_for_farm(). */
export const teamLoginsFor = (plan: string | undefined, customLimit?: number) =>
  (plan === 'custom' && customLimit && customLimit >= 1 ? customLimit : plan ? TEAM_LOGINS[plan] : undefined) ?? 1;

export const INVITE_DAYS = 7;

const WORKER_READS: readonly BucketName[] = ['farm', 'cows', 'milk', 'milkUse', 'health', 'breeding', 'reminders'];
const WORKER_WRITES: readonly BucketName[] = ['milk', 'milkUse', 'health', 'breeding', 'reminders'];

/** Mirrors role_can_read() in the database. */
export function canRead(role: FarmRole | undefined | null, bucket: BucketName): boolean {
  if (role === 'owner' || role === 'manager') return true;
  if (role === 'worker') return WORKER_READS.includes(bucket);
  return false;
}

/** Mirrors role_can_write() in the database. */
export function canWrite(role: FarmRole | undefined | null, bucket: BucketName): boolean {
  if (role === 'owner' || role === 'manager') return true;
  if (role === 'worker') return WORKER_WRITES.includes(bucket);
  return false;
}

export const allBuckets = bucketNames;

/** A person without a role (the demo, or an older cached login) is treated as the owner of their own farm. */
export const roleOrOwner = (role: string | undefined | null): FarmRole => (role === 'manager' || role === 'worker' ? role : 'owner');

export const canManageTeam = (role: FarmRole) => role === 'owner';
export const canSeeBilling = (role: FarmRole) => role === 'owner';
/** Sales (buyers, deliveries, bills, statements) and finance (payments, expenses) are for owner and manager. */
export const canSeeMoney = (role: FarmRole) => role === 'owner' || role === 'manager';

export type AppTab = 'home' | 'milk' | 'herd' | 'sales' | 'finance' | 'community' | 'settings';
/** Community is in everyone's menu (a worker may read the groups); a farm whose plan lacks it sees one calm line there. */
export const tabsFor = (role: FarmRole): AppTab[] =>
  canSeeMoney(role) ? ['home', 'milk', 'herd', 'sales', 'finance', 'community', 'settings'] : ['home', 'milk', 'herd', 'community', 'settings'];

// ── Invitation codes ─────────────────────────────────────────────────────────────────────────────────────

// Letters and digits that cannot be mistaken for each other when read aloud or copied from WhatsApp (no 0/O, 1/I/L).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 10;

/** Ten random characters from a secure source, shown as ABCDE-FGHJK. */
export function newInviteCode(random: (n: number) => Uint8Array): string {
  const bytes = random(INVITE_CODE_LENGTH * 2);
  let out = '';
  for (let i = 0; out.length < INVITE_CODE_LENGTH && i < bytes.length; i++) {
    // Rejection sampling: no modulo bias.
    if (bytes[i] < 248) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  if (out.length < INVITE_CODE_LENGTH) throw new Error('Not enough randomness for an invitation code.');
  return `${out.slice(0, 5)}-${out.slice(5)}`;
}

/** What a person typed, reduced to its letters and digits in capitals (dashes, spaces and case do not matter). */
export const normaliseInviteCode = (value: string) => value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
export const looksLikeInviteCode = (value: string) => normaliseInviteCode(value).length >= 8 && normaliseInviteCode(value).length <= 20;

/** The link the owner shares. It opens the home page on the "join this farm" step with the code filled in. */
export const inviteLink = (origin: string, code: string) => `${origin.replace(/\/$/, '')}/?join=${encodeURIComponent(code)}`;

export function inviteMessage(opts: { farmName: string; role: FarmRole; link: string; code: string; lang: 'en' | 'sw' }) {
  const role = ROLE_LABEL[opts.role][opts.lang].toLowerCase();
  return opts.lang === 'sw'
    ? `Habari! Nakualika kujiunga na shamba langu "${opts.farmName}" kwenye Mylkio kama ${role}. Fungua kiungo hiki ujisajili: ${opts.link}\nNambari ya mwaliko: ${opts.code}\nInafanya kazi kwa siku ${INVITE_DAYS}.`
    : `Hello! I am inviting you to join my farm "${opts.farmName}" on Mylkio as a ${role}. Open this link to sign up: ${opts.link}\nInvitation code: ${opts.code}\nIt works for ${INVITE_DAYS} days.`;
}
