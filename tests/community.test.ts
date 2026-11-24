import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { COMMUNITY_LIMITS, FLAG_REASONS, agoLabel, charsLeft, cleanText, communityIncluded, groupLink, hasBadCharacters, newGroupCode, normaliseGroupCode } from '@/lib/community';
import { COMMUNITY_COPY } from '@/lib/community-copy';
import { CommunityError, communityCall, describeError } from '@/lib/community-client';
import { flagInput, groupInput, inviteInput, joinInput, leaveInput, officialAlertInput, postInput, replyInput } from '@/lib/server/community-schemas';
import { PRIVACY, TERMS } from '@/lib/legal';
import { tabsFor } from '@/lib/team';
import { featuresFor } from '@/lib/plans';

const migration = readFileSync(path.resolve(__dirname, '../db/migrations/0012_community_groups.sql'), 'utf8');

describe('the limits the screens show are the limits the database enforces', () => {
  it('quotes the same numbers as migration 0012', () => {
    expect(migration).toContain(`between 1 and ${COMMUNITY_LIMITS.postChars}`);
    expect(migration).toContain(`between 1 and ${COMMUNITY_LIMITS.replyChars}`);
    expect(migration).toContain(`members >= ${COMMUNITY_LIMITS.membersPerGroup}`);
    expect(migration).toContain(`mine >= ${COMMUNITY_LIMITS.groupsPerFarm}`);
    expect(migration).toContain(`>= ${COMMUNITY_LIMITS.postsPerHour} then`);
    expect(migration).toContain(`>= ${COMMUNITY_LIMITS.repliesPerHour} then`);
    expect(migration).toContain(`length(description) <= ${COMMUNITY_LIMITS.descriptionChars}`);
    expect(migration).toContain(`max_uses between 1 and ${COMMUNITY_LIMITS.inviteMaxUses}`);
    expect(migration).toContain(`p_days not between 1 and ${COMMUNITY_LIMITS.inviteMaxDays}`);
  });

  it('keeps the decisions made with the owner: 300 farms, 5 groups per farm', () => {
    expect(COMMUNITY_LIMITS.membersPerGroup).toBe(300);
    expect(COMMUNITY_LIMITS.groupsPerFarm).toBe(5);
  });
});

describe('who has Community', () => {
  it('is Farm Pro and Custom only, and every role has the menu item', () => {
    expect(featuresFor({ plan: 'starter', status: 'active' }).community).toBe(false);
    expect(featuresFor({ plan: 'farmer', status: 'active' }).community).toBe(false);
    expect(featuresFor({ plan: 'farm_pro', status: 'active' }).community).toBe(true);
    expect(featuresFor({ plan: 'custom', status: 'active' }).community).toBe(true);
    // A trial of a smaller plan gets the Farmer set, which has no Community.
    expect(featuresFor({ plan: 'starter', status: 'trial', renewsAt: new Date(Date.now() + 86_400_000).toISOString() }).community).toBe(false);
    for (const role of ['owner', 'manager', 'worker'] as const) expect(tabsFor(role)).toContain('community');
  });

  it('pauses when the plan lapses, like the other paid extras', () => {
    const late = new Date(Date.now() - 10 * 86_400_000).toISOString();
    expect(communityIncluded({ plan: 'farm_pro', status: 'active', renewsAt: late })).toBe(false);
    expect(communityIncluded({ plan: 'farm_pro', status: 'cancelled' })).toBe(false);
    expect(communityIncluded(null)).toBe(false);
  });
});

