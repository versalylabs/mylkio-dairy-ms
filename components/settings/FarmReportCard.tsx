'use client';

import React, { useMemo, useState } from 'react';
import { FileText, Printer } from 'lucide-react';
import type { Buyer, Cow, Delivery, ExpenseRecord, Farm, Language, MilkEntry, PaymentRecord } from '@/types';
import { Dialog, primaryButton, secondaryButton } from '@/components/ui/Dialog';
import { LockedFeature } from '@/components/billing/LockedFeature';
import { farmToday, formatFarmDate } from '@/lib/dates';
import { farmReport, reportMonthKeys } from '@/lib/farm-report';
import { REPORT_COPY } from '@/lib/report-copy';
import { canUse } from '@/lib/plans';

export interface FarmReportData {
  cows: Cow[];
  buyers: Pick<Buyer, 'name' | 'type'>[];
  milk: MilkEntry[];
  deliveries: Delivery[];
  payments: PaymentRecord[];
  expenses: ExpenseRecord[];
}

const dash = '–';
const whole = (n: number | null) => (n === null ? dash : n.toLocaleString('en-KE', { maximumFractionDigits: 0 }));
const oneDecimal = (n: number | null) => (n === null ? dash : n.toLocaleString('en-KE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

/**
 * Settings, next to export: the farm report for a bank or SACCO. Owners and managers on Farm Pro and up. On a plan
 * without it, one calm line names the plan that has it.
 */
export function FarmReportCard({ farm, data, subscription, lang }: {
  farm: Farm;
  data: FarmReportData;
  subscription?: { plan: string; status?: string; renewsAt?: string } | null;
  lang: Language;
}) {
  const t = REPORT_COPY[lang];
  const [open, setOpen] = useState(false);
  if (!canUse(subscription, 'farmReport')) return <LockedFeature feature="farmReport" />;
  return (
    <div className="space-y-3 rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-[#A8BFA5]/20 p-2 text-[#345C4A]"><FileText className="h-5 w-5" aria-hidden="true" /></span>
        <div>
          <h2 className="text-base font-bold text-gray-900">{t.settingsTitle}</h2>
          <p className="text-sm text-gray-600">{t.settingsText}</p>
        </div>
      </div>
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>{t.open}</button>
      {open && <FarmReportDialog farm={farm} data={data} lang={lang} onClose={() => setOpen(false)} />}
    </div>
  );
}

function FarmReportDialog({ farm, data, lang, onClose }: { farm: Farm; data: FarmReportData; lang: Language; onClose: () => void }) {
  const t = REPORT_COPY[lang];
  const today = farmToday();
  const thisMonth = today.slice(0, 7);
  const [endMonth, setEndMonth] = useState(thisMonth);
  const [includeNames, setIncludeNames] = useState(false);
  const endChoices = useMemo(() => reportMonthKeys(thisMonth, 24).reverse(), [thisMonth]);
  const monthLabel = (key: string, style: 'short' | 'long' = 'short') =>
    new Intl.DateTimeFormat(lang === 'sw' ? 'sw-KE' : 'en-KE', { month: style, year: 'numeric', timeZone: 'UTC' }).format(new Date(`${key}-01T00:00:00Z`));

  const report = useMemo(() => farmReport({ farm, ...data, endMonth, includeBuyerNames: includeNames, today }), [farm, data, endMonth, includeNames, today]);

  return (
    <Dialog
      open
      onClose={onClose}
      wide
      className="print-area"
      icon={<FileText className="h-5 w-5" />}
      title={t.title}
      subtitle={report.farmName}
      footer={
        <>
          <label className="mr-auto flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-800">
            {t.endMonth}
            <select value={endMonth} onChange={(e) => setEndMonth(e.target.value)} className="rounded-xl border border-gray-300 px-3 py-2">
              {endChoices.map((key) => <option key={key} value={key}>{monthLabel(key, 'long')}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <input type="checkbox" checked={includeNames} onChange={(e) => setIncludeNames(e.target.checked)} className="h-4 w-4" />
            {t.includeNames}
          </label>
          <button type="button" className={secondaryButton} onClick={onClose}>{t.close}</button>
          <button type="button" className={primaryButton} onClick={() => window.print()}><Printer className="h-4 w-4" /> {t.print}</button>
        </>
      }
    >
      <article className="farm-report space-y-4 text-gray-900" aria-label={t.title}>
        <header className="grid grid-cols-1 gap-x-6 gap-y-1 border-b border-gray-300 pb-3 text-sm sm:grid-cols-2">
          <p className="text-lg font-black sm:col-span-2">{report.farmName}</p>
          <p><span className="text-gray-600">{t.county}: </span>{report.county}</p>
          <p><span className="text-gray-600">{t.owner}: </span>{report.ownerName}</p>
          {report.ownerPhone && <p><span className="text-gray-600">{t.phone}: </span>{report.ownerPhone}</p>}
          <p><span className="text-gray-600">{t.reportDate}: </span>{formatFarmDate(report.reportDate, lang)}</p>
          <p className="sm:col-span-2"><span className="text-gray-600">{t.period}: </span>{formatFarmDate(report.from, lang)} – {formatFarmDate(report.to, lang)}</p>
        </header>

        <section aria-labelledby="report-monthly">
          <h2 id="report-monthly" className="mb-1 text-sm font-bold">{t.monthly}</h2>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[19rem] table-fixed border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-400 text-right">
                <th className="w-[19%] py-1 pr-2 text-left font-semibold">{t.month}</th>
                <th className="py-1 pr-2 font-semibold">{t.produced}</th>
                <th className="py-1 pr-2 font-semibold">{t.sold}</th>
                <th className="py-1 pr-2 font-semibold">{t.billed}</th>
                <th className="py-1 pr-2 font-semibold">{t.received}</th>
                <th className="py-1 font-semibold">{t.expenses}</th>
              </tr>
            </thead>
            <tbody>
              {report.months.map((m) => (
                <tr key={m.key} className="border-b border-gray-100 text-right tabular-nums">
                  <td className="py-1 pr-2 text-left">{monthLabel(m.key)}</td>
                  <td className="py-1 pr-2">{oneDecimal(m.produced)}</td>
                  <td className="py-1 pr-2">{oneDecimal(m.sold)}</td>
                  <td className="py-1 pr-2">{whole(m.billed)}</td>
                  <td className="py-1 pr-2">{whole(m.received)}</td>
                  <td className="py-1">{whole(m.expenses)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-400 text-right font-bold tabular-nums">
                <td className="py-1 pr-2 text-left">{t.total}</td>
                <td className="py-1 pr-2">{oneDecimal(report.totals.produced)}</td>
                <td className="py-1 pr-2">{oneDecimal(report.totals.sold)}</td>
                <td className="py-1 pr-2">{whole(report.totals.billed)}</td>
                <td className="py-1 pr-2">{whole(report.totals.received)}</td>
                <td className="py-1">{whole(report.totals.expenses)}</td>
              </tr>
            </tfoot>
          </table>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <section aria-labelledby="report-herd">
            <h2 id="report-herd" className="mb-1 text-sm font-bold">{t.herd}</h2>
            <ul className="space-y-0.5 text-sm">
              {(Object.keys(t.herdLabels) as (keyof typeof t.herdLabels)[]).map((key) => (
                <li key={key} className="flex justify-between gap-3"><span>{t.herdLabels[key]}</span><strong className="tabular-nums">{report.herd[key]}</strong></li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-gray-600">{t.herdNote}</p>
          </section>
          <section aria-labelledby="report-buyers">
            <h2 id="report-buyers" className="mb-1 text-sm font-bold">{t.buyers} ({report.buyersByType.total})</h2>
            <ul className="space-y-0.5 text-sm">
              {(Object.keys(t.buyerTypes) as (keyof typeof t.buyerTypes)[]).map((key) => (
                <li key={key} className="flex justify-between gap-3"><span>{t.buyerTypes[key]}</span><strong className="tabular-nums">{report.buyersByType[key]}</strong></li>
              ))}
            </ul>
            {report.buyerNames && report.buyerNames.length > 0 && <p className="mt-1 text-xs text-gray-700"><span className="font-semibold">{t.buyerNames}: </span>{report.buyerNames.join(', ')}</p>}
            <p className="mt-2 text-sm font-semibold">{t.continuous(report.continuousMilkMonths)}</p>
          </section>
        </div>

        <footer className="border-t border-gray-300 pt-2 text-xs italic text-gray-700">{t.footer}</footer>
      </article>
    </Dialog>
  );
}
