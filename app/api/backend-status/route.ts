import { NextResponse } from 'next/server';
import { missingConfig } from '@/lib/server/neon-auth';
import { inviteRequired } from '@/lib/server/invites';

export const dynamic = 'force-dynamic';
export function GET() {
  const missing = missingConfig();
  return NextResponse.json({ configured: missing.length === 0, inviteRequired: inviteRequired(), ...(missing.length ? { missing } : {}) }, { headers: { 'Cache-Control': 'no-store' } });
}
