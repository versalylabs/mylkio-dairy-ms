import { createHash } from 'node:crypto';
import { ApiError } from './errors';
import type { Db } from './farm-api';

// A limit on how often a wrong invitation code can be tried, for the pilot's farm-start codes and for team invitation
// codes. Both kinds of code are long and random, so guessing one is not practical, but "not practical" is not the same
// as "not allowed": after a handful of wrong tries from one account, or many from one network address, the server
// stops answering for a while, and the answer is the same whether or not the code was right.
//
// The count is of WRONG tries only (a right code never counts against anyone), kept in the database
// (`code_attempts`) so it holds across servers. The network address is stored only as a hash.

/** Wrong tries one signed-in account may make in the window before it is held. */
export const ACCOUNT_MAX_ATTEMPTS = 8;
/** Wrong tries one network address may make in the window (more than an account: a shared phone shop is one address). */
export const IP_MAX_ATTEMPTS = 30;
export const ATTEMPT_WINDOW_MINUTES = 15;
export const TOO_MANY_ATTEMPTS = 'Too many attempts. Please wait a few minutes and try again.';

export type CodeKind = 'join' | 'start';

/** A hash of the caller's network address (never the address itself), or null when the platform does not give one. */
export function ipHashOf(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || request.headers.get('x-real-ip')?.trim();
  if (!ip) return null;
  return createHash('sha256').update(`mylkio-ip:${ip}`).digest('hex').slice(0, 32);
}

export async function codeAttemptsBlocked(db: Db, actor: string, ipHash: string | null): Promise<boolean> {
  const rows = await db.query<{ blocked: boolean }>(
    'select public.code_attempts_blocked($1, $2, $3, $4, $5) as blocked',
    [actor, ipHash, ACCOUNT_MAX_ATTEMPTS, IP_MAX_ATTEMPTS, ATTEMPT_WINDOW_MINUTES],
  );
  return rows[0]?.blocked === true;
}

export async function recordCodeAttempt(db: Db, actor: string, ipHash: string | null, kind: CodeKind): Promise<void> {
  await db.query('select public.record_code_attempt($1, $2, $3)', [actor, ipHash, kind]);
}

/**
 * Runs `work` (which checks a code) unless this account or address has made too many wrong tries; if `work` fails
 * because the code was wrong, the try is counted. A failure to read or write the count never blocks a real person: the
 * limit is a safety net, so if the table cannot be reached the code check simply goes ahead.
 */
export async function withAttemptLimit<T>(
  db: Db, actor: string, ipHash: string | null, kind: CodeKind,
  isWrongCode: (error: unknown) => boolean, work: () => Promise<T>,
): Promise<T> {
  let blocked = false;
  try { blocked = await codeAttemptsBlocked(db, actor, ipHash); } catch { blocked = false; }
  if (blocked) throw new ApiError(429, TOO_MANY_ATTEMPTS);
  try {
    return await work();
  } catch (error) {
    if (isWrongCode(error)) { try { await recordCodeAttempt(db, actor, ipHash, kind); } catch { /* not counted; the real error still goes back */ } }
    throw error;
  }
}
