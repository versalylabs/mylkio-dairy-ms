import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export function GET() {
  return NextResponse.json({ configured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY) },
    { headers: { 'Cache-Control': 'no-store' } });
}
