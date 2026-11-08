#!/usr/bin/env node
// Applies db/migrations/*.sql to a Neon database, once each, in filename order.
//
//   DATABASE_URL_UNPOOLED=postgres://... npm run db:migrate
//   npm run db:migrate -- --list      (shows the migration files; needs no database)
//
// Use the *direct* (non-pooled) connection string for schema changes. Each file runs in
// its own transaction and is recorded in public.schema_migrations, so running this
// again only applies files that are new. It never edits or drops anything by itself.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../db/migrations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

if (process.argv.includes('--list')) {
  console.log(files.join('\n'));
  process.exit(0);
}

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL_UNPOOLED (the direct Neon connection string) and run again.');
  process.exit(1);
}

const { default: pg } = await import('pg');
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(
    'create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())',
  );
  const done = new Set((await client.query('select name from public.schema_migrations')).rows.map((r) => r.name));
  for (const file of files) {
    if (done.has(file)) {
      console.log(`skip     ${file}`);
      continue;
    }
    await client.query('begin');
    try {
      await client.query(fs.readFileSync(path.join(dir, file), 'utf8'));
      await client.query('insert into public.schema_migrations(name) values ($1)', [file]);
      await client.query('commit');
      console.log(`applied  ${file}`);
    } catch (error) {
      await client.query('rollback');
      console.error(`FAILED   ${file}: ${error.message}`);
      process.exitCode = 1;
      break;
    }
  }
} finally {
  await client.end();
}
