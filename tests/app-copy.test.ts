import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { AUTH_COPY, BILLING_COPY, KNOWN_MESSAGE_KEYS, STORAGE_COPY, SYNC_COPY, VET_COPY, backupMessage, translateMessage } from '@/lib/app-copy';
import { backupAdvice } from '@/lib/backup';
import { billingState, describeBilling, planPillLabel, shortDate, stateLabel } from '@/lib/billing';
import { TEAM_COPY } from '@/lib/team-copy';
import { RESET_COPY } from '@/lib/password-reset';
import { FEATURE_NAMES, PLAN_TEXT } from '@/lib/plan-copy';
import { PRODUCED_COPY } from '@/lib/produced-copy';
import { COST_COPY } from '@/lib/cost-copy';
import { DROP_COPY } from '@/lib/drop-copy';

/** Every entry of the English copy has a Kiswahili entry of the same kind (text, text-maker, or a group). */
function sameShape(en: unknown, sw: unknown, where: string) {
  expect(typeof sw, where).toBe(typeof en);
  if (typeof en === 'function') { expect((sw as (...a: unknown[]) => unknown).length, `${where} takes the same inputs`).toBe((en as (...a: unknown[]) => unknown).length); return; }
  if (typeof en === 'object' && en) {
    expect(Object.keys(sw as object).sort(), where).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en)) sameShape((en as Record<string, unknown>)[key], (sw as Record<string, unknown>)[key], `${where}.${key}`);
    return;
  }
  expect((sw as string).trim().length, `${where} is not empty`).toBeGreaterThan(0);
}

describe('every screen has both languages, entry for entry', () => {
  for (const [name, copy] of Object.entries({ BILLING_COPY, STORAGE_COPY, SYNC_COPY, VET_COPY, AUTH_COPY, TEAM_COPY, RESET_COPY, PLAN_TEXT, FEATURE_NAMES, PRODUCED_COPY, COST_COPY, DROP_COPY })) {
    it(name, () => sameShape(copy.en, copy.sw, name));
  }
});

describe('plan and billing wording in Kiswahili', () => {
  const NOW = new Date('2026-11-15T09:00:00+03:00');
  const day = 86_400_000;
  const sub = (status: string, offsetDays: number) => ({ plan: 'farmer', status, renewsAt: new Date(NOW.getTime() + offsetDays * day).toISOString() });

  it('describes a trial, a paid plan and a late payment', () => {
    expect(describeBilling(sub('trial', 9), NOW, 'sw')).toMatch(/^Majaribio bila malipo: siku 9 zimebaki \(yanaisha /);
    expect(describeBilling(sub('trial', 0), NOW, 'sw')).toContain('yanaisha leo');
    expect(describeBilling(sub('active', 40), NOW, 'sw')).toMatch(/^Umelipa hadi /);
    expect(describeBilling(sub('active', -3), NOW, 'sw')).toMatch(/^Malipo yalikuwa yadaiwe tarehe /);
    expect(describeBilling(sub('cancelled', 40), NOW, 'sw')).toContain('Rekodi zako bado ziko hapa');
  });

  it('keeps English exactly as it was', () => {
    expect(describeBilling(sub('trial', 9), NOW)).toMatch(/^Free trial: 9 days left \(ends /);
    expect(describeBilling(sub('trial', 1), NOW)).toContain('1 day left');
    expect(planPillLabel(sub('active', 40))).toBe('FARMER Plan');
  });

  it('names the state and the plan pill', () => {
    expect(stateLabel('overdue', 'sw')).toBe('Malipo yamechelewa');
    expect(stateLabel('overdue')).toBe('Payment overdue');
    expect(planPillLabel(sub('active', 40), 'sw')).toBe('Mpango wa FARMER');
    expect(billingState(sub('active', -20), NOW)).toBe('overdue');
  });

  it('writes dates with Kiswahili month names', () => {
    expect(shortDate('2026-08-20T00:00:00+03:00', 'sw')).toMatch(/Ago/);
    expect(shortDate('2026-08-20T00:00:00+03:00')).toMatch(/Aug/);
  });

  it('the notice says how many days, in both languages', () => {
    expect(BILLING_COPY.en.notice.trialEnds(1)).toBe('Your free trial ends in 1 day');
    expect(BILLING_COPY.en.notice.trialEnds(5)).toBe('Your free trial ends in 5 days');
    expect(BILLING_COPY.sw.notice.trialEnds(1)).toBe('Majaribio yako bila malipo yanaisha baada ya siku 1');
    expect(BILLING_COPY.sw.notice.due(5)).toBe('Mpango wako unadaiwa baada ya siku 5');
  });
});

describe('backup reminders', () => {
  it('say the same things in both languages', () => {
    const now = new Date('2026-11-15T09:00:00Z');
    const old = new Date(now.getTime() - 40 * 86_400_000).toISOString();
    expect(backupAdvice(old, 50, now).message).toBe('Your last backup was 40 days ago. Download a fresh one.');
    expect(backupAdvice(old, 50, now, 'sw').message).toBe('Nakala rudufu yako ya mwisho ilikuwa siku 40 zilizopita. Pakua mpya.');
    expect(backupAdvice(null, 50, now, 'sw').level).toBe('remind');
    expect(backupAdvice(now.toISOString(), 50, now, 'sw').message).toBe('Umetengeneza nakala rudufu leo.');
    expect(backupMessage('en', 'recent', 1)).toBe('Your last backup was 1 day ago.');
  });
});

describe('messages from deep in the system', () => {
  it('are translated when we know them, and left alone when we do not', () => {
    expect(translateMessage('Cloud save failed. Changes remain on this device.', 'sw')).toMatch(/^Kuhifadhi kwenye wingu/);
    expect(translateMessage('Cloud save failed. Changes remain on this device.', 'en')).toBe('Cloud save failed. Changes remain on this device.');
    expect(translateMessage('Something nobody has translated yet.', 'sw')).toBe('Something nobody has translated yet.');
  });

  it('only list sentences the code really produces, so a reworded message cannot silently lose its translation', () => {
    const sources = ['lib/local-store.ts', 'lib/cloud-store.ts', 'lib/auth-client.ts', 'components/auth/AuthModal.tsx']
      .map((file) => readFileSync(path.resolve(__dirname, '..', file), 'utf8').replace(/\r\n/g, '\n')).join('\n');
    // A known message is "produced by the code" if its text appears there, allowing for escaped quotes.
    const missing = KNOWN_MESSAGE_KEYS.filter((message) => !sources.includes(message) && !sources.includes(message.replace(/'/g, "\\'")));
    // These two come from the server, not these files.
    const fromServer = new Set(['Too many attempts. Please wait a few minutes and try again.', 'That invitation code is not valid. Check it, or ask Mylkio for one.', 'Your farm could not be set up. Please try again.']);
    expect(missing.filter((m) => !fromServer.has(m))).toEqual([]);
  });
});
