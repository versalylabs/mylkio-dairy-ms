'use client';
import { useState } from 'react';
import { Phone } from 'lucide-react';
import { agoLabel } from '@/lib/community';
import { OUTBREAK_COPY, type Lang } from '@/lib/outbreak-copy';
import { communityCall } from '@/lib/community-client';
import { signLabel, type ReporterRow } from '@/lib/community-outbreak';
import { telHref } from '@/lib/vet/phone';

/**
 * For a group's admin only: which farm made each report in the last 30 days, with the person's name and phone, so they can
 * follow up. It is the one place a reporting farm is named. It is loaded only when the admin asks, the database refuses
 * anyone else, and each look is written to the audit log.
 */
export function AdminReports({ lang, groupId }: { lang: Lang; groupId: string }) {
  const t = OUTBREAK_COPY[lang];
  const [rows, setRows] = useState<ReporterRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const show = async () => {
    setBusy(true); setError('');
    try { setRows((await communityCall<{ reports: ReporterRow[] }>(`/api/community/groups/${groupId}/reports`)).reports); }
    catch { setError(t.actionError); }
    finally { setBusy(false); }
  };

  const vet = (v: ReporterRow['vetSeen']) => (v === 'yes' ? t.vetYes : v === 'called' ? t.vetCalled : t.vetNo);
  const now = Date.now();

  return (
    <section aria-labelledby="followup-heading" className="space-y-3 rounded-2xl border border-ivory-border bg-white p-4">
      <h2 id="followup-heading" className="text-base font-bold text-charcoal">{t.adminTitle}</h2>
      <p className="text-sm text-charcoal-light">{t.adminIntro}</p>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {!rows && <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void show()}>{busy ? '…' : t.adminShow}</button>}
      {rows && rows.length === 0 && <p className="text-sm text-charcoal-muted">{t.adminEmpty}</p>}
      {rows && rows.length > 0 && (
        <ul className="divide-y divide-ivory-border">
          {rows.map((r) => (
            <li key={r.id} className="space-y-1 py-3 text-sm">
              <p className="font-semibold text-charcoal">{r.farmName} · {r.area}</p>
              <p className="text-charcoal-light">{r.personName}{r.phone && <> · <a href={telHref(r.phone)} className="inline-flex items-center gap-1 font-semibold text-sage underline"><Phone className="h-3.5 w-3.5" />{r.phone}</a></>}</p>
              <p className="text-charcoal">{r.signs.map(signLabel).join('; ')}</p>
              <p className="text-xs text-charcoal-muted">{t.animalsLine(r.animals, r.days)} · {t.seenOnDate(r.seenOn)} · {t.vetLine(vet(r.vetSeen))} · {agoLabel(r.createdAt, now, lang)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
