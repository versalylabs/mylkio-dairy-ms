import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function database() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new ApiError(503, 'Secure account services are not configured yet. You can explore the demo.');
  const jar = await cookies();
  return createServerClient(url, key, {
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => values.forEach(({ name, value, options }) => jar.set(name, value, options)),
    },
  });
}

export async function authenticated() {
  const db = await database();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) throw new ApiError(401, 'Please sign in to continue.');
  return { db, user };
}

export async function farmAccess(farmId: string) {
  const context = await authenticated();
  const { data, error } = await context.db.from('farm_memberships')
    .select('role').eq('farm_id', farmId).eq('user_id', context.user.id).maybeSingle();
  if (error) throw new ApiError(503, 'Farm permissions could not be checked.');
  if (!data) throw new ApiError(403, 'You do not have access to this farm.');
  return { ...context, membership: data };
}

export async function adminAccess() {
  const context = await authenticated();
  const { data, error } = await context.db.from('profiles').select('role').eq('id', context.user.id).single();
  if (error || data?.role !== 'super_admin') throw new ApiError(403, 'Administrator access required.');
  return context;
}
