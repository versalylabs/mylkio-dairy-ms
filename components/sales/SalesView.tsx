'use client';

import React, { useState } from 'react';
import { Buyer, Delivery, PaymentRecord, Language } from '@/types';
import { translations } from '@/lib/translations';
import { farmToday, formatFarmDate, monthRange } from '@/lib/dates';
import { acceptedLitres, cashReceived, deliveryCharge, possibleDuplicatePayments, salesInRange, summariseBalances } from '@/lib/ledger';
import { 
  Plus, 
  Truck, 
  DollarSign, 
  Users, 
  Building2, 
  User, 
  Phone, 
  Edit2, 
  Trash2, 
  Ban,
  AlertTriangle,
  Wallet,
  Calendar,
  Smartphone,
  Banknote,
  CreditCard
} from 'lucide-react';

interface SalesViewProps {
  buyers: Buyer[];
  deliveries: Delivery[];
  payments: PaymentRecord[];
  onOpenAddBuyer: () => void;
  onEditBuyer: (buyer: Buyer) => void;
  onDeleteBuyer: (id: string) => void;
  onOpenRecordDelivery: () => void;
  onVoidDelivery: (id: string, reason: string) => void;
  onOpenRecordPayment: () => void;
  onVoidPayment: (id: string, reason: string) => void;
  lang: Language;
}

