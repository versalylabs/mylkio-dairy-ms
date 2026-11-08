import 'server-only';
import { neon } from '@neondatabase/serverless';
import { ApiError } from './errors';
import type { Db } from './farm-api';

let cached: Db | null = null;

/** Neon Postgres over HTTP. Use the pooled connection string as DATABASE_URL. */
export function database(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new ApiError(503, 'Secure account services are not configured yet. You can explore the demo.');
  if (!cached) {
    const sql = neon(url);
    cached = { query: async (text, params = []) => (await sql.query(text, params)) as never };
  }
  return cached;
}
