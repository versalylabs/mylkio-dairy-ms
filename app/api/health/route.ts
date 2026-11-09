import { NextResponse } from 'next/server';
import { database } from '@/lib/server/db';
import { describeError } from '@/lib/server/http';
import { missingConfig } from '@/lib/server/neon-auth';

export const dynamic = 'force-dynamic';

/**
 * One address that answers "is this deployment set up correctly?": the three settings, the
 * database connection, the installed schema and Neon Auth. It reports which part failed.
 * It never returns a value from the environment. The technical detail of a failure is only
 * included outside production.
 */
export async function GET() {
  const showDetail = process.env.VERCEL_ENV !== 'production';
  const report: Record<string, unknown> = {};
  const missing = missingConfig();
  report.settings = missing.length === 0 ? 'ok' : { missing };

  if (missing.length === 0) {
    try {
      const [row] = await database().query<{ ready: boolean }>(`select to_regproc('public.get_account') is not null as ready`);
      report.database = 'ok';
      report.schema = row?.ready ? 'ok' : 'missing: run the migrations on this Neon branch';
    } catch (error) {
      report.database = 'error';
      report.schema = 'unknown';
      if (showDetail) report.databaseDetail = describeError(error);
    }
    try {
      const response = await fetch(`${process.env.NEON_AUTH_BASE_URL}/.well-known/jwks.json`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      report.auth = response.ok ? 'ok' : `error: HTTP ${response.status}`;
    } catch {
      report.auth = 'unreachable';
    }
  }

  report.ok = report.settings === 'ok' && report.database === 'ok' && report.schema === 'ok' && report.auth === 'ok';
  return NextResponse.json(report, { status: report.ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