describe('text people type', () => {
  it('is cleaned, counted and checked the same way everywhere', () => {
    expect(cleanText('  hello\r\n\r\n\r\n\r\nworld  ')).toBe('hello\n\nworld');
    expect(charsLeft('  abc  ', 10)).toBe(7);
    expect(charsLeft('x'.repeat(12), 10)).toBe(-2);
    expect(hasBadCharacters('plain text\nwith a line and\ta tab')).toBe(false);
    expect(hasBadCharacters('nul\u0000byte')).toBe(true);
    expect(hasBadCharacters('bell\u0007')).toBe(true);
  });

  it('is limited by the request schemas before it reaches the database', () => {
    expect(postInput.parse({ body: '  Anyone selling hay?  ' })).toEqual({ body: 'Anyone selling hay?' });
    expect(postInput.safeParse({ body: '' }).success).toBe(false);
    expect(postInput.safeParse({ body: '   ' }).success).toBe(false);
    expect(postInput.safeParse({ body: 'x'.repeat(COMMUNITY_LIMITS.postChars) }).success).toBe(true);
    expect(postInput.safeParse({ body: 'x'.repeat(COMMUNITY_LIMITS.postChars + 1) }).success).toBe(false);
    expect(postInput.safeParse({ body: 'bad\u0000text' }).success).toBe(false);
    expect(postInput.safeParse({ body: 'ok', extra: 1 }).success).toBe(false);
    expect(replyInput.safeParse({ body: 'y'.repeat(COMMUNITY_LIMITS.replyChars + 1) }).success).toBe(false);
    expect(joinInput.safeParse({ code: 'short' }).success).toBe(false);
    expect(joinInput.parse({ code: ' abcde-fghjk ' })).toEqual({ code: 'abcde-fghjk' });
    expect(leaveInput.parse({})).toEqual({ deletePosts: false });
  });

  it('limits what staff can set on a group and an invitation', () => {
    expect(groupInput.safeParse({ name: 'Rongai Dairy SACCO', kind: 'sacco', county: 'Nakuru' }).success).toBe(true);
    expect(groupInput.safeParse({ name: 'ab', kind: 'sacco', county: 'Nakuru' }).success).toBe(false);
    expect(groupInput.safeParse({ name: 'Fine name', kind: 'club', county: 'Nakuru' }).success).toBe(false);
    expect(inviteInput.parse({})).toEqual({ role: 'member', label: '', maxUses: 50, days: 30 });
    expect(inviteInput.safeParse({ maxUses: COMMUNITY_LIMITS.inviteMaxUses + 1 }).success).toBe(false);
    expect(inviteInput.safeParse({ days: 0 }).success).toBe(false);
  });
});

describe('invitation links', () => {
  it('make codes like team invitations and open the Community screen', () => {
    const code = newGroupCode((n) => Uint8Array.from({ length: n }, (_, i) => i * 7));
    expect(normaliseGroupCode(code)).toHaveLength(10);
    expect(groupLink('https://example.test/', 'ABCDE-FGHJK')).toBe('https://example.test/?community=ABCDE-FGHJK');
  });
});

describe('time labels', () => {
  const now = new Date('2026-11-23T12:00:00Z').getTime();
  it('say how long ago, in both languages', () => {
    expect(agoLabel('2026-11-23T11:59:40Z', now, 'en')).toBe('just now');
    expect(agoLabel('2026-11-23T11:30:00Z', now, 'en')).toBe('30 min ago');
    expect(agoLabel('2026-11-23T09:00:00Z', now, 'en')).toBe('3 h ago');
    expect(agoLabel('2026-11-21T12:00:00Z', now, 'en')).toBe('2 days ago');
    expect(agoLabel('2026-11-23T11:30:00Z', now, 'sw')).toBe('dakika 30 zilizopita');
    expect(agoLabel('2026-10-01T12:00:00Z', now, 'en')).toMatch(/Oct/);
  });
});

describe('reporting a post and official alerts', () => {
  const sql = readFileSync(path.resolve(__dirname, '../db/migrations/0014_community_moderation.sql'), 'utf8');
  const id = '11111111-1111-4111-8111-111111111111';

  it('offers the same report reasons the database accepts', () => {
    expect(sql).toContain(`reason in (${FLAG_REASONS.map((r) => `'${r}'`).join(', ')})`);
    expect(flagInput.safeParse({ postId: id, reason: 'rumour' }).success).toBe(true);
    expect(flagInput.safeParse({ replyId: id, reason: 'spam' }).success).toBe(true);
    expect(flagInput.safeParse({ postId: id, replyId: id, reason: 'spam' }).success).toBe(false);
    expect(flagInput.safeParse({ postId: id, reason: 'gossip' }).success).toBe(false);
  });

  it('needs a source for an official alert, and an https link if any', () => {
    const ok = { county: 'Nakuru', title: 'FMD confirmed', body: 'Do not move cattle.', sourceName: 'County vet office', sourceDate: '2026-11-20' };
    expect(officialAlertInput.parse(ok)).toMatchObject({ days: 30 });
    expect(officialAlertInput.parse({ ...ok, sourceUrl: '' }).sourceUrl).toBeUndefined();
    expect(officialAlertInput.safeParse({ ...ok, sourceUrl: 'https://nakuru.go.ke/n' }).success).toBe(true);
    expect(officialAlertInput.safeParse({ ...ok, sourceUrl: 'http://nakuru.go.ke/n' }).success).toBe(false);
    expect(officialAlertInput.safeParse({ ...ok, sourceName: '' }).success).toBe(false);
    expect(officialAlertInput.safeParse({ ...ok, days: 91 }).success).toBe(false);
  });

  it('tells farms in the Privacy notice that staff see reported posts', () => {
    const text = PRIVACY.sections.flatMap((s) => [...(s.paragraphs ?? []), ...(s.bullets ?? [])]).join('\n');
    expect(text).toMatch(/except a post or reply that a member reports to us/);
  });
});

