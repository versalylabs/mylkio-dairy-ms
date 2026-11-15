import { bucketNames, MAX_RECORD_BYTES, type BucketName } from './backend-contract';

/** The newest backup format this app can read. It is the format `exportFullBackupJSON` writes (lib/export.ts). */
export const BACKUP_SCHEMA_VERSION = 3;

export type MigrationData = { farm: Record<string, unknown>; [key: string]: unknown };
export type MigrationPreview = {
  counts: Partial<Record<BucketName, number>>;
  conflicts: number;
  errors: string[];
  warnings: string[];
  financial: { buyerId: string; buyerName: string; recordedBalance: number; deliveryBalance: number; gap: number }[];
};

const arrayBuckets = bucketNames.filter((bucket): bucket is Exclude<BucketName, 'farm'> => bucket !== 'farm');

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${stable(object[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function validateMigrationData(value: unknown, targetFarmId: string, remote: Partial<Record<BucketName, unknown>> = {}): MigrationPreview {
  const preview: MigrationPreview = { counts: {}, conflicts: 0, errors: [], warnings: [], financial: [] };
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    preview.errors.push('Backup must be a JSON object.'); return preview;
  }
  const data = value as Record<string, unknown>;
  if (typeof data.schemaVersion === 'number' && data.schemaVersion > BACKUP_SCHEMA_VERSION) preview.errors.push(`Backup schema version ${data.schemaVersion} is newer than this importer supports.`);
  if (!data.farm || typeof data.farm !== 'object' || Array.isArray(data.farm)) preview.errors.push('Farm profile is missing or invalid.');
  else preview.counts.farm = 1;
  for (const bucket of arrayBuckets) {
    const rows = data[bucket];
    if (rows == null) { preview.counts[bucket] = 0; continue; }
    if (!Array.isArray(rows)) { preview.errors.push(`${bucket}: expected an array.`); continue; }
    preview.counts[bucket] = rows.length;
    const seen = new Set<string>();
    const remoteRows = Array.isArray(remote[bucket]) ? remote[bucket] as Record<string, unknown>[] : [];
    const cloudById = new Map(remoteRows.map(row => [row.id, row]));
    for (const [index, row] of rows.entries()) {
      if (!row || typeof row !== 'object' || Array.isArray(row) || typeof row.id !== 'string' || !row.id) {
        preview.errors.push(`${bucket}[${index + 1}]: record is missing a stable ID.`); continue;
      }
      if (seen.has(row.id)) { preview.errors.push(`${bucket}: duplicate ID ${row.id}.`); continue; }
      seen.add(row.id);
      const encoded = JSON.stringify(row);
      const remapped = { ...row, farmId: targetFarmId };
      const existing = cloudById.get(row.id);
      if (existing && stable(existing) !== stable(remapped)) preview.conflicts++;
      const bytes = encoded ? new TextEncoder().encode(encoded).byteLength : 0;
      if (encoded && (encoded.includes('data:image/') || encoded.includes('base64,'))) {
        // Photos are shrunk on the way in (see importPayload), so a big one is not a reason to refuse a backup.
        preview.warnings.push(`${bucket}: embedded photos were found; they will be shrunk to a phone-friendly size when restored.`);
      } else if (bytes > MAX_RECORD_BYTES) {
        preview.errors.push(`${bucket}: record ${row.id} is larger than the cloud accepts (1 MB).`);
      }
    }
  }

  const cowIds = new Set((Array.isArray(data.cows) ? data.cows : []).map((row: any) => row?.id).filter(Boolean));
  const buyerIds = new Set((Array.isArray(data.buyers) ? data.buyers : []).map((row: any) => row?.id).filter(Boolean));
  for (const [bucket, field, refs] of [
    ['health', 'cowId', cowIds], ['breeding', 'cowId', cowIds], ['reminders', 'cowId', cowIds],
    ['deliveries', 'buyerId', buyerIds], ['payments', 'buyerId', buyerIds],
  ] as const) {
    for (const row of (Array.isArray(data[bucket]) ? data[bucket] : []) as Record<string, unknown>[]) {
      if (row[field] && !refs.has(row[field])) preview.warnings.push(`${bucket}: record ${String(row.id)} refers to missing ${field} ${String(row[field])}.`);
    }
  }
  for (const buyer of (Array.isArray(data.buyers) ? data.buyers : []) as Record<string, unknown>[]) {
    const id = buyer.id;
    if (typeof id !== 'string' || typeof buyer.currentBalance !== 'number') continue;
    const deliveryBalance = ((Array.isArray(data.deliveries) ? data.deliveries : []) as Record<string, unknown>[])
      .filter(delivery => delivery.buyerId === id && typeof delivery.balance === 'number')
      .reduce((sum, delivery) => sum + Number(delivery.balance), 0);
    const gap = Number((buyer.currentBalance - deliveryBalance).toFixed(2));
    if (Math.abs(gap) > 0.01) preview.financial.push({ buyerId: id, buyerName: String(buyer.name || id), recordedBalance: buyer.currentBalance, deliveryBalance, gap });
  }
  if (preview.financial.length) preview.warnings.push('Buyer balances differ from the sum of delivery balances. This may include opening balances or separately recorded receipts; review before relying on the ledger.');
  if (data.reminders == null) preview.warnings.push('This backup has no reminders; current farm reminders will be retained.');
  return preview;
}
