import { describe, expect, it } from 'vitest';
import { inviteAccepted, inviteCodes, inviteRequired } from '@/lib/server/invites';

describe('invitation codes', () => {
  it('leaves sign-up open when no codes are set', () => {
    for (const unset of [undefined, null, '', '   ', ' , ; ']) {
      expect(inviteRequired(unset)).toBe(false);
      expect(inviteAccepted(undefined, unset)).toBe(true);
      expect(inviteAccepted('anything', unset)).toBe(true);
    }
  });

  it('splits codes on commas, spaces, semicolons and line breaks', () => {
    expect(inviteCodes('KAKAMEGA-1, NAKURU-2;MERU-3\nBUNGOMA-4')).toEqual(['KAKAMEGA-1', 'NAKURU-2', 'MERU-3', 'BUNGOMA-4']);
  });

  it('requires one of the codes when any are set', () => {
    const codes = 'PILOT-7K2P, FRIEND-9Q4X';
    expect(inviteRequired(codes)).toBe(true);
    expect(inviteAccepted('PILOT-7K2P', codes)).toBe(true);
    expect(inviteAccepted('FRIEND-9Q4X', codes)).toBe(true);
    expect(inviteAccepted(undefined, codes)).toBe(false);
    expect(inviteAccepted('', codes)).toBe(false);
    expect(inviteAccepted('   ', codes)).toBe(false);
    expect(inviteAccepted('PILOT-7K2', codes)).toBe(false);
    expect(inviteAccepted('PILOT-7K2PX', codes)).toBe(false);
    expect(inviteAccepted('guess', codes)).toBe(false);
  });

  it('ignores case and surrounding spaces', () => {
    expect(inviteAccepted('  pilot-7k2p ', 'PILOT-7K2P')).toBe(true);
  });

  it('can be revoked by removing a code', () => {
    expect(inviteAccepted('OLD-CODE', 'NEW-CODE')).toBe(false);
  });
});