describe('requests the screens send', () => {
  afterEach(() => vi.unstubAllGlobals());
  const sent = async (init?: Parameters<typeof communityCall>[1]) => {
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    await communityCall('/api/community/posts/x', init);
    return (fetchSpy.mock.calls[0] as unknown as [string, RequestInit])[1];
  };

  // The server refuses every write without a JSON content type (sameOrigin in lib/server/http.ts): deleting a post, a reply
  // or an outbreak report sends no body, and used to fail with 415.
  it('marks every write as JSON, even a delete with no body, and leaves a read alone', async () => {
    expect((await sent({ method: 'DELETE' })).headers).toEqual({ 'Content-Type': 'application/json' });
    expect((await sent({ method: 'POST', body: { body: 'hi' } })).headers).toEqual({ 'Content-Type': 'application/json' });
    expect((await sent()).headers).toBeUndefined();
    expect((await sent({ method: 'DELETE' })).body).toBeUndefined();
  });
});

describe('what the farmer is told when something fails, in their own language', () => {
  const failed = (status: number, message = 'x', offline = false) => new CommunityError(message, status, offline);
  for (const lang of ['en', 'sw'] as const) {
    const t = COMMUNITY_COPY[lang];
    it(`maps the server's answers to the ${lang} wording`, () => {
      expect(describeError(failed(0, 'offline', true), t, 'fallback')).toBe(t.offlineWrite);
      expect(describeError(failed(429), t, 'fallback')).toBe(t.tooMany);
      expect(describeError(failed(409, 'This group is full.'), t, 'fallback')).toBe(t.groupFull);
      expect(describeError(failed(409, 'A farm can be in up to 5 groups. Leave one before joining another.'), t, 'fallback')).toBe(t.tooManyGroups);
      expect(describeError(failed(403, 'Community groups are part of the Farm Pro plan.'), t, 'fallback')).toBe(t.notInPlan);
      expect(describeError(failed(403, 'You cannot do that in this group.'), t, 'fallback')).toBe(t.noAccess);
      expect(describeError(failed(400, 'whatever'), t, 'fallback', true)).toBe(t.badInvite);
      expect(describeError(failed(400, 'whatever'), t, 'fallback')).toBe('fallback');
      expect(describeError(new Error('boom'), t, 'fallback')).toBe('fallback');
    });
  }
});

describe('the wording', () => {
  it('has the safety note in both languages and says a vet, not neighbours, treats a sick animal', () => {
    expect(COMMUNITY_COPY.en.rules).toMatch(/not a vet/);
    expect(COMMUNITY_COPY.en.rules).toMatch(/call a vet/);
    expect(COMMUNITY_COPY.sw.rules).toMatch(/daktari wa mifugo/);
  });
});

describe('the Privacy notice and Terms', () => {
  const all = (doc: typeof PRIVACY) => doc.sections.flatMap((s) => [s.heading, ...(s.paragraphs ?? []), ...(s.bullets ?? [])]).join('\n');

  it('say what Community stores, who can read it and that staff do not read the groups', () => {
    const privacy = all(PRIVACY);
    expect(privacy).toContain('Community groups');
    expect(privacy).toMatch(/stored on our servers/);
    expect(privacy).toMatch(/do not read what members write/);
    expect(privacy).toMatch(/worker login/);
    expect(privacy).toMatch(/not veterinary advice/);
  });

  it('ask members not to spread rumours or share doses', () => {
    expect(all(TERMS)).toMatch(/rumour/);
    expect(all(TERMS)).toMatch(/medicine doses/);
  });
});
