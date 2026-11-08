import { NextResponse } from 'next/server';
import { authConfigured } from '@/lib/server/neon-auth';

export const dynamic = 'force-dynamic';
export function GET() {
  return NextResponse.json({ configured: authConfigured() }, { headers: { 'Cache-Control': 'no-store' } });
}
