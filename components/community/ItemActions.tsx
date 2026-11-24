'use client';
import { useState } from 'react';
import { Flag, Trash2 } from 'lucide-react';
import { FLAG_REASONS, type FlagReason } from '@/lib/community';
import { COMMUNITY_COPY, type Lang } from '@/lib/community-copy';
import { OUTBREAK_COPY } from '@/lib/outbreak-copy';
import { communityCall, describeError } from '@/lib/community-client';

type Item = { postId: string } | { replyId: string };

/**
 * Under someone else's post or reply: "Report" (to Mylkio staff, with a reason; anyone in the group, workers too) and, for
 * the group's admin, "Remove". Nothing shows under a farm's own posts: it deletes those itself.
 */
export function ItemActions({ lang, groupId, item, mine, isAdmin, onRemoved }: {
  lang: Lang; groupId: string; item: Item; mine: boolean; isAdmin: boolean; onRemoved: () => void;
}) {
  const t = COMMUNITY_COPY[lang];
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<FlagReason>('rumour');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (mine) return null;

  const run = async (work: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await work(); } catch (e) { setError(describeError(e, t, t.actionError)); } finally { setBusy(false); }
  };
  const send = () => run(async () => {
    await communityCall('/api/community/flags', { method: 'POST', body: { ...item, reason } });
    setDone(true); setOpen(false);
  });
  const remove = () => {
    if (!window.confirm(t.adminRemoveConfirm)) return;
    void run(async () => { await communityCall(`/api/community/groups/${groupId}/moderate`, { method: 'DELETE', body: item }); onRemoved(); });
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-2">
        {!done && !open && <button type="button" className="btn btn-ghost !min-h-10 !px-2 text-sm !text-charcoal-muted" onClick={() => setOpen(true)}><Flag className="h-4 w-4" />{t.report}</button>}
        {isAdmin && <button type="button" className="btn btn-ghost !min-h-10 !px-2 text-sm !text-red-700" disabled={busy} onClick={remove}><Trash2 className="h-4 w-4" />{t.adminRemove}</button>}
      </div>
      {done && <p role="status" className="text-xs text-charcoal-muted">{t.reported}</p>}
      {open && (
        <div className="space-y-2 rounded-xl border border-ivory-border bg-ivory p-3">
          <label className="field-label" htmlFor={`why-${'postId' in item ? item.postId : item.replyId}`}>{t.reportWhy}</label>
          <select id={`why-${'postId' in item ? item.postId : item.replyId}`} className="field" value={reason} onChange={(e) => setReason(e.target.value as FlagReason)}>
            {FLAG_REASONS.map((r) => <option key={r} value={r}>{t.reasons[r]}</option>)}
          </select>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void send()}>{t.reportSend}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>{OUTBREAK_COPY[lang].cancel}</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-2 text-sm text-red-800">{error}</p>}
    </div>
  );
}
