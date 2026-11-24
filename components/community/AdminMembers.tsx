'use client';
import { useState } from 'react';
import { agoLabel, type GroupMemberRow } from '@/lib/community';
import { COMMUNITY_COPY, type Lang } from '@/lib/community-copy';
import { communityCall, describeError } from '@/lib/community-client';

/** For a group's admin: the member farms, and "Take out" for a member (not the admin's own farm, not another admin). */
export function AdminMembers({ lang, groupId }: { lang: Lang; groupId: string }) {
  const t = COMMUNITY_COPY[lang];
  const [rows, setRows] = useState<GroupMemberRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setBusy(true); setError('');
    try { setRows((await communityCall<{ members: GroupMemberRow[] }>(`/api/community/groups/${groupId}/moderate`)).members); }
    catch (e) { setError(describeError(e, t, t.loadError)); }
    finally { setBusy(false); }
  };
  const takeOut = async (m: GroupMemberRow) => {
    if (!window.confirm(t.takeOutConfirm(m.farmName))) return;
    setBusy(true); setError('');
    try { await communityCall(`/api/community/groups/${groupId}/moderate`, { method: 'DELETE', body: { farmId: m.farmId } }); await load(); }
    catch (e) { setError(describeError(e, t, t.actionError)); setBusy(false); }
  };

  return (
    <section aria-labelledby="members-heading" className="space-y-3 rounded-2xl border border-ivory-border bg-white p-4">
      <h2 id="members-heading" className="text-base font-bold text-charcoal">{t.membersTitle}</h2>
      <p className="text-sm text-charcoal-light">{t.membersIntro}</p>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {!rows && <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void load()}>{busy ? '…' : t.showMembers}</button>}
      {rows && (
        <ul className="divide-y divide-ivory-border">
          {rows.map((m) => (
            <li key={m.farmId} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-charcoal">{m.farmName}</p>
                <p className="text-xs text-charcoal-muted">{m.area} · {agoLabel(m.joinedAt, Date.now(), lang)}</p>
              </div>
              {m.role === 'member' && <button type="button" className="btn btn-ghost !min-h-10 !text-red-700" disabled={busy} onClick={() => void takeOut(m)}>{t.takeOut}</button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
