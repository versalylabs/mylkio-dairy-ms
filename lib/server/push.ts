// Phone reminders on the server: saving a phone, and the daily job that sends each phone its morning summary.
// Free of Next.js imports so tests can run it against an in-memory Postgres with a pretend sender.

import webpush from 'web-push';
import type { Db } from './farm-api';
import { ApiError } from './errors';
import { SUPPORT_EMAIL } from '@/lib/contact';
import { digestMessage, type DigestMessage, type DigestReminder, type Lang } from '@/lib/reminder-push';
import { officialMessage, outbreakMessage } from '@/lib/alert-push';

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
type Row = { subscription_id: string; endpoint: string; p256dh: string; auth: string; language: string };
const langOf = (row: Row): Lang => (row.language === 'sw' ? 'sw' : 'en');

/** Sends each row its message, forgets phones the push service says are gone, and returns the ids that were sent. */
async function deliver<R extends Row>(db: Db, rows: R[], messageFor: (row: R) => DigestMessage, send: Sender) {
  const sent: string[] = []; const gone: string[] = []; let failed = 0;
  for (const row of rows) {
    try {
      await send({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, messageFor(row));
      sent.push(row.subscription_id);
    } catch (error) {
      const status = (error as { statusCode?: number } | null)?.statusCode;
      if (status === 404 || status === 410) gone.push(row.subscription_id); else failed++;
    }
  }
  if (gone.length) await db.query('select public.drop_push_subscriptions($1::uuid[])', [gone]);
  return { sent, result: { sent: sent.length, dropped: gone.length, failed } };
}

export async function sendMorningReminders(db: Db, day: string, send: Sender): Promise<RunResult> {
  const rows = await db.query<Row & { reminders: DigestReminder[] }>('select * from public.push_digest_due($1::date)', [day]);
  const { sent, result } = await deliver(db, rows, (row) => digestMessage(row.reminders, langOf(row), day), send);
  if (sent.length) await db.query('select public.mark_push_sent($1::uuid[], $2::date)', [sent, day]);
  return result;
}

/** Right after staff post an official alert: every phone of every farm in a group of that county. */
export async function notifyOfficialAlert(db: Db, alert: { id: string; title: string; sourceName: string }, send: Sender): Promise<RunResult> {
  const rows = await db.query<Row>('select * from public.push_targets_for_official($1)', [alert.id]);
  return (await deliver(db, rows, (row) => officialMessage(alert, langOf(row)), send)).result;
}

/** Right after an outbreak report: the group's other farms in that county, only for signs new in that area this week. */
export async function notifyOutbreak(db: Db, postId: string, send: Sender): Promise<RunResult> {
  const rows = await db.query<Row & { area: string; group_name: string; signs: string[] }>('select * from public.push_targets_for_outbreak($1)', [postId]);
  return (await deliver(db, rows, (row) => outbreakMessage(row.area, row.group_name, row.signs, langOf(row)), send)).result;
}

/** Runs a notification job after the response is sent; a failure is logged, never shown to the person who posted. */
export async function quietly(job: () => Promise<unknown>): Promise<void> {
  try { await job(); } catch (error) { console.error('Mylkio alert notification failed:', (error as Error)?.message ?? error); }
}

/** Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". Anything else is refused, and so is a missing or short secret. */
export const cronAuthorized = (header: string | null, secret: string | undefined = process.env.CRON_SECRET) =>
  Boolean(secret && secret.length >= 16 && header === `Bearer ${secret}`);