export const SalesView: React.FC<SalesViewProps> = ({
  buyers,
  deliveries,
  payments,
  onOpenAddBuyer,
  onEditBuyer,
  onDeleteBuyer,
  onOpenRecordDelivery,
  onVoidDelivery,
  onOpenRecordPayment,
  onVoidPayment,
  lang,
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'deliveries' | 'payments' | 'buyers'>('deliveries');

  const sw = lang === 'sw';
  const month = monthRange(farmToday());
  // `buyers` arrive with ledger-derived balances (see app/page.tsx).
  const owed = summariseBalances(buyers.map((b) => b.currentBalance));
  const monthSales = salesInRange(deliveries, month);
  const monthCash = cashReceived(payments, month);
  const duplicates = possibleDuplicatePayments(payments);
  const [showVoided, setShowVoided] = useState(false);
  const visibleDeliveries = [...deliveries]
    .filter((d) => showVoided || !d.voidedAt)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const visiblePayments = [...payments]
    .filter((p) => showVoided || !p.voidedAt)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const voidedCount = deliveries.filter((d) => d.voidedAt).length + payments.filter((p) => p.voidedAt).length;
  const monthName = new Intl.DateTimeFormat(sw ? 'sw-KE' : 'en-KE', { month: 'long', timeZone: 'UTC' }).format(new Date(`${month.from}T00:00:00Z`));

  const askReason = (question: string) => {
    const reason = window.prompt(question, sw ? 'Imeingizwa kimakosa' : 'Entered by mistake');
    return reason && reason.trim() ? reason.trim() : null;
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {lang === 'sw' ? 'Mauzo na Malipo ya Maziwa' : 'Sales, Deliveries & Payments'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'sw'
              ? 'Leja za ushirika, wateja wa nyumbani na risiti za malipo'
              : 'Cooperative settlements, household deliveries & payment ledgers'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenRecordDelivery}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-dairy-600 hover:bg-dairy-700 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <Truck className="w-4 h-4" />
            <span>{lang === 'sw' ? 'Rekodi Utoaji' : 'Log Delivery'}</span>
          </button>

          <button
            onClick={onOpenRecordPayment}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#C6A76A] hover:bg-[#b39252] text-white font-semibold text-xs shadow-xs transition-all"
          >
            <DollarSign className="w-4 h-4" />
            <span>{lang === 'sw' ? 'Pokea Malipo' : 'Receive Payment'}</span>
          </button>

          <button
            onClick={onOpenAddBuyer}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold text-xs shadow-2xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t.buyers.addBuyerBtn}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Outstanding Receivables */}
        <div className="bg-[#FAF5EB] rounded-3xl p-5 border border-[#E5D5B5] shadow-xs flex items-center justify-between text-[#26332D]">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#b39252]">
              {lang === 'sw' ? 'Deni Linalodaiwa' : 'Outstanding Receivables'}
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#26332D] mt-2">
              KSh {owed.owedToFarm.toLocaleString()}
            </div>
            <p className="text-sm text-[#5D7368] mt-1">
              {sw ? `Wanunuzi ${owed.buyersOwing} wanadaiwa` : `Owed by ${owed.buyersOwing} buyer${owed.buyersOwing === 1 ? '' : 's'}`}
              {owed.advancesHeld > 0 && (sw ? ` · Malipo ya mapema KSh ${owed.advancesHeld.toLocaleString()}` : ` · KSh ${owed.advancesHeld.toLocaleString()} held as advances`)}
            </p>
          </div>
          <div className="p-3 bg-white text-[#C6A76A] rounded-2xl shadow-2xs border border-[#E5D5B5]">
            <Wallet className="w-7 h-7" />
          </div>
        </div>

        {/* Milk Delivered */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {sw ? `Yaliyokubaliwa — ${monthName}` : `Accepted in ${monthName}`}
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
              {monthSales.acceptedLitres.toFixed(1)} <span className="text-sm font-normal text-gray-500">L</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {sw ? `Thamani KSh ${monthSales.billed.toLocaleString()}` : `Billed KSh ${monthSales.billed.toLocaleString()}`}
              {monthSales.rejectedLitres > 0 && (sw ? ` · ${monthSales.rejectedLitres} L zilikataliwa` : ` · ${monthSales.rejectedLitres} L rejected`)}
            </p>
          </div>
          <div className="p-3 bg-[#A8BFA5]/20 text-[#345C4A] rounded-2xl">
            <Truck className="w-7 h-7" />
          </div>
        </div>

        {/* Cash & M-Pesa Received */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {sw ? `Pesa iliyopokelewa — ${monthName}` : `Received in ${monthName}`}
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-dairy-800 mt-2">
              KSh {monthCash.amount.toLocaleString()}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {sw ? `Risiti ${monthCash.count}` : `${monthCash.count} receipt${monthCash.count === 1 ? '' : 's'}`}
            </p>
          </div>
          <div className="p-3 bg-[#A8BFA5]/20 text-[#345C4A] rounded-2xl">
            <DollarSign className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('deliveries')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'deliveries'
              ? 'bg-dairy-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>{lang === 'sw' ? 'Leja ya Utoaji (Deliveries)' : 'Deliveries Ledger'}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'deliveries' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {deliveries.filter((d) => !d.voidedAt).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'payments'
              ? 'bg-dairy-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>{lang === 'sw' ? 'Risiti za Malipo (Payments)' : 'Payments Ledger'}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'payments' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {payments.filter((p) => !p.voidedAt).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('buyers')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'buyers'
              ? 'bg-dairy-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{lang === 'sw' ? 'Orodha ya Wanunuzi (Buyers)' : 'Buyers & Terms'}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'buyers' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {buyers.length}
          </span>
        </button>
      </div>

      {/* TAB 1: DELIVERIES LEDGER */}
      {activeTab === 'deliveries' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">
              {lang === 'sw' ? 'Kumbukumbu za Utoaji wa Maziwa' : 'Milk Deliveries & Billing Ledger'}
            </h2>
            {voidedCount > 0 && (
              <button type="button" onClick={() => setShowVoided(!showVoided)} className="text-sm font-medium text-dairy-700 underline">
                {showVoided ? (sw ? 'Ficha zilizobatilishwa' : 'Hide voided') : (sw ? 'Onyesha zilizobatilishwa' : 'Show voided')}
              </button>
            )}
          </div>

          {visibleDeliveries.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No delivery records found. Tap &quot;Log Delivery&quot; to record today&apos;s milk sale.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {visibleDeliveries.map((del) => (
                <div
                  key={del.id}
                  className={`p-4 sm:p-5 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${del.voidedAt ? 'bg-gray-50 opacity-70' : 'hover:bg-gray-50/70'}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-gray-900">
                        {del.buyerName}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        del.buyerType === 'cooperative'
                          ? 'bg-[#A8BFA5]/25 text-[#345C4A]'
                          : 'bg-[#FAF5EB] text-[#26332D] border border-[#E5D5B5]'
                      }`}>
                        {del.buyerType === 'cooperative' ? 'Co-op' : 'Household'}
                      </span>
                      <span className="text-sm text-gray-500 font-medium">
                        {formatFarmDate(del.date, lang)}
                      </span>
                      {del.voidedAt && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-gray-200 text-gray-700">{sw ? 'Imebatilishwa' : 'Voided'}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-700 flex-wrap">
                      <span>{sw ? 'Zilizokubaliwa' : 'Accepted'}: <strong>{acceptedLitres(del)} L</strong> @ KSh {del.ratePerLitre}/L</span>
                      {del.rejectedLitres > 0 && (
                        <span className="text-red-700">
                          {sw ? 'Zilizokataliwa' : 'Rejected'}: <strong>{del.rejectedLitres} L</strong> {sw ? `kati ya ${del.litres} L` : `of ${del.litres} L`}
                        </span>
                      )}
                      {del.adjustmentKSh !== 0 && (
                        <span className="text-amber-700">
                          Adjustment: <strong>{del.adjustmentKSh > 0 ? `+${del.adjustmentKSh}` : del.adjustmentKSh} KSh</strong>
                        </span>
                      )}
                    </div>

                    {del.voidedAt && del.voidReason && (
                      <p className="text-sm text-gray-600">{sw ? 'Sababu' : 'Reason'}: {del.voidReason}</p>
                    )}
                    {del.notes && (
                      <p className="text-sm text-gray-500 italic">
                        &quot;{del.notes}&quot;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-5">
                    <div className="text-right">
                      <div className={`text-base font-extrabold ${del.voidedAt ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        KSh {deliveryCharge(del).toLocaleString()}
                      </div>
                      <div className="text-sm font-medium text-gray-600">
                        {del.amountPaid > 0
                          ? (sw ? `Imelipwa papo hapo: KSh ${del.amountPaid.toLocaleString()}` : `Paid at delivery: KSh ${del.amountPaid.toLocaleString()}`)
                          : (sw ? 'Kwenye akaunti' : 'Added to account')}
                      </div>
                    </div>

                    {!del.voidedAt && (
                      <button
                        onClick={() => {
                          const reason = askReason(
                            sw
                              ? 'Kwa nini unabatilisha utoaji huu? Utabaki kwenye historia lakini hautadaiwa.'
                              : `Why are you voiding this delivery to ${del.buyerName}? It stays in history but is no longer billed${del.amountPaid > 0 ? ', and the payment taken with it is voided too' : ''}.`,
                          );
                          if (reason) onVoidDelivery(del.id, reason);
                        }}
                        className="flex items-center gap-1 px-2.5 py-2 text-sm font-semibold text-gray-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        aria-label={sw ? 'Batilisha utoaji' : `Void delivery to ${del.buyerName} on ${del.date}`}
                      >
                        <Ban className="w-4 h-4" />
                        <span>{sw ? 'Batilisha' : 'Void'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAYMENTS LEDGER */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">
              {lang === 'sw' ? 'Risiti za Malipo Yaliyopokelewa' : 'Payment Receipts & Settlement Ledger'}
            </h2>
            {voidedCount > 0 && (
              <button type="button" onClick={() => setShowVoided(!showVoided)} className="text-sm font-medium text-dairy-700 underline">
                {showVoided ? (sw ? 'Ficha zilizobatilishwa' : 'Hide voided') : (sw ? 'Onyesha zilizobatilishwa' : 'Show voided')}
              </button>
            )}
          </div>

          {visiblePayments.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No payments recorded yet. Tap &quot;Receive Payment&quot; when a buyer pays.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {visiblePayments.map((pay) => (
                <div
                  key={pay.id}
                  className={`p-4 sm:p-5 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${pay.voidedAt ? 'bg-gray-50 opacity-70' : 'hover:bg-gray-50/70'}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-gray-900">
                        {pay.buyerName}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#FAF5EB] text-[#26332D] border border-[#E5D5B5] flex items-center gap-1">
                        {pay.paymentMethod === 'mpesa' && <Smartphone className="w-3 h-3" />}
                        {pay.paymentMethod === 'cash' && <Banknote className="w-3 h-3" />}
                        {pay.paymentMethod === 'bank' && <CreditCard className="w-3 h-3" />}
                        <span>{pay.paymentMethod}</span>
                      </span>
                      <span className="text-sm text-gray-500 font-medium">
                        {formatFarmDate(pay.date, lang)}
                      </span>
                      {pay.source === 'delivery' && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-[#A8BFA5]/25 text-[#345C4A]">{sw ? 'Wakati wa utoaji' : 'At delivery'}</span>
                      )}
                      {pay.voidedAt && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-gray-200 text-gray-700">{sw ? 'Imebatilishwa' : 'Voided'}</span>
                      )}
                      {!pay.voidedAt && duplicates.has(pay.id) && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-900 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {sw ? 'Huenda imerudiwa' : 'Possible duplicate'}
                        </span>
                      )}
                    </div>
                    {pay.voidedAt && pay.voidReason && (
                      <p className="text-sm text-gray-600">{sw ? 'Sababu' : 'Reason'}: {pay.voidReason}</p>
                    )}

                    {pay.referenceNo && (
                      <div className="text-xs font-mono text-gray-600">
                        Ref / Code: <strong>{pay.referenceNo}</strong>
                      </div>
                    )}

                    {pay.notes && (
                      <p className="text-xs text-gray-400 italic">
                        &quot;{pay.notes}&quot;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-4">
                    <div className="text-right">
                      <span className={`text-lg font-black ${pay.voidedAt ? 'text-gray-500 line-through' : 'text-emerald-700'}`}>
                        +KSh {pay.amount.toLocaleString()}
                      </span>
                    </div>

                    {!pay.voidedAt && (
                      <button
                        onClick={() => {
                          const reason = askReason(
                            sw
                              ? 'Kwa nini unabatilisha malipo haya? Yatabaki kwenye historia lakini hayatahesabiwa.'
                              : `Why are you voiding this KSh ${pay.amount.toLocaleString()} payment? It stays in history but is no longer counted.`,
                          );
                          if (reason) onVoidPayment(pay.id, reason);
                        }}
                        className="flex items-center gap-1 px-2.5 py-2 text-sm font-semibold text-gray-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        aria-label={sw ? 'Batilisha malipo' : `Void payment of KSh ${pay.amount} from ${pay.buyerName}`}
                      >
                        <Ban className="w-4 h-4" />
                        <span>{sw ? 'Batilisha' : 'Void'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BUYERS & TERMS */}
      {activeTab === 'buyers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buyers.map((buyer) => (
            <div
              key={buyer.id}
              className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm hover:shadow transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-2 rounded-xl ${buyer.type === 'cooperative' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {buyer.type === 'cooperative' ? (
                        <Building2 className="w-5 h-5" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base leading-tight">
                        {buyer.name}
                      </h3>
                      <span className="text-[11px] font-medium text-gray-400 capitalize">
                        {buyer.type === 'cooperative' ? 'Dairy Cooperative' : 'Household / Direct'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  <div>
                    <span className="text-[11px] text-gray-400 block font-medium">
                      {t.buyers.rate}
                    </span>
                    <span className="text-base font-extrabold text-dairy-700">
                      KSh {buyer.ratePerLitre}
                      <span className="text-xs font-normal text-gray-500"> /L</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-gray-400 block font-medium">
                      {t.buyers.balance}
                    </span>
                    <span className={`text-base font-extrabold ${buyer.currentBalance > 0 ? 'text-amber-700' : buyer.currentBalance < 0 ? 'text-emerald-700' : 'text-gray-700'}`}>
                      KSh {Math.abs(buyer.currentBalance).toLocaleString()}
                    </span>
                    <span className="block text-xs text-gray-600">
                      {buyer.currentBalance > 0 ? (sw ? 'anadaiwa' : 'owed to you') : buyer.currentBalance < 0 ? (sw ? 'malipo ya mapema' : 'advance held') : (sw ? 'hakuna deni' : 'settled')}
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs text-gray-600">
                  {buyer.phone && (
                    <a
                      href={`tel:${buyer.phone}`}
                      className="inline-flex items-center space-x-1.5 text-dairy-700 hover:underline font-medium"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{buyer.phone}</span>
                    </a>
                  )}
                  {buyer.paymentCycle && (
                    <p className="text-[11px] text-gray-500">
                      Cycle: <span className="font-medium text-gray-700 capitalize">{buyer.paymentCycle}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end space-x-2">
                <button
                  onClick={() => onEditBuyer(buyer)}
                  className="p-2 rounded-lg text-gray-500 hover:text-dairy-700 hover:bg-dairy-50 transition-colors"
                  title={t.common.edit}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete ${buyer.name}?`)) {
                      onDeleteBuyer(buyer.id);
                    }
                  }}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title={t.common.delete}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
