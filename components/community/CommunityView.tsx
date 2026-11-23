'use client';
import { useCallback, useEffect, useState } from 'react';
import { KeyRound, MessageSquare, Plus, ShieldCheck, Users, WifiOff } from 'lucide-react';
import type { UserAccount } from '@/types';
import { LockedFeature } from '@/components/billing/LockedFeature';
import { GROUP_KIND_LABEL, agoLabel, communityIncluded, normaliseGroupCode, type GroupList } from '@/lib/community';
import { COMMUNITY_COPY, type Lang } from '@/lib/community-copy';
import { CommunityError, communityCall, describeError, keep, readKept } from '@/lib/community-client';
import { roleOrOwner } from '@/lib/team';
import { GroupScreen } from './GroupScreen';

const DEMO_USER = 'usr-demo-01';

/**
 * Community: the groups this farm belongs to, a box to join another with an invitation code, and each group's
 * discussion. Only Farm Pro and Custom farms have it (the server and the database check the plan; the locked line is
 * only the calm explanation). Mylkio staff create the groups; this screen never does.
 */
export function CommunityView({ user, lang, initialCode, onCodeHandled }: {
  user: UserAccount; lang: Lang; initialCode?: string; onCodeHandled?: () => void;
}) {
  const t = COMMUNITY_COPY[lang];
  const demo = user.id === DEMO_USER;
  const included = communityIncluded(user.subscription);
  const role = roleOrOwner(user.farmRole);
  const [list, setList] = useState<GroupList | null>(() => (typeof window === 'undefined' ? null : readKept<GroupList>(user.id, 'groups')));
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await communityCall<GroupList>('/api/community/groups');
      setList(result); keep(user.id, 'groups', result); setOffline(false); setError('');
    } catch (e) {
      if (e instanceof CommunityError && e.offline) setOffline(true);
      else setError(describeError(e, t, t.loadError));
    }
  }, [user.id, t.loadError]);

  useEffect(() => { if (included && !demo) void load(); }, [included, demo, load]);

  const header = (
    <div>
      <h1 className="page-title">{t.title}</h1>
      <p className="page-sub max-w-2xl">{t.intro}</p>
    </div>
  );

  if (demo) {
    return <div className="space-y-5">{header}<p className="rounded-2xl border border-ivory-border bg-ivory p-4 text-base text-charcoal-light">{t.demoNote}</p></div>;
  }
  if (!included) {
    return <div className="space-y-5">{header}<LockedFeature feature="community" /></div>;
  }

  const current = list?.groups.find((g) => g.id === openGroup);
  if (openGroup && current) {
    return (
      <GroupScreen
        key={current.id} user={user} lang={lang} group={current} canPost={role !== 'worker' && (list?.canPost ?? false)}
        onBack={() => { setOpenGroup(null); void load(); }}
        onLeft={() => { setOpenGroup(null); void load(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {header}
      {offline && <p role="status" className="flex items-center gap-2 rounded-xl bg-ivory-muted p-3 text-sm text-charcoal-light"><WifiOff className="h-4 w-4 shrink-0" />{t.offlineShowing}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-sage/10 p-3 text-sm text-charcoal">{notice}</p>}

      <section aria-labelledby="my-groups-heading" className="space-y-3">
        <h2 id="my-groups-heading" className="font-display text-xl font-medium text-charcoal">{t.yourGroups}</h2>
        {!list && !error && !offline && <p className="text-sm text-charcoal-muted">{t.loading}</p>}
        {list && list.groups.length === 0 && <p className="rounded-2xl border border-ivory-border bg-white p-4 text-sm text-charcoal-light shadow-soft">{role === 'worker' ? t.noGroupsWorker : t.noGroups}</p>}
        <ul className="grid gap-3 sm:grid-cols-2">
          {list?.groups.map((g) => (
            <li key={g.id}>
              <button type="button" onClick={() => setOpenGroup(g.id)} className="card card-hover w-full p-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="icon-tile !h-11 !w-11"><Users className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-charcoal">{g.name}</p>
                    <p className="text-sm text-charcoal-muted">{GROUP_KIND_LABEL[g.kind][lang]} · {g.county} · {t.members(g.members)}</p>
                    {g.role === 'admin' && <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-sage"><ShieldCheck className="h-3.5 w-3.5" />{t.groupAdmin}</p>}
                    <p className="mt-1 flex items-center gap-1 text-xs text-charcoal-muted"><MessageSquare className="h-3.5 w-3.5" />{g.lastPostAt ? t.lastActive(agoLabel(g.lastPostAt, Date.now(), lang)) : t.noPostsYet}</p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {role !== 'worker'
        ? <JoinBox lang={lang} initialCode={initialCode} onCodeHandled={onCodeHandled} onJoined={(groupId, name) => { setNotice(t.joined(name)); void load().then(() => setOpenGroup(groupId)); }} />
        : <p className="rounded-xl bg-ivory p-3 text-sm text-charcoal-light">{t.workerCannotJoin}</p>}
    </div>
  );
}

function JoinBox({ lang, initialCode, onCodeHandled, onJoined }: {
  lang: Lang; initialCode?: string; onCodeHandled?: () => void; onJoined: (groupId: string, groupName: string) => void;
}) {
  const t = COMMUNITY_COPY[lang];
  const [code, setCode] = useState(initialCode ?? '');
  const [fromLink, setFromLink] = useState(Boolean(initialCode));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // A link the group shared pre-fills the code (the app passes it down once, then forgets it).
  useEffect(() => {
    if (!initialCode) return;
    setCode(initialCode); setFromLink(true); onCodeHandled?.();
  }, [initialCode, onCodeHandled]);

  const join = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const { groupId } = await communityCall<{ groupId: string }>('/api/community/join', { method: 'POST', body: { code: code.trim() } });
      // The group's name arrives with the list; show the code's group by name once it is loaded.
      const groups = await communityCall<GroupList>('/api/community/groups');
      onJoined(groupId, groups.groups.find((g) => g.id === groupId)?.name ?? '');
      setCode(''); setFromLink(false);
    } catch (e) {
      setError(describeError(e, t, t.actionError, true));
    } finally { setBusy(false); }
  };

  return (
    <section aria-labelledby="join-heading" className="card space-y-3 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="icon-tile !h-11 !w-11"><KeyRound className="h-5 w-5" /></div>
        <div>
          <h2 id="join-heading" className="text-base font-bold text-charcoal">{t.joinTitle}</h2>
          <p className="mt-0.5 text-sm text-charcoal-light">{t.joinIntro}</p>
        </div>
      </div>
      {fromLink && <p role="status" className="rounded-xl bg-sage/10 p-3 text-sm text-charcoal">{t.linkOpened}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <form onSubmit={join} className="space-y-3">
        <div>
          <label htmlFor="group-code" className="field-label">{t.codeLabel}</label>
          <input id="group-code" className="field max-w-xs font-mono uppercase tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={40} />
          <p className="mt-1 text-xs text-charcoal-muted">{t.codeHint}</p>
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy || normaliseGroupCode(code).length < 8}><Plus className="h-4 w-4" />{busy ? t.joining : t.join}</button>
      </form>
    </section>
  );
}
