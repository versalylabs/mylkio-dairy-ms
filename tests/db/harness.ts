import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

// Plain Postgres, like Neon: the migrations are applied as they ship, with no stand-ins.
// The "signed-in user" is whatever the test last chose; it is passed to the functions as
// `p_actor`, exactly as the Next.js server passes the verified Neon Auth user id.
const actors = new WeakMap<PGlite, string | null>();

export async function freshDatabase() {
  const db = new PGlite();
  const dir = path.resolve(__dirname, '../../db/migrations');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(path.join(dir, file), 'utf8'));
  }
  return db;
}

export function asUser(db: PGlite, id: string | null) {
  actors.set(db, id);
}

export function currentUser(db: PGlite) {
  return actors.get(db) ?? null;
}

export async function signUp(db: PGlite, id: string, farmName = 'Green Hills') {
  const { rows } = await db.query<{ farm: string }>(
    'select public.provision_farm($1, $2, $3, $4, $5, $6, $7, $8, $9) as farm',
    [id, `${id.slice(0, 4)}@example.test`, 'Test Farmer', '0700000000', farmName, 'Nakuru', null, 'farmer', 'en'],
  );
  asUser(db, id);
  return rows[0].farm;
}

export type GroupResult = {
  groupId: string;
  status: 'applied' | 'conflict';
  ops?: { opId: string; version: number; seq: number; replayed?: boolean }[];
  conflicts?: { opId: string; bucket: string; recordId: string; reason: string; server: { version: number; deleted: boolean; data: Record<string, unknown> } | null }[];
};

export async function apply(db: PGlite, farmId: string, ops: unknown[]) {
  const { rows } = await db.query<{ result: GroupResult[] }>(
    'select public.apply_farm_operations($1, $2, $3::jsonb) as result',
    [farmId, currentUser(db), JSON.stringify(ops)],
  );
  return rows[0].result;
}

export async function changesSince(db: PGlite, farmId: string, since = 0, limit = 1000) {
  const { rows } = await db.query<{ bucket: string; id: string; version: number; change_seq: number; deleted: boolean; data: Record<string, unknown> }>(
    'select * from public.farm_changes($1, $2, $3, $4)',
    [farmId, currentUser(db), since, limit],
  );
  return rows;
}
