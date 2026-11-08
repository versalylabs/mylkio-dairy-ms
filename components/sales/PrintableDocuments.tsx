'use client';

import React, { useState } from 'react';
import type { Buyer, CoopStatement, CustomerBill, Delivery, Farm, Language, PaymentRecord } from '@/types';
import { Dialog, ksh, primaryButton, secondaryButton } from '@/components/ui/Dialog';
import { farmToday, formatFarmDate, monthRange } from '@/lib/dates';
import { acceptedLitres, deliveryCharge } from '@/lib/ledger';
import { billSettlement, buyerStatement, type AllocationContext } from '@/lib/settlements';
import { FileText, Printer } from 'lucide-react';

function DocumentHeader({ farm, title, lines }: { farm: Farm; title: string; lines: string[] }) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-gray-200 pb-4">
      <div>
        <p className="text-lg font-black text-[#26332D]">{farm.name}</p>
        <p className="text-sm text-gray-700">{[farm.subCounty, farm.county].filter(Boolean).join(', ')}</p>
        {farm.phone && <p className="text-sm text-gray-700">{farm.phone}</p>}
      </div>
      <div className="sm:text-right">
        <p className="text-base font-bold uppercase tracking-wide text-gray-900">{title}</p>
        {lines.map((l) => <p key={l} className="text-sm text-gray-700">{l}</p>)}
      </div>
    </header>
  );
}

// ------------------------------------------------------------------
// Account statement for one buyer and month
// ------------------------------------------------------------------

interface AccountProps {
  open: boolean;
  onClose: () => void;
  buyer: Buyer | null;
  farm: Farm;
  deliveries: Delivery[];
  payments: PaymentRecord[];
  statements: CoopStatement[];
  lang: Language;
}

