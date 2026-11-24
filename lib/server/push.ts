// Phone reminders on the server: saving a phone, and the daily job that sends each phone its morning summary.
// Free of Next.js imports so tests can run it against an in-memory Postgres with a pretend sender.

import webpush from 'web-push';
import type { Db } from './farm-api';
import { ApiError } from './errors';
import { SUPPORT_EMAIL } from '@/lib/contact';
import { digestMessage, type DigestMessage, type DigestReminder, type Lang } from '@/lib/reminder-push';

export interface PushTarget { endpoint: string; keys: { p256dh: string; auth: string } }

export async function savePhone(db: Db, actor: string, sub: PushTarget): Promise<void> {
  try {
    await db.query('select public.save_push_subscription($1, $2, $3, $4)', [actor, sub.endpoint, sub.keys.p256dh, sub.keys.auth]);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === '42501') throw new ApiError(403, 'A farm account is needed for phone reminders.');
    if (code === '22023') throw new ApiError(400, 'This phone could not be set up for reminders.');
    throw error;
  }
}

export async function removePhone(db: Db, actor: string, endpoint: string): Promise<void> {
  await db.query('select public.remove_push_subscription($1, $2)', [actor, endpoint]);
}

export async function phoneCount(db: Db, actor: string): Promise<number> {
  const [row] = await db.query<{ n: number }>('select public.my_push_count($1) as n', [actor]);
  return Number(row?.n ?? 0);
}

/** Sends one message to one phone. Throws with `statusCode` when the push service refuses it. */
export type Sender = (target: PushTarget, message: DigestMessage) => Promise<void>;

/** The real sender, with the keys from the environment. Null when the keys are not set (the job then does nothing). */
export function webPushSender(): Sender | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  webpush.setVapidDetails(`mailto:${SUPPORT_EMAIL}`, publicKey, privateKey);
  // A morning summary is no use by the evening: the push service drops it after 12 hours.
  return async (target, message) => { await webpush.sendNotification(target, JSON.stringify(message), { TTL: 12 * 3600 }); };
}

export interface RunResult { sent: number; dropped: number; failed: number }

/**
 * Sends each phone that has not had today's summary its farm's open reminders, marks those sent, and forgets phones the
 * push service says are gone (404 or 410). Any other failure is left for tomorrow's run. `day` is today in Nairobi.
 * shortcut: sends one by one in a single run, fine for a pilot's few hundred phones; batch it if it nears the time limit.
 */
export async function sendMorningReminders(db: Db, day: string, send: Sender): Promise<RunResult> {
  const rows = await db.query<{ subscription_id: string; endpoint: string; p256dh: string; auth: string; language: string; reminders: DigestReminder[] }>(
    'select * from public.push_digest_due($1::date)', [day]);
  const sent: string[] = []; const gone: string[] = []; let failed = 0;
  for (const row of rows) {
    const lang: Lang = row.language === 'sw' ? 'sw' : 'en';
    try {
      await send({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, digestMessage(row.reminders, lang, day));
      sent.push(row.subscription_id);
    } catch (error) {
      const status = (error as { statusCode?: number } | null)?.statusCode;
      if (status === 404 || status === 410) gone.push(row.subscription_id); else failed++;
    }
  }
  if (sent.length) await db.query('select public.mark_push_sent($1::uuid[], $2::date)', [sent, day]);
  if (gone.length) await db.query('select public.drop_push_subscriptions($1::uuid[])', [gone]);
  return { sent: sent.length, dropped: gone.length, failed };
}

/** Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". Anything else is refused, and so is a missing or short secret. */
export const cronAuthorized = (header: string | null, secret: string | undefined = process.env.CRON_SECRET) =>
  Boolean(secret && secret.length >= 16 && header === `Bearer ${secret}`);
