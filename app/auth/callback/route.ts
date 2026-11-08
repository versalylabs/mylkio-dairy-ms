import { NextResponse } from 'next/server';
import { database } from '@/lib/server/supabase';

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const code = url.searchParams.get('code');
    const token = url.searchParams.get('token_hash');
    const db = await database();
    const { error } = code ? await db.auth.exchangeCodeForSession(code)
      : token ? await db.auth.verifyOtp({ token_hash: token, type: 'email' })
      : { error: new Error('Missing confirmation') };
    if (!error) return NextResponse.redirect(new URL('/', url.origin), { headers: { 'Cache-Control': 'no-store' } });
  } catch { /* Return a safe confirmation failure, never token details. */ }
  return NextResponse.redirect(new URL('/?auth_error=confirmation', url.origin), { headers: { 'Cache-Control': 'no-store' } });
}
