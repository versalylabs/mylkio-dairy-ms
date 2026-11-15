import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BACKUP_MIN_RECORDS, BACKUP_REMINDER_DAYS, backupAdvice, formatBytes, lastBackupAt, rememberBackup } from '@/lib/backup';
import { BACKUP_SCHEMA_VERSION, validateMigrationData } from '@/lib/migration-validation';
import { DataExporter } from '@/lib/export';
import { loadedStaticFiles } from '@/lib/offline-ready';

const NOW = new Date('2026-11-15T09:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

describe('when to remind about a backup', () => {
  it('stays quiet for a small farm that has never backed up, and speaks up once there is real data', () => {
    expect(backupAdvice(null, 3, NOW).level).toBe('ok');
    expect(backupAdvice(null, BACKUP_MIN_RECORDS, NOW).level).toBe('remind');
    expect(backupAdvice(null, BACKUP_MIN_RECORDS, NOW).message).toMatch(/not made a backup/);
  });

  it('reminds when the last backup is a month old, not before', () => {
    expect(backupAdvice(daysAgo(BACKUP_REMINDER_DAYS - 1), 500, NOW).level).toBe('ok');
    expect(backupAdvice(daysAgo(BACKUP_REMINDER_DAYS), 500, NOW)).toMatchObject({ level: 'remind', message: expect.stringContaining('30 days ago') });
  });

  it('says it in plain words for today, yesterday and earlier', () => {
    expect(backupAdvice(daysAgo(0), 500, NOW).message).toBe('You made a backup today.');
    expect(backupAdvice(daysAgo(1), 500, NOW).message).toBe('Your last backup was 1 day ago.');
    expect(backupAdvice(daysAgo(9), 500, NOW).message).toBe('Your last backup was 9 days ago.');
  });

  it('formats sizes a farmer can read', () => {
    expect(formatBytes(340 * 1024)).toBe('340 KB');
    expect(formatBytes(12.4 * 1024 * 1024)).toBe('12.4 MB');
    expect(formatBytes(4.2 * 1024 ** 3)).toBe('4.2 GB');
    expect(formatBytes(10)).toBe('1 KB');
  });

  it('never throws where there is no browser storage (the reminder is only an aid)', () => {
    expect(() => rememberBackup('farm-1')).not.toThrow();
    expect(() => rememberBackup(undefined)).not.toThrow();
    expect(lastBackupAt('farm-1')).toBeNull();
  });
});

describe('a backup the app makes can be restored by the app', () => {
  let captured: Blob | null = null;
  const saved = { window: (globalThis as { window?: unknown }).window, document: (globalThis as { document?: unknown }).document, create: URL.createObjectURL, revoke: URL.revokeObjectURL };

  beforeEach(() => {
    captured = null;
    (globalThis as { window?: unknown }).window = {};
    (globalThis as { document?: unknown }).document = {
      createElement: () => ({ click() {}, set href(_: string) {}, set download(_: string) {} }),
      body: { appendChild() {}, removeChild() {} },
    };
    URL.createObjectURL = ((blob: Blob) => { captured = blob; return 'blob:test'; }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = () => undefined;
  });
  afterEach(() => {
    (globalThis as { window?: unknown }).window = saved.window;
    (globalThis as { document?: unknown }).document = saved.document;
    URL.createObjectURL = saved.create; URL.revokeObjectURL = saved.revoke;
  });

  const farm = { id: 'farm-1', name: 'Green Hills' };
  const everything = (over: Record<string, unknown> = {}) => ({
    farm, cows: [{ id: 'c1', tag: 'GH-1', status: 'lactating' }], buyers: [{ id: 'b1', name: 'Co-op' }],
    milk: [{ id: 'm1', date: '2026-11-10', totalLitres: 20 }], deliveries: [], payments: [], health: [], breeding: [],
    expenses: [], reminders: [], statements: [], bills: [], allocations: [], ...over,
  });

  async function exported(over: Record<string, unknown> = {}) {
    DataExporter.exportFullBackupJSON(everything(over) as never);
    expect(captured).not.toBeNull();
    return JSON.parse(await captured!.text()) as Record<string, unknown>;
  }

  it('writes the version the restore check accepts (it used to write 3 and accept only 2)', async () => {
    const backup = await exported();
    expect(backup.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    const preview = validateMigrationData(backup, 'farm-1');
    expect(preview.errors).toEqual([]);
    expect(preview.counts).toMatchObject({ farm: 1, cows: 1, buyers: 1, milk: 1 });
  });

  it('still refuses a backup from a newer version of the app, with a clear reason', () => {
    const preview = validateMigrationData({ schemaVersion: BACKUP_SCHEMA_VERSION + 1, farm }, 'farm-1');
    expect(preview.errors.join(' ')).toMatch(/newer than this importer supports/);
  });

  it('accepts older backups (version 1 and 2) and ones with no version', () => {
    for (const v of [1, 2, undefined]) expect(validateMigrationData({ schemaVersion: v, farm }, 'farm-1').errors).toEqual([]);
  });

  it('does not refuse a big farm: only a single oversized record matters now that records sync one by one', () => {
    const milk = Array.from({ length: 50_000 }, (_, i) => ({ id: `m${i}`, date: '2026-11-10', totalLitres: 20, notes: 'a normal entry' }));
    expect(JSON.stringify(milk).length).toBeGreaterThan(3_500_000); // the old combined-size check refused this
    expect(validateMigrationData({ farm, milk }, 'farm-1').errors).toEqual([]);
  });

  it('does not refuse a backup because a cow has big photos; it says they will be shrunk', () => {
    const big = `data:image/jpeg;base64,${'A'.repeat(4_000_000)}`;
    const preview = validateMigrationData({ farm, cows: [{ id: 'c1', photoUrls: [big] }] }, 'farm-1');
    expect(preview.errors).toEqual([]);
    expect(preview.warnings.join(' ')).toMatch(/shrunk/);
  });

  it('still refuses a record with no picture that is too large for the cloud', () => {
    const preview = validateMigrationData({ farm, health: [{ id: 'h1', notes: 'x'.repeat(1_100_000) }] }, 'farm-1');
    expect(preview.errors.join(' ')).toMatch(/larger than the cloud accepts/);
  });

  it('refuses something that is not a backup', () => {
    expect(validateMigrationData([], 'farm-1').errors.length).toBeGreaterThan(0);
    expect(validateMigrationData({ cows: [] }, 'farm-1').errors.join(' ')).toMatch(/Farm profile is missing/);
  });
});

describe('opening the app with no internet', () => {
  it('hands the worker only this site\'s /_next/static/ files, once each', () => {
    const origin = 'https://mylkio-dairy-ms.vercel.app';
    const files = loadedStaticFiles([
      { name: `${origin}/_next/static/chunks/app-1.js` },
      { name: `${origin}/_next/static/chunks/app-1.js` },
      { name: `${origin}/_next/static/css/site.css?dpl=abc` },
      { name: `${origin}/_next/static/media/font.woff2` },
      { name: `${origin}/api/health` },
      { name: 'https://evil.example/_next/static/chunks/x.js' },
      { name: 'not a url at all' },
    ], origin);
    expect(files).toEqual(['/_next/static/chunks/app-1.js', '/_next/static/css/site.css?dpl=abc', '/_next/static/media/font.woff2']);
  });
});

describe('trying again when the files could not be saved', () => {
  it('waits a little longer each time, then stops', async () => {
    const { retryDelay, RETRY_AFTER_SECONDS } = await import('@/lib/offline-ready');
    const delays = [0, 1, 2, 3].map(retryDelay);
    expect(delays).toEqual(RETRY_AFTER_SECONDS.map((s) => s * 1000));
    expect([...delays].sort((a, b) => (a as number) - (b as number))).toEqual(delays);
    expect(retryDelay(4)).toBeNull();
    expect(retryDelay(-1)).toBeNull();
  });
});
