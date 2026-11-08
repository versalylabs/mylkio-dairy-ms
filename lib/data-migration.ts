'use client';

import { bucketNames, type BucketName } from './backend-contract';
import { CloudStore } from './cloud-store';
import { validateMigrationData, type MigrationPreview } from './migration-validation';

const legacyPrefixes: Record<BucketName, string> = {
  farm: 'mylkio_farm_', cows: 'mylkio_cows_', buyers: 'mylkio_buyers_',
  milk: 'mylkio_milk_', deliveries: 'mylkio_deliv_', payments: 'mylkio_pay_',
  health: 'mylkio_health_', breeding: 'mylkio_breed_', expenses: 'mylkio_exp_',
  reminders: 'mylkio_rem_',
};

export type LegacySource = { farmId: string; name: string; counts: Partial<Record<BucketName, number>> };
export type ImportResult = { imported: number; unchanged: number; conflicts: number; errors: string[]; preview: MigrationPreview };

function parseLegacy(key: string): unknown {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch { throw new Error(`Legacy record ${key} is not valid JSON. It has been left untouched.`); }
}

function legacyKeys(farmId: string) {
  return Object.fromEntries(bucketNames.map(bucket => [bucket, `${legacyPrefixes[bucket]}${farmId}`])) as Record<BucketName, string>;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${stable(object[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export const LegacyDataMigration = {
  sources(): LegacySource[] {
    const ids = new Set<string>();
    for (const key of Object.keys(localStorage)) {
      for (const prefix of Object.values(legacyPrefixes)) {
        if (key.startsWith(prefix)) {
          const id = key.slice(prefix.length);
          if (id && id !== 'farm-green-hills') ids.add(id);
        }
      }
    }
    let profiles: unknown = [];
    try { profiles = JSON.parse(localStorage.getItem('mylkio_legacy_profiles_v1') || '[]'); } catch { /* The tenant keys remain discoverable. */ }
    if (Array.isArray(profiles)) for (const profile of profiles) {
      if (profile && typeof profile.farmId === 'string' && profile.farmId !== 'farm-green-hills') ids.add(profile.farmId);
    }
    return [...ids].map(farmId => {
      const keys = legacyKeys(farmId);
      const counts: Partial<Record<BucketName, number>> = {};
      for (const bucket of bucketNames) {
        const value = parseLegacy(keys[bucket]);
        if (bucket === 'farm' && value && typeof value === 'object') counts.farm = 1;
        else if (Array.isArray(value) && value.length) counts[bucket] = value.length;
      }
      let name = farmId;
      if (Array.isArray(profiles)) {
        const profile = profiles.find((row: any) => row?.farmId === farmId);
        if (profile?.farmName || profile?.name) name = profile.farmName || profile.name;
      }
      const farm = parseLegacy(keys.farm) as { name?: string } | null;
      return { farmId, name: farm?.name || name, counts };
    }).filter(source => Object.values(source.counts).some(Boolean));
  },

  previewPayload(data: unknown, targetFarmId: string): MigrationPreview {
    const remote = Object.fromEntries(bucketNames.map(bucket => [bucket, CloudStore.read(targetFarmId, bucket, null)])) as Partial<Record<BucketName, unknown>>;
    return validateMigrationData(data, targetFarmId, remote);
  },

  readLegacyPayload(farmId: string): Record<string, unknown> {
    const keys = legacyKeys(farmId);
    const data: Record<string, unknown> = {};
    for (const bucket of bucketNames) {
      const value = parseLegacy(keys[bucket]);
      if (value != null) data[bucket] = value;
    }
    return data;
  },

  previewLegacy(farmId: string, targetFarmId: string): MigrationPreview {
    return this.previewPayload(this.readLegacyPayload(farmId), targetFarmId);
  },

  async import(farmId: string, targetFarmId: string): Promise<ImportResult> {
    const source = this.sources().find(candidate => candidate.farmId === farmId);
    if (!source) throw new Error('No importable local records were found for that farm.');
    return this.importPayload(this.readLegacyPayload(farmId), targetFarmId);
  },

  async importPayload(data: unknown, targetFarmId: string): Promise<ImportResult> {
    const preview = this.previewPayload(data, targetFarmId);
    if (preview.errors.length) throw new Error(`Import stopped before writing: ${preview.errors.slice(0, 3).join(' ')}`);
    const result: ImportResult = { imported: 0, unchanged: 0, conflicts: preview.conflicts, errors: [], preview };
    const payload = data as Record<string, unknown>;
    for (const bucket of bucketNames) {
      const legacy = payload[bucket];
      if (legacy == null) continue;
      if (bucket === 'farm') {
        if (!legacy || Array.isArray(legacy) || typeof legacy !== 'object') { result.errors.push('Farm profile is not a valid object.'); continue; }
        // Signup details are authoritative. Retain the new farm identity while filling only missing profile fields.
        const current = CloudStore.read<Record<string, unknown> | null>(targetFarmId, 'farm', null);
        if (!current) { result.errors.push('The authenticated farm profile has not loaded.'); continue; }
        const imported = legacy as Record<string, unknown>;
        const merged = { ...current };
        for (const [key, value] of Object.entries(imported)) {
          if (key === 'id') continue;
          const existing = merged[key];
          if (existing == null || existing === '') merged[key] = value;
        }
        merged.id = targetFarmId;
        if (stable(merged) !== stable(current)) { CloudStore.write(targetFarmId, 'farm', merged); result.imported++; }
        else result.unchanged++;
        continue;
      }
      if (!Array.isArray(legacy)) { result.errors.push(`${bucket}: expected a record list.`); continue; }
      const current = CloudStore.read<Record<string, unknown>[]>(targetFarmId, bucket, []);
      const byId = new Map(current.map(record => [record.id, record]));
      const seen = new Set<string>();
      let changed = false;
      for (const row of legacy) {
        if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !row.id || seen.has(row.id)) {
          result.errors.push(`${bucket}: skipped a record with a missing or duplicate ID.`); continue;
        }
        seen.add(row.id);
        const imported = { ...row, farmId: targetFarmId };
        const existing = byId.get(row.id);
        if (!existing) { byId.set(row.id, imported); result.imported++; changed = true; }
        else if (stable(existing) === stable(imported)) result.unchanged++;
        else { /* A differing cloud version is retained and counted by the dry-run preview. */ }
      }
      if (changed) CloudStore.write(targetFarmId, bucket, [...byId.values()]);
    }
    await CloudStore.flush();
    const sync = CloudStore.status();
    if (sync.pending) result.errors.push(`${sync.pending} bucket(s) are still waiting to sync. Retry the import when the device is online.`);
    if (sync.conflict) result.errors.push(`${sync.conflict} bucket(s) have a cloud revision conflict and need review before import can finish.`);
    return result;
  },
};
