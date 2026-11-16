// When a farm last made a backup, and when to remind the farmer. A backup is the farmer's own copy of the whole
// farm (a JSON file), kept outside the app: the last line of defence if a phone is lost, wiped or broken.

import { backupMessage, type Lang } from './app-copy';

const key = (farmId: string) => `mylkio_last_backup_${farmId}`;

export const BACKUP_REMINDER_DAYS = 30;
/** A farm with fewer records than this is not nagged about backups. */
export const BACKUP_MIN_RECORDS = 20;

/** Notes that a backup was just made. Never throws: this is only a reminder aid. */
export function rememberBackup(farmId: string | undefined, now: Date = new Date()) {
  if (!farmId) return;
  try { localStorage.setItem(key(farmId), now.toISOString()); } catch { /* Reminder only. */ }
}

export function lastBackupAt(farmId: string): string | null {
  try { return localStorage.getItem(key(farmId)); } catch { return null; }
}

export interface BackupAdvice { level: 'ok' | 'remind'; message: string }

/** What to tell the farmer about their backups. */
export function backupAdvice(lastIso: string | null, recordCount: number, now: Date = new Date(), lang: Lang = 'en'): BackupAdvice {
  if (!lastIso) {
    return recordCount >= BACKUP_MIN_RECORDS
      ? { level: 'remind', message: backupMessage(lang, 'never_many') }
      : { level: 'ok', message: backupMessage(lang, 'never_few') };
  }
  const ago = Math.max(0, Math.floor((now.getTime() - new Date(lastIso).getTime()) / 86_400_000));
  if (ago >= BACKUP_REMINDER_DAYS) return { level: 'remind', message: backupMessage(lang, 'old', ago) };
  return { level: 'ok', message: ago === 0 ? backupMessage(lang, 'today') : backupMessage(lang, 'recent', ago) };
}

/** "12.4 MB", "340 KB". */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
