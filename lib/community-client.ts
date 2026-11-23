// Browser-side helpers for the Community screens: calling the API and keeping the last things read on the phone.
//
// Reading works offline from the last copy; posting and replying need a connection and say so plainly. They are never
// queued, because an old post sent hours late is worse than none (docs/community-groups-design.md).

import type { CommunityCopy } from './community-copy';

export class CommunityError extends Error {
  constructor(message: string, readonly status: number, readonly offline = false) { super(message); }
}

export async function communityCall<T>(url: string, init: { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method ?? 'GET', cache: 'no-store',
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    // No connection (or the server could not be reached): the caller may show what it has kept.
    throw new CommunityError('offline', 0, true);
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new CommunityError((result as { error?: string }).error || 'failed', response.status);
  return result as T;
}

/**
 * What to tell the person when a call failed, in their language: the server's messages are English, so they are
 * matched by what happened (status) and replaced with the screen's own wording. `joining` is the join box, where a 400
 * means the code was wrong.
 */
export function describeError(e: unknown, t: CommunityCopy, fallback: string, joining = false): string {
  if (!(e instanceof CommunityError)) return fallback;
  if (e.offline) return t.offlineWrite;
  if (e.status === 429) return t.tooMany;
  if (e.status === 409) return /full/i.test(e.message) ? t.groupFull : t.tooManyGroups;
  if (e.status === 403) return /farm pro/i.test(e.message) ? t.notInPlan : t.noAccess;
  if (e.status === 400 && joining) return t.badInvite;
  return fallback;
}

// The cache key includes the signed-in account, so one person's groups are never shown under another's sign-in.
const key = (userId: string, part: string) => `mylkio_community_${userId}_${part}`;

export function readKept<T>(userId: string, part: string): T | null {
  try {
    const raw = window.localStorage.getItem(key(userId, part));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

export function keep(userId: string, part: string, value: unknown): void {
  try { window.localStorage.setItem(key(userId, part), JSON.stringify(value)); } catch { /* the phone is full or private: nothing is kept */ }
}

/** Forgets everything Community kept on this phone, for every account (called on sign-out, so a shared phone keeps nothing). */
export function forgetAll(): void {
  try {
    const mine: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const name = window.localStorage.key(i);
      if (name?.startsWith('mylkio_community_')) mine.push(name);
    }
    mine.forEach((name) => window.localStorage.removeItem(name));
  } catch { /* nothing to forget */ }
}

/** Forgets everything kept for an account (called when a farm leaves a group so removed content is not shown again). */
export function forget(userId: string, part: string): void {
  try { window.localStorage.removeItem(key(userId, part)); } catch { /* nothing to forget */ }
}
