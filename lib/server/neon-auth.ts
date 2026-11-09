import 'server-only';
import { createNeonAuth } from '@neon/auth/next/server';
import { ApiError } from './errors';
import { database } from './db';
import type { Db, SessionUser } from './farm-api';

/** Names (never values) of the settings this deployment cannot see or finds unusable. */
export function missingConfig(): string[] {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!process.env.NEON_AUTH_BASE_URL) missing.push('NEON_AUTH_BASE_URL');
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!secret) missing.push('NEON_AUTH_COOKIE_SECRET');
  else if (secret.length < 32) missing.push('NEON_AUTH_COOKIE_SECRET (shorter than 32 characters)');
  return missing;
}

export function authConfigured(): boolean {
  return missingConfig().length === 0;
}

let instance: ReturnType<typeof createNeonAuth> | null = null;

/** Created on first use, so builds and the demo work without Neon credentials. */
export function neonAuth() {
  if (!authConfigured()) throw new ApiError(503, 'Secure account services are not configured yet. You can explore the demo.');
  instance ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
  });
  return instance;
}

/** The signed-in user, verified by the Neon Auth server from the request cookies. */
export async function sessionUser(): Promise<SessionUser> {
  let result: Awaited<ReturnType<ReturnType<typeof neonAuth>['getSession']>>;
  try {
    result = await neonAuth().getSession();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, 'The sign-in service is unavailable. Please try again.');
  }
  const user = result.data?.user as { id?: unknown; email?: unknown; name?: unknown } | undefined;
  if (!user?.id) throw new ApiError(401, 'Please sign in to continue.');
  return { id: String(user.id), email: String(user.email ?? ''), name: String(user.name ?? '') };
}

/** Verified user plus database access, for routes that need both. */
export async function signedIn(): Promise<{ db: Db; user: SessionUser }> {
  const db = database();
  return { db, user: await sessionUser() };
}
