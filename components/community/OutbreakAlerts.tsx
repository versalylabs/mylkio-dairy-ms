'use client';
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, Megaphone, ShieldAlert, ThumbsUp, WifiOff } from 'lucide-react';
import { COMMUNITY_COPY } from '@/lib/community-copy';
import type { UserAccount } from '@/types';
import { REFRESH_SECONDS, agoLabel } from '@/lib/community';
import { OUTBREAK_COPY, type Lang } from '@/lib/outbreak-copy';
import { CommunityError, communityCall, keep, readKept } from '@/lib/community-client';
import { outbreakReportsOpen, redFlagsForSign, signLabel, type AlertAnswer, type AlertCluster, type GroupAlerts } from '@/lib/community-outbreak';
import { URGENCY_PHRASE } from '@/lib/vet/checker';
import { ReportForm } from './ReportForm';

const urgencyStyle = { emergency: 'bg-rose-600 text-white', today: 'bg-amber-500 text-white', soon: 'bg-amber-100 text-amber-900' } as const;

/**
 * The outbreak alerts of one group: counts by area for the last 7 days, never a farm. Each alert carries the safety notice;
 * a sign that sets off one of the vet guide's red flags shows the emergency steps first, as the guide does. Members can answer
 * with one tap ("We see this too" or "Not here"); the answers are counted and never named. Owners and managers can report
 * signs on their own farm (once the guide is approved) and withdraw their reports.
 */
