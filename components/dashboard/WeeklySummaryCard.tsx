'use client';

import React, { useState } from 'react';
import { CalendarDays, MessageCircle } from 'lucide-react';
import type { Language } from '@/types';
import { formatFarmDate } from '@/lib/dates';
import { formatKsh } from '@/lib/money';
import { WEEKLY_COPY } from '@/lib/weekly-copy';
import type { WeeklySummary } from '@/lib/weekly-summary';

const litres = (n: number) => `${n.toLocaleString('en-KE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`;
const seenKey = (farmId: string) => `mylkio_weekly_seen_${farmId}`;

function alreadyDismissed(farmId: string, weekStart: string) {
  try { return window.localStorage.getItem(seenKey(farmId)) === weekStart; } catch { return false; }
}

/**
 * "Last week on your farm": the figures for the last full week (Monday to Sunday) with a button that opens WhatsApp
 * with the same figures written out. Nothing is sent for the farmer: they choose who gets it. It stays until it is
 * dismissed or next week's summary replaces it (the dismissal is remembered for that week, on this phone).
 */
export function WeeklySummaryCard({ summary, farmId, farmName, lang }: { summary: WeeklySummary; farmId: string; farmName: string; lang: Language }) {
  const t = WEEKLY_COPY[lang];
  const [hiddenWeek, setHiddenWeek] = useState<string | null>(() => (alreadyDismissed(farmId, summary.weekStart) ? summary.weekStart : null));
  if (hiddenWeek === summary.weekStart) return null;

  const range = t.weekOf(formatFarmDate(summary.weekStart, lang), formatFarmDate(summary.weekEnd, lang));
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(t.shareText(farmName, range, summary))}`;
  const change = t.change(summary.changePercent);

  const dismiss = () => {
    try { window.localStorage.setItem(seenKey(farmId), summary.weekStart); } catch { /* it just comes back next time */ }
    setHiddenWeek(summary.weekStart);
  };

  const row = (label: string, value: React.ReactNode, note?: React.ReactNode) => (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-gray-100 py-2 last:border-0">
      <dt className="text-sm text-gray-600">{label}</dt>
      <dd className="text-sm font-bold text-gray-900">{value}{note && <span className="ml-2 text-xs font-medium text-gray-500">{note}</span>}</dd>
    </div>
  );

  return (
    <section aria-labelledby="weekly-heading" className="space-y-3 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-[#A8BFA5]/20 p-2 text-[#345C4A]"><CalendarDays className="h-5 w-5" aria-hidden="true" /></span>
        <div>
          <h2 id="weekly-heading" className="text-base font-bold text-gray-900">{t.title}</h2>
          <p className="text-sm text-gray-600">{range}</p>
        </div>
      </div>

      <dl>
        {row(t.produced, litres(summary.produced), change)}
        {row(t.sold, summary.soldState === 'ok' && summary.notSold !== null ? `${litres(summary.sold)} · ${litres(summary.notSold)} ${t.notSold}` : litres(summary.sold))}
        {summary.soldState === 'sold_more' && <p className="py-1 text-xs font-medium text-amber-900">{t.soldMore}</p>}
        {row(t.billed, formatKsh(summary.billed))}
        {row(t.received, formatKsh(summary.received))}
        {row(t.owing, summary.buyersOwing > 0 ? t.owingValue(summary.owedTotal, summary.buyersOwing) : t.owingNone)}
        {row(t.overdue, summary.overdueReminders > 0 ? String(summary.overdueReminders) : t.overdueNone)}
      </dl>

      {summary.recorders && summary.recorders.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-900">{t.who}</h3>
          <ul className="mt-1 space-y-0.5 text-sm text-gray-700">
            {summary.recorders.map((r) => <li key={r.id}><span className="font-semibold">{r.name}</span>: {t.recorded(r.milk, r.health, r.breeding)}</li>)}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <a className="btn btn-primary" href={shareUrl} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />{t.share}</a>
        <button type="button" className="btn btn-secondary" onClick={dismiss}>{t.dismiss}</button>
      </div>
    </section>
  );
}
