import { describe, expect, it } from 'vitest';
import {
  MIN_PASSWORD_LENGTH, RESET_COPY, RESET_LINK_MINUTES, checkNewPassword, classifyResetFailure, readResetLink,
} from '@/lib/password-reset';

describe('choosing a new password', () => {
  it('needs 12 characters, the same rule as sign-up, and two matching entries', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12);
    expect(checkNewPassword('short', 'short')).toBe('too_short');
    expect(checkNewPassword('a-long-enough-one', 'a-long-enough-two')).toBe('mismatch');
    expect(checkNewPassword('a-long-enough-one', 'a-long-enough-one')).toBeNull();
    expect(checkNewPassword('x'.repeat(11), 'x'.repeat(11))).toBe('too_short');
    expect(checkNewPassword('x'.repeat(12), 'x'.repeat(12))).toBeNull();
  });
});

describe('the emailed link', () => {
  it('gives the token when the link is good', () => {
    expect(readResetLink('?token=abc123')).toEqual({ token: 'abc123', broken: false });
  });

  it('is broken when Neon Auth reports an error, or the token is missing or blank', () => {
    expect(readResetLink('?error=INVALID_TOKEN')).toEqual({ token: null, broken: true });
    expect(readResetLink('?token=abc&error=INVALID_TOKEN')).toEqual({ token: null, broken: true });
    expect(readResetLink('')).toEqual({ token: null, broken: true });
    expect(readResetLink('?token=%20')).toEqual({ token: null, broken: true });
  });
});

describe('what went wrong', () => {
  it('recognises a rate limit, a used or expired link, a bad address and an outage', () => {
    expect(classifyResetFailure({ status: 429 })).toBe('rate_limited');
    expect(classifyResetFailure({ status: 400, code: 'INVALID_TOKEN', message: 'Invalid token' })).toBe('invalid_link');
    expect(classifyResetFailure({ status: 400, message: 'Token expired' })).toBe('invalid_link');
    expect(classifyResetFailure({ status: 400, message: 'Invalid email' })).toBe('bad_email');
    expect(classifyResetFailure({ status: 503, message: 'down' })).toBe('unavailable');
    expect(classifyResetFailure({ message: 'Request failed' })).toBe('unavailable'); // no status at all: the network
    expect(classifyResetFailure({ status: 404, message: 'User not found' })).toBe('other');
    expect(classifyResetFailure(null)).toBe('other');
  });
});

describe('wording', () => {
  it('exists in English and Kiswahili for every message, so a screen never shows a blank', () => {
    expect(Object.keys(RESET_COPY.sw).sort()).toEqual(Object.keys(RESET_COPY.en).sort());
    for (const lang of ['en', 'sw'] as const) {
      for (const [key, value] of Object.entries(RESET_COPY[lang])) {
        const text = typeof value === 'function' ? value(RESET_LINK_MINUTES) : value;
        expect(text.trim().length, `${lang}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('never tells the person whether an address has an account', () => {
    expect(RESET_COPY.en.sentBody(15)).toMatch(/^If an account exists/);
    expect(RESET_COPY.sw.sentBody(15)).toMatch(/^Kama kuna akaunti/);
  });

  it('states the real link lifetime', () => {
    expect(RESET_COPY.en.sentBody(RESET_LINK_MINUTES)).toContain('15 minutes');
    expect(RESET_COPY.sw.brokenBody).toContain('dakika 15');
  });
});
