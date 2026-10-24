'use client';

import React, { useState } from 'react';
import { Buyer, Delivery, PaymentRecord, Language } from '@/types';
import { translations } from '@/lib/translations';
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
  onDeleteDelivery: (id: string) => void;
  onOpenRecordPayment: () => void;
  onDeletePayment: (id: string) => void;
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
  onDeleteDelivery,
  onOpenRecordPayment,
  onDeletePayment,
  lang,
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'deliveries' | 'payments' | 'buyers'>('deliveries');

  const totalOwed = buyers.reduce((sum, b) => sum + (b.currentBalance > 0 ? b.currentBalance : 0), 0);
  const totalDeliveredLitres = deliveries.reduce((sum, d) => sum + d.litres, 0);
  const totalPaymentsReceived = payments.reduce((sum, p) => sum + p.amount, 0);

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
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-sm transition-all"
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
        <div className="bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 rounded-3xl p-5 text-white shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-100">
              {lang === 'sw' ? 'Deni Linalodaiwa' : 'Outstanding Receivables'}
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold mt-2">
              KSh {totalOwed.toLocaleString()}
            </div>
            <p className="text-xs text-amber-100/80 mt-1">
              Across {buyers.length} registered buyers
            </p>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl">
            <Wallet className="w-7 h-7 text-amber-100" />
          </div>
        </div>

        {/* Milk Delivered */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {lang === 'sw' ? 'Maziwa Yaliyopelekwa' : 'Total Delivered'}
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
              {totalDeliveredLitres.toFixed(1)} <span className="text-sm font-normal text-gray-500">L</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {deliveries.length} delivery records
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Truck className="w-7 h-7" />
          </div>
        </div>

        {/* Cash & M-Pesa Received */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {lang === 'sw' ? 'Malipo Yaliyopokelewa' : 'Payments Collected'}
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-dairy-800 mt-2">
              KSh {totalPaymentsReceived.toLocaleString()}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {payments.length} receipt records
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
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
            {deliveries.length}
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
            {payments.length}
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
            <span className="text-xs text-gray-500">
              Under 30s entry per record
            </span>
          </div>

          {deliveries.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No delivery records found. Tap &quot;Log Delivery&quot; to record today&apos;s milk sale.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {deliveries.map((del) => (
                <div
                  key={del.id}
                  className="p-4 sm:p-5 hover:bg-gray-50/70 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-gray-900">
                        {del.buyerName}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        del.buyerType === 'cooperative'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {del.buyerType === 'cooperative' ? 'Co-op' : 'Household'}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        {del.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                      <span>Volume: <strong>{del.litres} L</strong> @ KSh {del.ratePerLitre}/L</span>
                      {del.rejectedLitres > 0 && (
                        <span className="text-red-600">
                          Rejected: <strong>{del.rejectedLitres} L</strong>
                        </span>
                      )}
                      {del.adjustmentKSh !== 0 && (
                        <span className="text-amber-700">
                          Adjustment: <strong>{del.adjustmentKSh > 0 ? `+${del.adjustmentKSh}` : del.adjustmentKSh} KSh</strong>
                        </span>
                      )}
                    </div>

                    {del.notes && (
                      <p className="text-xs text-gray-400 italic">
                        &quot;{del.notes}&quot;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-5">
                    <div className="text-right">
                      <div className="text-base font-extrabold text-gray-900">
                        KSh {del.expectedAmount.toLocaleString()}
                      </div>
                      <div className="text-[11px] font-medium text-amber-700">
                        {del.balance > 0 ? `Balance: KSh ${del.balance.toLocaleString()}` : 'Paid in full'}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(lang === 'sw' ? 'Je, una uhakika unataka kufuta rekodi hii ya utoaji?' : 'Delete this delivery record?')) {
                          onDeleteDelivery(del.id);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
      )}

      {/* TAB 2: PAYMENTS LEDGER */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">
              {lang === 'sw' ? 'Risiti za Malipo Yaliyopokelewa' : 'Payment Receipts & Settlement Ledger'}
            </h2>
            <span className="text-xs text-gray-500">
              Cash, M-Pesa & Bank
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No payments recorded yet. Tap &quot;Receive Payment&quot; when a buyer pays.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {payments.map((pay) => (
                <div
                  key={pay.id}
                  className="p-4 sm:p-5 hover:bg-gray-50/70 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-gray-900">
                        {pay.buyerName}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 flex items-center gap-1">
                        {pay.paymentMethod === 'mpesa' && <Smartphone className="w-3 h-3" />}
                        {pay.paymentMethod === 'cash' && <Banknote className="w-3 h-3" />}
                        {pay.paymentMethod === 'bank' && <CreditCard className="w-3 h-3" />}
                        <span>{pay.paymentMethod}</span>
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        {pay.date}
                      </span>
                    </div>

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
                      <span className="text-lg font-black text-emerald-700">
                        +KSh {pay.amount.toLocaleString()}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(lang === 'sw' ? 'Je, una uhakika unataka kufuta malipo haya?' : 'Delete this payment record?')) {
                          onDeletePayment(pay.id);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                    <span className={`text-base font-extrabold ${buyer.currentBalance > 0 ? 'text-amber-600' : 'text-gray-700'}`}>
                      KSh {buyer.currentBalance.toLocaleString()}
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