export function OutbreakAlerts({ user, lang, groupId, canPost, farmCounty }: {
  user: UserAccount; lang: Lang; groupId: string; canPost: boolean; farmCounty: string;
}) {
  const t = OUTBREAK_COPY[lang];
  const part = `alerts_${groupId}`;
  const [data, setData] = useState<GroupAlerts | null>(() => readKept<GroupAlerts>(user.id, part));
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await communityCall<GroupAlerts>(`/api/community/groups/${groupId}/alerts`);
      setData(result); keep(user.id, part, result); setOffline(false); setError('');
    } catch (e) {
      if (e instanceof CommunityError && e.offline) setOffline(true);
    }
  }, [groupId, user.id, part]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, REFRESH_SECONDS * 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [load]);

  const act = async (work: () => Promise<void>) => {
    setBusy(true); setError(''); setNotice('');
    try { await work(); await load(); }
    catch (e) { setError(e instanceof CommunityError && e.status === 429 ? t.tooMany : e instanceof CommunityError && e.offline ? COMMUNITY_OFFLINE[lang] : t.actionError); }
    finally { setBusy(false); }
  };

  const answer = (c: AlertCluster, value: AlertAnswer) => act(async () => {
    // Tapping the answer already chosen takes it back.
    await communityCall(`/api/community/groups/${groupId}/alerts`, { method: 'POST', body: { areaKey: c.areaKey, sign: c.sign, answer: c.myAnswer === value ? null : value } });
    setNotice(t.answerSaved);
  });

  const withdraw = (id: string) => {
    if (!window.confirm(t.withdrawConfirm)) return;
    void act(async () => { await communityCall(`/api/community/posts/${id}`, { method: 'DELETE' }); });
  };

  const now = Date.now();
  const open = outbreakReportsOpen();

  const official = data?.official ?? []; // a copy kept before step 3 has none
  const c = COMMUNITY_COPY[lang];
  const day = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString(lang === 'sw' ? 'sw-KE' : 'en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

  return (
    <section aria-labelledby="alerts-heading" className="space-y-3">
      {official.length > 0 && (
        <div className="space-y-3" aria-labelledby="official-heading">
          <h2 id="official-heading" className="flex items-center gap-2 font-display text-xl font-bold text-charcoal"><Megaphone className="h-5 w-5 text-sage" aria-hidden="true" />{c.officialTitle}</h2>
          <ul className="space-y-3">
            {official.map((a) => (
              <li key={a.id} className="card border-sage-300 p-4">
                <span className="rounded-full bg-sage px-2.5 py-0.5 text-xs font-bold text-white">{c.officialBadge}</span>
                <p className="mt-2 text-base font-bold text-charcoal">{a.title}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-charcoal">{a.body}</p>
                <p className="mt-2 text-xs text-charcoal-muted">{c.officialSource(a.sourceName, day(a.sourceDate))}</p>
                {a.sourceUrl && <a href={a.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-sage underline"><ExternalLink className="h-3.5 w-3.5" />{c.officialRead}</a>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h2 id="alerts-heading" className="flex items-center gap-2 font-display text-xl font-bold text-charcoal"><ShieldAlert className="h-5 w-5 text-gold-600" aria-hidden="true" />{t.alertsTitle}</h2>
        <p className="mt-1 text-sm text-charcoal-muted">{t.alertsIntro}</p>
      </div>
      {offline && <p role="status" className="flex items-center gap-2 rounded-xl bg-ivory-muted p-3 text-sm text-charcoal-light"><WifiOff className="h-4 w-4 shrink-0" />{COMMUNITY_OFFLINE_SHOWING[lang]}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-sage/10 p-3 text-sm text-charcoal">{notice}</p>}

      {data && data.clusters.length === 0 && <p className="rounded-xl bg-ivory p-3 text-sm text-charcoal-light">{t.noAlerts}</p>}

      <ul className="space-y-3">
        {data?.clusters.map((c) => {
          const flags = redFlagsForSign(c.sign);
          const notifiable = flags.some((f) => f.notifiable);
          const humanRisk = flags.some((f) => f.humanRisk);
          return (
            <li key={`${c.areaKey}|${c.sign}`} className={`card overflow-hidden ${flags.some((f) => f.urgency === 'emergency') ? 'border-rose-300' : ''}`}>
              <div className="space-y-3 p-4">
                <div>
                  <p className="text-sm font-semibold text-charcoal">{t.farmsReport(c.farms, c.area)}</p>
                  <p className="mt-0.5 text-base font-bold text-charcoal">{signLabel(c.sign)}</p>
                  <p className="mt-0.5 text-xs text-charcoal-muted">{agoLabel(c.latestAt, now, lang)}</p>
                </div>

                {/* Red-flag signs: the emergency steps come first, the same as in the vet guide. */}
                {flags.map((flag) => (
                  <div key={flag.id} className="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${urgencyStyle[flag.urgency]}`}>{URGENCY_PHRASE[flag.urgency]}</span>
                      {flag.review.status === 'draft' && <span className="rounded-full bg-ivory-muted px-2 py-0.5 text-xs font-bold text-charcoal">Draft, not yet checked by a vet</span>}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-charcoal">{flag.title}. {t.doThisFirst}:</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-charcoal">{flag.doNow.map((step) => <li key={step}>{step}</li>)}</ul>
                  </div>
                ))}
                {flags.length === 0 && <p className="text-sm text-charcoal-light">{t.callVetNow}</p>}
                {notifiable && <p className="flex items-start gap-2 text-sm font-semibold text-rose-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{t.notifiable}{humanRisk ? ` ${t.humanRisk}` : ''}</p>}

                <p className="text-sm text-charcoal-light">{t.counts(c.also, c.notHere)}</p>

                {c.iReported ? <p className="text-sm font-semibold text-sage">{t.youReported}</p> : data.canAnswer && (
                  <div className="flex flex-wrap gap-2">
                    {(['also', 'not_here'] as const).map((value) => (
                      <button key={value} type="button" disabled={busy} aria-pressed={c.myAnswer === value} onClick={() => void answer(c, value)}
                        className={`btn !min-h-11 ${c.myAnswer === value ? 'btn-primary' : 'btn-secondary'}`}>
                        {value === 'also' && <ThumbsUp className="h-4 w-4" />}{value === 'also' ? t.weSeeThis : t.notHere}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="border-t border-ivory-border bg-ivory px-4 py-2.5 text-xs text-charcoal-muted">{t.safety}</p>
            </li>
          );
        })}
      </ul>

      {canPost && data && data.mine.length > 0 && (
        <div className="rounded-xl border border-ivory-border bg-white p-3">
          <h3 className="text-sm font-bold text-charcoal">{t.yourReports}</h3>
          <ul className="mt-2 divide-y divide-ivory-border">
            {data.mine.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0 text-sm text-charcoal-light">
                  <p className="truncate">{r.signs.map(signLabel).join('; ')}</p>
                  <p className="text-xs text-charcoal-muted">{agoLabel(r.createdAt, now, lang)}</p>
                </div>
                <button type="button" disabled={busy} className="btn btn-ghost !min-h-10 !text-red-700" onClick={() => withdraw(r.id)}>{t.withdraw}</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canPost && !reporting && (open
        ? <button type="button" className="btn btn-secondary" onClick={() => { setReporting(true); setNotice(''); }}><AlertTriangle className="h-4 w-4" />{t.reportButton}</button>
        : <p className="rounded-xl bg-ivory p-3 text-sm text-charcoal-light">{t.closed}</p>)}

      {canPost && reporting && open && (
        <ReportForm lang={lang} groupId={groupId} farmCounty={farmCounty} onCancel={() => setReporting(false)}
          onSent={() => { setReporting(false); setNotice(t.sent); void load(); }} />
      )}
    </section>
  );
}

const COMMUNITY_OFFLINE: Record<Lang, string> = {
  en: 'You need a connection to do that.', sw: 'Unahitaji mtandao ili kufanya hivyo.',
};
const COMMUNITY_OFFLINE_SHOWING: Record<Lang, string> = {
  en: 'No connection. Showing what you last read.', sw: 'Hakuna mtandao. Inaonyesha ulichosoma mara ya mwisho.',
};
