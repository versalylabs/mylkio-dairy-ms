import { afterEach, describe, expect, it, vi } from 'vitest';

async function headersFor(env: string) {
  vi.stubEnv('NODE_ENV', env);
  vi.resetModules();
  const config = (await import('../next.config')).default;
  const rules = await config.headers!();
  return Object.fromEntries(rules[0].headers.map((h) => [h.key, h.value]));
}

afterEach(() => vi.unstubAllEnvs());

describe('security headers on every page', () => {
  it('sends the protective headers', async () => {
    const h = await headersFor('production');
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['X-Frame-Options']).toBe('DENY');
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(h['Permissions-Policy']).toContain('microphone=()');
  });

  it('locks the content policy down in production: no eval, no framing, no plugins, one outside image host', async () => {
    const csp = (await headersFor('production'))['Content-Security-Policy'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain('upgrade-insecure-requests');
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toContain("img-src 'self' data: blob: https://images.unsplash.com");
    // Nothing may load scripts or connect to an outside host.
    expect(csp.match(/script-src [^;]*/)![0]).not.toMatch(/https?:/);
    expect(csp.match(/connect-src [^;]*/)![0]).not.toMatch(/https?:/);
  });

  it('only the development server may use eval (hot reloading)', async () => {
    expect((await headersFor('development'))['Content-Security-Policy']).toContain("'unsafe-eval'");
  });
});