export function AccountStatementDialog({ open, onClose, buyer, farm, deliveries, payments, statements, lang }: AccountProps) {
  const sw = lang === 'sw';
  const [month, setMonth] = useState(farmToday().slice(0, 7));
  if (!buyer) return null;
  const range = monthRange(`${month}-01`);
  const st = buyerStatement(buyer, deliveries, payments, statements, range);

  const describe = (l: (typeof st.lines)[number]) => {
    switch (l.kind) {
      case 'opening': return sw ? 'Salio la awali' : 'Opening balance brought forward';
      case 'charge': return `${sw ? 'Utoaji' : 'Milk delivered'}: ${acceptedLitres(l.delivery)} L × KSh ${l.delivery.ratePerLitre}${l.delivery.rejectedLitres ? ` (${l.delivery.rejectedLitres} L ${sw ? 'zilikataliwa' : 'rejected'})` : ''}${l.delivery.slipReference ? ` · ${l.delivery.slipReference}` : ''}`;
      case 'statement': return `${sw ? 'Marekebisho ya taarifa ya ushirika' : 'Co-op statement adjustment'} ${l.statement.statementRef ?? ''} (${sw ? 'malipo halisi' : 'net payout'} ${ksh(l.net)})`;
      case 'receipt': return `${sw ? 'Malipo' : 'Payment received'} · ${l.payment.paymentMethod.toUpperCase()}${l.payment.referenceNo ? ` ${l.payment.referenceNo}` : ''}`;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      wide
      className="print-area"
      icon={<FileText className="w-5 h-5" />}
      title={sw ? 'Taarifa ya akaunti' : 'Account statement'}
      subtitle={buyer.name}
      footer={
        <>
          <label className="mr-auto flex items-center gap-2 text-sm font-semibold text-gray-800">
            {sw ? 'Mwezi' : 'Month'}
            <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-300" />
          </label>
          <button type="button" className={secondaryButton} onClick={onClose}>{sw ? 'Funga' : 'Close'}</button>
          <button type="button" className={primaryButton} onClick={() => window.print()}><Printer className="w-4 h-4" /> {sw ? 'Chapisha' : 'Print'}</button>
        </>
      }
    >
      <article className="space-y-4 text-gray-900">
        <DocumentHeader
          farm={farm}
          title={sw ? 'Taarifa ya Akaunti' : 'Statement of Account'}
          lines={[buyer.name, `${formatFarmDate(range.from, lang)} – ${formatFarmDate(range.to, lang)}`, buyer.memberNumber ? `${sw ? 'Nambari ya mwanachama' : 'Member no.'} ${buyer.memberNumber}` : ''].filter(Boolean)}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-300">
                <th className="py-2 pr-3 font-semibold">{sw ? 'Tarehe' : 'Date'}</th>
                <th className="py-2 pr-3 font-semibold">{sw ? 'Maelezo' : 'Details'}</th>
                <th className="py-2 pr-3 font-semibold text-right">{sw ? 'Deni' : 'Charge'}</th>
                <th className="py-2 pr-3 font-semibold text-right">{sw ? 'Malipo' : 'Paid'}</th>
                <th className="py-2 font-semibold text-right">{sw ? 'Salio' : 'Balance'}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-3">{formatFarmDate(range.from, lang)}</td>
                <td className="py-2 pr-3 font-semibold">{sw ? 'Salio lililoletwa' : 'Balance brought forward'}</td>
                <td /><td />
                <td className="py-2 text-right font-semibold">{ksh(st.openingBalance)}</td>
              </tr>
              {st.lines.map((l, i) => (
                <tr key={i} className="border-b border-gray-100 align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">{formatFarmDate(l.date, lang)}</td>
                  <td className="py-2 pr-3">{describe(l)}</td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap">{l.kind !== 'receipt' ? ksh(l.amount) : ''}</td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap">{l.kind === 'receipt' ? ksh(l.amount) : ''}</td>
                  <td className="py-2 text-right whitespace-nowrap">{ksh(l.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-400 font-bold">
                <td className="py-2 pr-3" colSpan={2}>{sw ? 'Jumla ya kipindi' : 'Period totals'}</td>
                <td className="py-2 pr-3 text-right">{ksh(st.charges)}</td>
                <td className="py-2 pr-3 text-right">{ksh(st.receipts)}</td>
                <td className="py-2 text-right">{ksh(st.closingBalance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-base font-bold">
          {st.closingBalance > 0
            ? (sw ? `Kiasi kinachodaiwa: ${ksh(st.closingBalance)}` : `Amount due: ${ksh(st.closingBalance)}`)
            : st.closingBalance < 0
            ? (sw ? `Malipo ya mapema yaliyobaki: ${ksh(-st.closingBalance)}` : `Advance held: ${ksh(-st.closingBalance)}`)
            : (sw ? 'Hakuna deni.' : 'Nothing owed.')}
        </p>
        {st.lines.length === 0 && <p className="text-sm text-gray-600">{sw ? 'Hakuna shughuli katika mwezi huu.' : 'No activity in this month.'}</p>}
      </article>
    </Dialog>
  );
}

// ------------------------------------------------------------------
// Customer bill
// ------------------------------------------------------------------

interface BillProps {
  bill: CustomerBill | null;
  onClose: () => void;
  farm: Farm;
  deliveries: Delivery[];
  ctx: AllocationContext;
  lang: Language;
}

export function BillDialog({ bill, onClose, farm, deliveries, ctx, lang }: BillProps) {
  const sw = lang === 'sw';
  if (!bill) return null;
  const items = deliveries.filter((d) => bill.deliveryIds.includes(d.id)).sort((a, b) => a.date.localeCompare(b.date));
  const pay = billSettlement(bill, ctx);
  return (
    <Dialog
      open
      onClose={onClose}
      wide
      className="print-area"
      icon={<FileText className="w-5 h-5" />}
      title={`${sw ? 'Bili' : 'Bill'} ${bill.billNumber}`}
      subtitle={bill.buyerName}
      footer={
        <>
          <button type="button" className={secondaryButton} onClick={onClose}>{sw ? 'Funga' : 'Close'}</button>
          <button type="button" className={primaryButton} onClick={() => window.print()}><Printer className="w-4 h-4" /> {sw ? 'Chapisha' : 'Print'}</button>
        </>
      }
    >
      <article className="space-y-4 text-gray-900">
        <DocumentHeader
          farm={farm}
          title={sw ? 'Bili ya Maziwa' : 'Milk Bill'}
          lines={[
            bill.billNumber,
            bill.buyerName,
            `${formatFarmDate(bill.periodFrom, lang)} – ${formatFarmDate(bill.periodTo, lang)}`,
            bill.dueDate ? `${sw ? 'Lipa kabla ya' : 'Due by'} ${formatFarmDate(bill.dueDate, lang)}` : '',
          ].filter(Boolean)}
        />
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-300">
              <th className="py-2 pr-3 font-semibold">{sw ? 'Tarehe' : 'Date'}</th>
              <th className="py-2 pr-3 font-semibold text-right">{sw ? 'Lita' : 'Litres'}</th>
              <th className="py-2 pr-3 font-semibold text-right">{sw ? 'Bei' : 'Rate'}</th>
              <th className="py-2 font-semibold text-right">{sw ? 'Kiasi' : 'Amount'}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.id} className="border-b border-gray-100">
                <td className="py-1.5 pr-3">{formatFarmDate(d.date, lang)}</td>
                <td className="py-1.5 pr-3 text-right">{acceptedLitres(d)}</td>
                <td className="py-1.5 pr-3 text-right">{d.ratePerLitre}</td>
                <td className="py-1.5 text-right">{ksh(deliveryCharge(d))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="font-bold">
            <tr className="border-t-2 border-gray-400">
              <td className="py-2 pr-3">{sw ? 'Jumla' : 'Total'}</td>
              <td className="py-2 pr-3 text-right">{bill.litres}</td>
              <td />
              <td className="py-2 text-right">{ksh(bill.amount)}</td>
            </tr>
            {pay.allocated > 0 && (
              <tr><td className="py-1 pr-3" colSpan={3}>{sw ? 'Imelipwa' : 'Paid against this bill'}</td><td className="py-1 text-right">− {ksh(pay.allocated)}</td></tr>
            )}
            <tr><td className="py-1 pr-3" colSpan={3}>{sw ? 'Kiasi kinachodaiwa' : 'Amount due'}</td><td className="py-1 text-right">{ksh(Math.max(0, pay.outstanding))}</td></tr>
          </tfoot>
        </table>
        {farm.phone && (
          <p className="text-sm text-gray-700">
            {sw ? `Lipa kwa M-Pesa au pesa taslimu. Maswali: ${farm.phone}` : `Pay by M-Pesa or cash. Questions: ${farm.phone}`}
          </p>
        )}
      </article>
    </Dialog>
  );
}
