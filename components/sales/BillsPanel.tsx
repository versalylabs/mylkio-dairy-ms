'use client';

import React, { useMemo, useState } from 'react';
import type { Buyer, CustomerBill, Delivery, Language } from '@/types';
import { addDays, farmToday, formatFarmDate, monthRange, previousMonthRange } from '@/lib/dates';
import { acceptedLitres, deliveryCharge, roundMoney } from '@/lib/ledger';
import { billSettlement, unbilledDeliveries, type AllocationContext } from '@/lib/settlements';
import { ksh } from '@/components/ui/Dialog';
import { Ban, Printer, Receipt } from 'lucide-react';

interface Props {
  buyers: Buyer[];
  deliveries: Delivery[];
  bills: CustomerBill[];
  ctx: AllocationContext;
  onCreate: (buyerId: string, range: { from: string; to: string }, dueDate?: string) => void;
  onVoid: (id: string, reason: string) => void;
  onPrint: (bill: CustomerBill) => void;
  lang: Language;
}

export function BillsPanel({ buyers, deliveries, bills, ctx, onCreate, onVoid, onPrint, lang }: Props) {
  const sw = lang === 'sw';
  const customers = buyers.filter((b) => b.type !== 'cooperative');
  const [buyerId, setBuyerId] = useState(customers[0]?.id ?? '');
  const [month, setMonth] = useState(previousMonthRange(farmToday()).from.slice(0, 7));
  const [showVoided, setShowVoided] = useState(false);

  const range = monthRange(`${month}-01`);
  const pending = useMemo(() => (buyerId ? unbilledDeliveries(deliveries, bills, buyerId, range) : []), [deliveries, bills, buyerId, range.from]); // eslint-disable-line react-hooks/exhaustive-deps
  const pendingAmount = roundMoney(pending.reduce((s, d) => s + deliveryCharge(d), 0));
  const pendingLitres = Math.round(pending.reduce((s, d) => s + acceptedLitres(d), 0) * 10) / 10;
  const visible = bills.filter((b) => showVoided || !b.voidedAt).sort((a, b) => b.periodTo.localeCompare(a.periodTo) || b.createdAt.localeCompare(a.createdAt));
  const statusLabel = { unpaid: sw ? 'Haijalipwa' : 'Not paid yet', partly_paid: sw ? 'Imelipwa sehemu' : 'Partly paid', paid: sw ? 'Imelipwa' : 'Paid', overpaid: sw ? 'Imezidi' : 'Overpaid' };

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm space-y-4" aria-labelledby="new-bill-heading">
        <div>
          <h3 id="new-bill-heading" className="font-bold text-gray-900">{sw ? 'Tengeneza bili ya mwezi' : 'Create a monthly bill'}</h3>
          <p className="text-sm text-gray-600">
            {sw
              ? 'Bili inajumuisha utoaji ambao bado haujaingizwa kwenye bili. Utoaji mmoja hauwezi kuwa kwenye bili mbili.'
              : 'A bill includes every delivery not already billed. A delivery can never be on two bills.'}
          </p>
        </div>
        {customers.length === 0 ? (
          <p className="text-sm text-gray-600">{sw ? 'Ongeza mteja wa nyumbani kwanza.' : 'Add a household or shop customer first.'}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="bill-buyer" className="block text-sm font-semibold text-gray-800 mb-1">{sw ? 'Mteja' : 'Customer'}</label>
                <select id="bill-buyer" value={buyerId} onChange={(e) => setBuyerId(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-base bg-white">
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="bill-month" className="block text-sm font-semibold text-gray-800 mb-1">{sw ? 'Mwezi' : 'Month'}</label>
                <input id="bill-month" type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-base" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-2xl bg-gray-50">
              <p className="text-sm text-gray-800">
                {pending.length === 0
                  ? (sw ? 'Hakuna utoaji usio na bili katika mwezi huu.' : 'No unbilled deliveries for this customer in this month.')
                  : sw
                  ? `Utoaji ${pending.length} usio na bili: lita ${pendingLitres}, ${ksh(pendingAmount)}.`
                  : `${pending.length} unbilled deliveries: ${pendingLitres} L, ${ksh(pendingAmount)}.`}
              </p>
              <button type="button" disabled={pending.length === 0}
                onClick={() => onCreate(buyerId, range, addDays(range.to, 7))}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-dairy-600 hover:bg-dairy-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-sm">
                <Receipt className="w-4 h-4" /> {sw ? 'Tengeneza bili' : `Create bill for ${ksh(pendingAmount)}`}
              </button>
            </div>
          </>
        )}
      </section>

      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">{sw ? 'Bili zilizotolewa' : 'Bills issued'}</h3>
        {bills.some((b) => b.voidedAt) && (
          <button type="button" className="text-sm font-medium text-dairy-700 underline" onClick={() => setShowVoided(!showVoided)}>
            {showVoided ? (sw ? 'Ficha zilizobatilishwa' : 'Hide voided') : (sw ? 'Onyesha zilizobatilishwa' : 'Show voided')}
          </button>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="bg-white rounded-3xl border border-gray-200 p-6 text-center text-sm text-gray-600">{sw ? 'Bado hakuna bili.' : 'No bills yet.'}</p>
      ) : (
        <ul className="bg-white rounded-3xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {visible.map((b) => {
            const pay = billSettlement(b, ctx);
            return (
              <li key={b.id} className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${b.voidedAt ? 'bg-gray-50 opacity-70' : ''}`}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-bold text-gray-900 ${b.voidedAt ? 'line-through' : ''}`}>{b.buyerName}</span>
                    <span className="text-sm font-mono text-gray-600">{b.billNumber}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {formatFarmDate(b.periodFrom, lang)} – {formatFarmDate(b.periodTo, lang)} · {b.deliveryIds.length} {sw ? 'utoaji' : 'deliveries'} · {b.litres} L
                    {b.voidedAt && b.voidReason ? ` · ${sw ? 'Sababu' : 'Reason'}: ${b.voidReason}` : ''}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="text-right">
                    <div className="text-lg font-black text-gray-900">{ksh(b.amount)}</div>
                    {!b.voidedAt && (
                      <span className="text-sm text-gray-700">
                        {statusLabel[pay.status]}{pay.status === 'partly_paid' ? ` · ${ksh(pay.outstanding)} ${sw ? 'imebaki' : 'left'}` : ''}
                      </span>
                    )}
                  </div>
                  {!b.voidedAt && (
                    <>
                      <button type="button" onClick={() => onPrint(b)} className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100" aria-label={`Print bill ${b.billNumber}`}>
                        <Printer className="w-4 h-4" /> {sw ? 'Chapisha' : 'Print'}
                      </button>
                      <button type="button"
                        onClick={() => {
                          const reason = window.prompt(sw ? 'Kwa nini unabatilisha bili hii?' : 'Why are you voiding this bill? Its deliveries can then be billed again.', sw ? 'Imekosewa' : 'Wrong period');
                          if (reason?.trim()) onVoid(b.id, reason.trim());
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-rose-700 hover:bg-rose-50" aria-label={`Void bill ${b.billNumber}`}>
                        <Ban className="w-4 h-4" /> {sw ? 'Batilisha' : 'Void'}
                      </button>
                    </>
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
