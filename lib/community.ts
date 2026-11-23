// Community groups (SACCO and area groups): the rules and shapes the server, the screens and the tests share.
// No browser or Next.js imports. The database enforces all of this (db/migrations/0012_community_groups.sql); the limits
// here mirror it so screens can show a counter and a test keeps the two in step. Design: docs/community-groups-design.md.

import { newInviteCode, normaliseInviteCode } from './team';
import { featuresFor } from './plans';

export type GroupKind = 'sacco' | 'area';
export type GroupRole = 'member' | 'admin';

/** Mirrors the limits in 0012: change both together. */
export const COMMUNITY_LIMITS = {
  postChars: 600,
  replyChars: 400,
  membersPerGroup: 300,
  groupsPerFarm: 5,
  postsPerHour: 10,
  repliesPerHour: 30,
  descriptionChars: 300,
  inviteMaxUses: 300,
  inviteMaxDays: 60,
} as const;

/** How often an open group looks for new posts (the app has no live connection), and on return to the app. */
export const REFRESH_SECONDS = 60;

export interface GroupSummary {
  id: string; name: string; kind: GroupKind; county: string; description: string | null; role: GroupRole;
  members: number; lastPostAt: string | null;
}
export interface GroupList { canPost: boolean; groups: GroupSummary[] }

export interface PostItem {
  id: string; kind: 'discussion' | 'outbreak' | 'official'; body: string; createdAt: string;
  authorName: string; farmName: string; mine: boolean; replyCount: number;
}
export interface GroupFeed {
  group: Omit<GroupSummary, 'lastPostAt'>; canPost: boolean; posts: PostItem[]; more: boolean;
}
export interface ReplyItem { id: string; body: string; createdAt: string; authorName: string; farmName: string; mine: boolean }
export interface PostThread {
  post: Omit<PostItem, 'replyCount'> & { groupId: string }; canPost: boolean; replies: ReplyItem[];
}

export interface AdminGroup {
  id: string; name: string; kind: GroupKind; county: string; description: string | null; archived: boolean; createdAt: string;
  members: number; openInvites: number;
}
export interface AdminInvite { id: string; role: GroupRole; label: string | null; uses: number; maxUses: number; createdAt: string; expiresAt: string }
export interface AdminGroupMember { farmId: string; farmName: string; county: string | null; subCounty: string | null; role: GroupRole; joinedAt: string }

/** Does this subscription include Community? The server checks this too; a hidden menu is never the protection. */
export const communityIncluded = (subscription: { plan: string; status?: string; renewsAt?: string } | null | undefined, now?: Date) =>
  featuresFor(subscription, now).community;

/** A group invitation code is made the same way as a team one (ten characters, no look-alike letters). */
export const newGroupCode = newInviteCode;
export const normaliseGroupCode = normaliseInviteCode;

/** The link staff share. It opens the app on the Community screen with the code filled in. */
export const groupLink = (origin: string, code: string) => `${origin.replace(/\/$/, '')}/?community=${encodeURIComponent(code)}`;

/** A post or reply as typed, with surrounding space removed and runs of blank lines kept to one. */
export const cleanText = (value: string) => value.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

/** Characters the database or a screen cannot take (NUL and other control characters, apart from new lines and tabs). */
export const hasBadCharacters = (value: string) => /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value);

/** "3 left" counters on the composer. Negative means too long. */
export const charsLeft = (value: string, max: number) => max - cleanText(value).length;

export const GROUP_KIND_LABEL: Record<GroupKind, { en: string; sw: string }> = {
  sacco: { en: 'SACCO or cooperative', sw: 'SACCO au ushirika' },
  area: { en: 'Area group', sw: 'Kikundi cha eneo' },
};

/** "5 min ago", "3 h ago", "2 days ago", or a date after a week: for the feed. */
export function agoLabel(iso: string, now: number, lang: 'en' | 'sw'): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return lang === 'sw' ? 'sasa hivi' : 'just now';
  if (minutes < 60) return lang === 'sw' ? `dakika ${minutes} zilizopita` : `${minutes} min ago`;
  if (minutes < 60 * 24) { const h = Math.round(minutes / 60); return lang === 'sw' ? `saa ${h} zilizopita` : `${h} h ago`; }
  const days = Math.round(minutes / 1440);
  if (days <= 7) return lang === 'sw' ? `siku ${days} zilizopita` : `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString(lang === 'sw' ? 'sw-KE' : 'en-KE', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', year: 'numeric' });
}
