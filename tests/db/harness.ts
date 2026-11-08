import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

// Minimal stand-ins for the parts of Supabase the migrations depend on.
const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  grant usage on schema auth to authenticated, anon;
  grant usage on schema public to authenticated, anon;
`;

export async function freshDatabase() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  const dir = path.resolve(__dirname, '../../supabase/migrations');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(path.join(dir, file), 'utf8'));
  }
  return db;
}

export async function signUp(db: PGlite, id: string, farmName = 'Green Hills') {
  await db.query(`insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)`, [
    id,
    `${id.slice(0, 4)}@example.test`,
    { name: 'Test Farmer', farmName, county: 'Nakuru', phone: '0700000000' },
  ]);
  await asUser(db, id);
  await db.query('select public.provision_my_farm()');
  const { rows } = await db.query<{ farm_id: string }>('select farm_id from public.farm_memberships where user_id=$1', [id]);
  return rows[0].farm_id;
}

export async function asUser(db: PGlite, id: string | null) {
  await db.query(`select set_config('test.uid', $1, false)`, [id ?? '']);
}

export async function apply(db: PGlite, farmId: string, ops: unknown[]) {
  const { rows } = await db.query<{ result: unknown }>('select public.apply_farm_operations($1, $2) as result', [farmId, JSON.stringify(ops)]);
  return rows[0].result as Array<{
    groupId: string;
    status: 'applied' | 'conflict';
    ops?: { opId: string; version: number; seq: number; replayed?: boolean }[];
    conflicts?: { opId: string; bucket: string; recordId: string; reason: string; server: { version: number; deleted: boolean; data: Record<string, unknown> } | null }[];
  }>;
}
