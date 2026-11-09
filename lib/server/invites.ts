import { createHash, timingSafeEqual } from 'node:crypto';

// Invitation codes for starting a farm during the pilot.
//
// SIGNUP_INVITE_CODES holds one or more codes separated by commas, spaces or semicolons.
// While it is set, a new account can only create a farm with one of them. While it is empty
// or unset, sign-up is open. Anyone can still create a Neon Auth identity; that identity has
// no farm and so can read and write nothing. Codes are compared without regard to case or
// surrounding spaces, and in constant time. Free of Next.js imports so tests can cover it.

const normalise = (value: string) => value.trim().toUpperCase();
const digest = (value: string) => createHash('sha256').update(normalise(value)).digest();

export function inviteCodes(raw: string | undefined | null = process.env.SIGNUP_INVITE_CODES): string[] {
  return (raw ?? '').split(/[\s,;]+/).map((code) => code.trim()).filter(Boolean);
}

export function inviteRequired(raw: string | undefined | null = process.env.SIGNUP_INVITE_CODES): boolean {
  return inviteCodes(raw).length > 0;
}

export function inviteAccepted(provided: string | undefined | null, raw: string | undefined | null = process.env.SIGNUP_INVITE_CODES): boolean {
  const codes = inviteCodes(raw);
  if (codes.length === 0) return true;
  if (!provided || !provided.trim()) return false;
  const attempt = digest(provided);
  // Check every code so the time taken does not reveal which one matched.
  return codes.map((code) => timingSafeEqual(attempt, digest(code))).reduce((any, ok) => any || ok, false);
}
