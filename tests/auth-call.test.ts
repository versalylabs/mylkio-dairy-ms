import { describe, expect, it } from 'vitest';
import { attempt } from '@/lib/auth-call';

describe('attempt', () => {
  it('passes a successful result through with no error', async () => {
    expect(await attempt(async () => ({ data: { user: 1 }, error: null }))).toEqual({ error: null });
    expect(await attempt(async () => undefined)).toEqual({ error: null });
  });

  it('returns an error the client returned', async () => {
    const result = await attempt(async () => ({ data: null, error: { message: 'User already exists', status: 422 } }));
    expect(result.error).toEqual({ message: 'User already exists', status: 422 });
  });

  it('turns a thrown HTTP error into the same shape', async () => {
    const thrown = Object.assign(new Error('USER_ALREADY_EXISTS'), { status: 422 });
    expect(await attempt(async () => { throw thrown; })).toEqual({ error: { message: 'USER_ALREADY_EXISTS', status: 422 } });
  });

  it('keeps a rate-limit status so the caller can say so', async () => {
    const result = await attempt(async () => { throw Object.assign(new Error('Too many requests'), { statusCode: 429 }); });
    expect(result.error?.status).toBe(429);
  });

  it('copes with thrown values that are not errors', async () => {
    expect((await attempt(async () => { throw 'boom'; })).error).toEqual({ message: 'Request failed', status: undefined });
    expect((await attempt(async () => { throw null; })).error?.message).toBe('Request failed');
  });
});
