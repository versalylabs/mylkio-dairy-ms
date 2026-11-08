'use client';

import React, { useState } from 'react';
import type { CoopStatement, Delivery, Language } from '@/types';
import { formatFarmDate } from '@/lib/dates';
import { reconcileStatement, statementSettlement, type AllocationContext } from '@/lib/settlements';
import { ksh } from '@/components/ui/Dialog';
import { AlertTriangle, Ban, CheckCircle2, FileText, Plus } from 'lucide-react';

interface Props {
  statements: CoopStatement[];
  deliveries: Delivery[];
  ctx: AllocationContext;
  onRecord: () => void;
  onVoid: (id: string, reason: string) => void;
  lang: Language;
}

const statusStyle = {
  unpaid: 'bg-amber-100 text-amber-900',
  partly_paid: 'bg-blue-100 text-blue-900',
  paid: 'bg-[#A8BFA5]/30 text-[#26332D]',
  overpaid: 'bg-purple-100 text-purple-900',
};

export function StatementsPanel({ statements, deliveries, ctx, onRecord, onVoid, lang }: Props) {
  const sw = lang === 'sw';
  const [showVoided, setShowVoided] = useState(false);
  const visible = statements
    .filter((s) => showVoided || !s.voidedAt)
    .sort((a, b) => b.periodTo.localeCompare(a.periodTo));
  const statusLabel = {
    unpaid: sw ? 'Haijalipwa' : 'Not paid yet',
    partly_paid: sw ? 'Imelipwa sehemu' : 'Partly paid',
    paid: sw ? 'Imelipwa' : 'Paid',
    overpaid: sw ? 'Imezidi' : 'Overpaid',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-700 max-w-2xl">
          {sw
            ? 'Weka taarifa ya kila mwezi ya ushirika ili kulinganisha na rekodi zako. Taarifa ndiyo inayoamua kiasi cha kipindi hicho.'
            : 'Enter each monthly co-op statement to compare it with your own records. For its period, the statement decides what the co-op owes you.'}
        </p>
        <div className="flex items-center gap-3 shrink-0">
          {statements.some((s) => s.voidedAt) && (
            <button type="button" className="text-sm font-medium text-dairy-700 underline" onClick={() => setShowVoided(!showVoided)}>
              {showVoided ? (sw ? 'Ficha zilizobatilishwa' : 'Hide voided') : (sw ? 'Onyesha zilizobatilishwa' : 'Show voided')}
            </button>
          )}
          <button type="button" onClick={onRecord} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dairy-600 hover:bg-dairy-700 text-white font-bold text-sm">
            <Plus className="w-4 h-4" /> {sw ? 'Rekodi taarifa' : 'Record statement'}
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center text-sm text-gray-600">
          <FileText className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          {sw ? 'Bado hakuna taarifa za ushirika.' : 'No co-op statements yet. When your monthly statement arrives, record it here.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((s) => {
            const rec = reconcileStatement(s, deliveries);
            const pay = statementSettlement(s, ctx);
            return (
              <li key={s.id} className={`bg-white rounded-3xl border border-gray-200 p-5 shadow-sm space-y-3 ${s.voidedAt ? 'opacity-70' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className={`font-bold text-gray-900 ${s.voidedAt ? 'line-through' : ''}`}>{s.buyerName}</h3>
                    <p className="text-sm text-gray-600">
                      {formatFarmDate(s.periodFrom, lang)} – {formatFarmDate(s.periodTo, lang)}
                      {s.statementRef ? ` · ${s.statementRef}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-gray-900">{ksh(rec.net)}</div>
                    {s.voidedAt ? (
                      <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-gray-200 text-gray-700">{sw ? 'Imebatilishwa' : 'Voided'}</span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${statusStyle[pay.status]}`}>
                        {statusLabel[pay.status]}{pay.status === 'partly_paid' ? ` · ${ksh(pay.outstanding)} ${sw ? 'imebaki' : 'left'}` : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className={`rounded-2xl p-3 text-sm flex items-start gap-2 ${rec.matches ? 'bg-[#A8BFA5]/15' : 'bg-amber-50 border border-amber-200'}`}>
                  {rec.matches ? <CheckCircle2 className="w-4 h-4 mt-0.5 text-[#345C4A] shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-700 shrink-0" />}
                  <span>
                    {sw
                      ? `Ulirekodi lita ${rec.recordedAccepted}; taarifa inaonyesha lita ${rec.statementLitres}.`
                      : `You recorded ${rec.recordedAccepted} L; the statement shows ${rec.statementLitres} L.`}
                    {!rec.matches && (sw ? ` Kagua tofauti ya lita ${Math.abs(rec.litreDifference)}.` : ` Review the ${Math.abs(rec.litreDifference)} L difference.`)}
                    {rec.recordedRejected > 0 && (sw ? ` (Lita ${rec.recordedRejected} zilikataliwa.)` : ` (${rec.recordedRejected} L were rejected at collection.)`)}
                  </span>
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  <div className="p-2.5 rounded-xl bg-gray-50"><dt className="text-gray-600">{sw ? 'Jumla' : 'Gross'}</dt><dd className="font-bold">{ksh(rec.statementGross)}</dd></div>
                  <div className="p-2.5 rounded-xl bg-gray-50"><dt className="text-gray-600">{sw ? 'Makato' : 'Deductions'}</dt><dd className="font-bold">− {ksh(rec.deductions)}</dd></div>
                  <div className="p-2.5 rounded-xl bg-gray-50"><dt className="text-gray-600">{sw ? 'Rekodi zako' : 'Your records'}</dt><dd className="font-bold">{ksh(rec.recordedCharges)}</dd></div>
                  <div className="p-2.5 rounded-xl bg-gray-50"><dt className="text-gray-600">{sw ? 'Imelipwa' : 'Received'}</dt><dd className="font-bold">{ksh(pay.allocated)}</dd></div>
                </dl>

                {s.deductions.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer font-semibold text-gray-800">{sw ? 'Makato yaliyoorodheshwa' : 'Itemised deductions'}</summary>
                    <ul className="mt-2 divide-y divide-gray-100">
                      {s.deductions.map((d) => (
                        <li key={d.id} className="flex justify-between py-1.5"><span>{d.label}</span><span className="font-semibold">{ksh(d.amount)}</span></li>
                      ))}
                      {s.bonusKSh > 0 && <li className="flex justify-between py-1.5"><span>{sw ? 'Bonasi' : 'Bonus'}</span><span className="font-semibold">+ {ksh(s.bonusKSh)}</span></li>}
                    </ul>
                  </details>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
                  <span>
                    {s.expectedPaymentDate && !s.voidedAt && pay.status !== 'paid'
                      ? (sw ? `Malipo yanatarajiwa ${formatFarmDate(s.expectedPaymentDate, lang)}` : `Payout expected ${formatFarmDate(s.expectedPaymentDate, lang)}`)
                      : s.voidedAt ? `${sw ? 'Sababu' : 'Reason'}: ${s.voidReason ?? ''}` : ''}
                  </span>
                  {!s.voidedAt && (
                    <button type="button"
                      onClick={() => {
                        const reason = window.prompt(sw ? 'Kwa nini unabatilisha taarifa hii?' : 'Why are you voiding this statement? Payments allocated to it become unallocated.', sw ? 'Imeingizwa kimakosa' : 'Entered incorrectly');
                        if (reason?.trim()) onVoid(s.id, reason.trim());
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold text-gray-600 hover:text-rose-700 hover:bg-rose-50"
                      aria-label={sw ? 'Batilisha taarifa' : `Void statement for ${s.periodFrom} to ${s.periodTo}`}>
                      <Ban className="w-4 h-4" /> {sw ? 'Batilisha' : 'Void'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
