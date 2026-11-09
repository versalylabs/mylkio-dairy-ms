import { describe, expect, it } from 'vitest';
import { connectionProblem, extractConnectionString } from '@/lib/server/connection';

const URL = 'postgresql://neondb_owner:abc123XYZ@ep-example-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

describe('DATABASE_URL tolerance', () => {
  it('accepts a bare connection string', () => {
    expect(extractConnectionString(URL)).toBe(URL);
    expect(connectionProblem(URL)).toBeNull();
  });

  it('extracts the URL from a copied psql command', () => {
    expect(extractConnectionString(`psql '${URL}'`)).toBe(URL);
    expect(connectionProblem(`psql '${URL}'`)).toBeNull();
  });

  it('ignores surrounding quotes, spaces and line breaks', () => {
    expect(extractConnectionString(`  "${URL}"\n`)).toBe(URL);
    expect(extractConnectionString(`DATABASE_URL='${URL}'`)).toBe(URL);
  });

  it('accepts the postgres:// spelling', () => {
    expect(connectionProblem(URL.replace('postgresql://', 'postgres://'))).toBeNull();
  });

  it('names the problem without echoing the value', () => {
    expect(connectionProblem(undefined)).toBe('not set');
    expect(connectionProblem('   ')).toBe('not set');
    expect(connectionProblem('https://example.com')).toMatch(/does not contain a postgresql/);
    expect(connectionProblem('postgresql://neondb_owner:****************@ep-x.neon.tech/neondb')).toMatch(/masked/);
    expect(connectionProblem('postgresql://neondb_owner:•••••@ep-x.neon.tech/neondb')).toMatch(/masked/);
    expect(connectionProblem('postgresql://ep-x.neon.tech/neondb')).toMatch(/missing the host, user, password or database/);
    expect(connectionProblem('postgresql://user:pw@ep-x.neon.tech')).toMatch(/missing/);
    for (const bad of ['postgresql://neondb_owner:****************@ep-x.neon.tech/neondb', 'x']) {
      expect(connectionProblem(bad) ?? '').not.toContain('neondb_owner');
    }
  });
});
