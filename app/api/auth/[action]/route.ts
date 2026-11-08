import { z } from 'zod';
import { authenticated, database, ApiError } from '@/lib/server/supabase';
import { account } from '@/lib/server/account';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
const credentials = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) });
const signup = credentials.extend({
  password: z.string().min(12).max(128), name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(32), farmName: z.string().trim().min(1).max(160),
  county: z.string().trim().min(1).max(80), subCounty: z.string().trim().max(80).optional(),
  plan: z.enum(['starter', 'farmer', 'farm_pro']).default('farmer'),
  language: z.enum(['en', 'sw']).default('en'),
});

export async function GET(_request: Request, context: { params: Promise<{ action: string }> }) {
  return endpoint(async () => {
    if ((await context.params).action !== 'session') throw new ApiError(404, 'Not found.');
    const { db, user } = await authenticated();
    return json({ user: await account(db, user) });
  });
}

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  return endpoint(async () => {
    sameOrigin(request);
    const { action } = await context.params;
    const db = await database();
    if (action === 'logout') {
      const { error } = await db.auth.signOut({ scope: 'local' });
      if (error) throw new ApiError(503, 'Could not sign out. Please retry.');
      return json({ success: true });
    }
    if (action === 'login') {
      const input = credentials.parse(await body(request));
      const { data, error } = await db.auth.signInWithPassword(input);
      if (error || !data.user) throw new ApiError(error?.status === 429 ? 429 : 401, 'Sign-in failed. Check your credentials and email confirmation.');
      return json({ success: true, user: await account(db, data.user) });
    }
    if (action === 'signup') {
      const input = signup.parse(await body(request));
      const appUrl = process.env.APP_URL;
      if (!appUrl) throw new ApiError(503, 'Account confirmation is not configured yet.');
      const { email, password, ...metadata } = input;
      const { data, error } = await db.auth.signUp({ email, password, options: {
        data: metadata, emailRedirectTo: `${new URL(appUrl).origin}/auth/callback`,
      } });
      if (error) throw new ApiError(error.status === 429 ? 429 : 400, 'Could not create account. Please try again or sign in.');
      if (!data.session || !data.user) return json({ success: true, confirmationRequired: true });
      return json({ success: true, user: await account(db, data.user) });
    }
    throw new ApiError(404, 'Not found.');
  });
}
