'use client';
import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, MessageCircle, Plus, Trash2, Users } from 'lucide-react';
import { supportMessageHref } from '@/lib/contact';
import { PLANS, type PlanId } from '@/lib/plans';
import { TEAM_COPY, type Lang } from '@/lib/team-copy';
import { INVITABLE_ROLES, ROLE_LABEL, ROLE_SUMMARY, inviteLink, inviteMessage, type FarmRole } from '@/lib/team';
import { useSiteContent } from '@/components/site/SiteContentProvider';

type Member = { id: string; name: string; email: string; phone: string; role: FarmRole; joinedAt: string; lastSeenAt: string | null };
type Invite = { id: string; role: FarmRole; label: string | null; createdAt: string; expiresAt: string };
type Team = { limit: number; members: Member[]; invites: Invite[] };
type Created = { code: string; link: string; message: string; who: string };

const shortDate = (iso: string, lang: Lang) =>
  new Date(iso).toLocaleDateString(lang === 'sw' ? 'sw-KE' : 'en-KE', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', year: 'numeric' });

async function call(farmId: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', body?: unknown) {
  const response = await fetch(`/api/farms/${farmId}/team`, {
    method, cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'failed');
  return result;
}

/**
 * The owner's view of who works on the farm: people, their roles, and invitations that are waiting. Only owners see
 * this (the server and the database refuse anyone else). The one-time code is shown once, when it is made.
 */
export function TeamCard({ farmId, farmName, planId, lang }: { farmId: string; farmName: string; planId: string; lang: Lang }) {
  const t = TEAM_COPY[lang];
  const { contact } = useSiteContent();
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<FarmRole>('worker');
  const [label, setLabel] = useState('');
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try { setTeam(await call(farmId, 'GET')); setError(''); }
    catch { setError(t.loadError); }
  }, [farmId, t.loadError]);
  useEffect(() => { void load(); }, [load]);

  const act = async (action: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await action(); await load(); }
    catch (e) { setError(e instanceof Error && e.message !== 'failed' ? e.message : t.actionError); }
    finally { setBusy(false); }
  };

  const invite = () => act(async () => {
    const result = await call(farmId, 'POST', { role, label });
    const link = inviteLink(window.location.origin, result.code);
    const who = label.trim() || ROLE_LABEL[role][lang].toLowerCase();
    setCreated({ code: result.code, link, who, message: inviteMessage({ farmName, role, link, code: result.code, lang }) });
    setLabel(''); setCopied(false);
  });

  const planName = PLANS[planId as PlanId]?.name ?? planId;
  const used = team ? team.members.length + team.invites.length : 0;
  const room = team ? Math.max(0, team.limit - used) : 0;
  const planAllowsTeam = (team?.limit ?? 1) > 1;

  return (
    <section aria-labelledby="team-heading" className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm space-y-5">
      <div className="flex items-start gap-3">
        <div className="icon-tile !h-11 !w-11"><Users className="h-5 w-5" /></div>
        <div>
          <h2 id="team-heading" className="text-base font-bold text-gray-900">{t.title}</h2>
          <p className="mt-0.5 text-sm text-gray-600">{t.intro}</p>
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {!team && !error && <p className="text-sm text-charcoal-muted">{t.loading}</p>}

      {team && (
        <>
          <div>
            <h3 className="text-sm font-bold text-charcoal">{t.members}</h3>
            <ul className="mt-2 divide-y divide-ivory-border rounded-xl border border-ivory-border">
              {team.members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-charcoal">{m.name}{m.role === 'owner' ? ` (${t.you})` : ''}</p>
                    <p className="truncate text-xs text-charcoal-muted">{m.email}{m.phone ? ` · ${m.phone}` : ''}</p>
                    {m.role !== 'owner' && (
                      <p className="text-xs text-charcoal-muted">
                        {t.joined(shortDate(m.joinedAt, lang))} · {m.lastSeenAt ? t.lastSeen(shortDate(m.lastSeenAt, lang)) : t.neverSeen}
                      </p>
                    )}
                  </div>
                  {m.role === 'owner' ? (
                    <span className="whitespace-nowrap rounded-full bg-sage/10 px-3 py-1 text-xs font-semibold text-sage">{ROLE_LABEL.owner[lang]}</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label={`${t.changeRole}: ${m.name}`} disabled={busy} value={m.role} className="field !min-h-10 !w-auto !py-1.5 text-sm"
                        onChange={(e) => void act(() => call(farmId, 'PATCH', { memberId: m.id, role: e.target.value }))}
                      >
                        {INVITABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r][lang]}</option>)}
                      </select>
                      <button
                        type="button" disabled={busy} className="btn btn-ghost !min-h-10 !text-red-700"
                        onClick={() => { if (window.confirm(t.removeConfirm(m.name))) void act(() => call(farmId, 'DELETE', { memberId: m.id })); }}
                      ><Trash2 className="h-4 w-4" />{t.remove}</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {team.members.length > 1 && <p className="mt-2 text-xs text-charcoal-muted">{t.removeNote}</p>}
          </div>

          {team.invites.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-charcoal">{t.waiting}</h3>
              <ul className="mt-2 divide-y divide-ivory-border rounded-xl border border-ivory-border">
                {team.invites.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-charcoal">{i.label || ROLE_LABEL[i.role][lang]} · {ROLE_LABEL[i.role][lang]}</p>
                      <p className="text-xs text-charcoal-muted">{t.expires(shortDate(i.expiresAt, lang))}</p>
                    </div>
                    <button type="button" disabled={busy} className="btn btn-ghost !min-h-10"
                      onClick={() => { if (window.confirm(t.withdrawConfirm)) void act(() => call(farmId, 'DELETE', { inviteId: i.id })); }}>{t.withdraw}</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!planAllowsTeam && (
            <div className="rounded-xl border border-gold-border bg-gold-subtle p-4">
              <p className="text-sm text-charcoal">{t.oneLogin(planName)}</p>
              <a className="btn btn-primary mt-3" target="_blank" rel="noopener noreferrer"
                href={supportMessageHref(contact, t.upgradeMessage(farmName))}>
                <MessageCircle className="h-4 w-4" />{t.upgrade}
              </a>
            </div>
          )}

          {planAllowsTeam && !created && (
            <div className="space-y-3 rounded-xl border border-ivory-border bg-ivory p-4">
              <h3 className="text-sm font-bold text-charcoal">{t.invite}</h3>
              {room === 0 ? <p className="text-sm text-charcoal-muted">{t.teamFull}</p> : (
                <>
                  <p className="text-xs text-charcoal-muted">{t.slotsLeft(room)}</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block"><span className="field-label">{t.role}</span>
                      <select className="field" value={role} onChange={(e) => setRole(e.target.value as FarmRole)}>
                        {INVITABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r][lang]}</option>)}
                      </select>
                    </label>
                    <label className="block"><span className="field-label">{t.inviteWho}</span>
                      <input className="field" value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} autoComplete="off" />
                    </label>
                  </div>
                  <p className="text-xs text-charcoal-muted">{ROLE_SUMMARY[role][lang]} {t.inviteWhoHint}</p>
                  <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void invite()}>
                    <Plus className="h-4 w-4" />{busy ? t.creating : t.create}
                  </button>
                </>
              )}
            </div>
          )}

          {created && (
            <div role="status" className="space-y-3 rounded-xl border border-sage-300 bg-sage/10 p-4">
              <h3 className="text-sm font-bold text-charcoal">{t.ready}</h3>
              <p className="text-sm text-charcoal-light">{t.readyBody(created.who)}</p>
              <p className="text-xs font-semibold text-charcoal-muted">{t.code}</p>
              <p className="select-all font-display text-3xl tracking-widest text-charcoal">{created.code}</p>
              <p className="select-all break-all rounded-lg bg-white p-2 text-xs text-charcoal-muted">{created.link}</p>
              <div className="flex flex-wrap gap-2">
                <a className="btn btn-primary" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(created.message)}`}>
                  <MessageCircle className="h-4 w-4" />{t.shareWhatsapp}
                </a>
                <button type="button" className="btn btn-secondary" onClick={() => {
                  void navigator.clipboard?.writeText(created.message).then(() => setCopied(true)).catch(() => undefined);
                }}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? t.copied : t.copy}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setCreated(null)}>{t.done}</button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
