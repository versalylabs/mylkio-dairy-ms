import { NextResponse } from 'next/server';
import { database } from '@/lib/server/db';
import { cronAuthorized, sendMorningReminders, webPushSender } from '@/lib/server/push';
import { describeError } from '@/lib/server/http';
import { farmToday } from '@/lib/dates';

export const dynamic = 'force-dynamic';

// The morning job (vercel.json, 03:30 UTC = 06:30 Nairobi). Only Vercel Cron, with the CRON_SECRET, may run it.
export async function GET(request: Request) {
  if (!cronAuthorized(request.headers.get('authorization'))) return NextResponse.json({ error: 'Not allowed.' }, { status: 401 });
  const send = webPushSender();
  if (!send) return NextResponse.json({ error: 'Phone reminders are not configured.' }, { status: 503 });
  try {
    return NextResponse.json(await sendMorningReminders(database(), farmToday(), send));
  } catch (error) {
    console.error('Mylkio morning reminders failed:', describeError(error));
    return NextResponse.json({ error: 'The reminders could not be sent.' }, { status: 500 });
  }
}
