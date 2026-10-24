'use client';

import React, { useState } from 'react';
import { Buyer, BuyerType, Language } from '@/types';
import { translations } from '@/lib/translations';
import { Plus, Search, Building2, User, Phone, Edit2, Trash2, Wallet } from 'lucide-react';

interface BuyersViewProps {
  buyers: Buyer[];
  onAddBuyer: () => void;
  onEditBuyer: (buyer: Buyer) => void;
  onDeleteBuyer: (id: string) => void;
  lang: Language;
}

export const BuyersView: React.FC<BuyersViewProps> = ({
  buyers,
  onAddBuyer,
  onEditBuyer,
  onDeleteBuyer,
  lang,
}) => {
  const t = translations[lang];
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const totalOwed = buyers.reduce((sum, b) => sum + (b.currentBalance > 0 ? b.currentBalance : 0), 0);

  const filteredBuyers = buyers.filter((buyer) => {
    const matchesSearch =
      buyer.name.toLowerCase().includes(search.toLowerCase()) ||
      (buyer.phone && buyer.phone.includes(search));

    if (!matchesSearch) return false;

    if (filter === 'all') return true;
    if (filter === 'cooperative') return buyer.type === 'cooperative';
    if (filter === 'household') return buyer.type === 'household' || buyer.type === 'trader';
    return true;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {t.buyers.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t.buyers.subtitle} ({buyers.length} {lang === 'sw' ? 'wanunuzi' : 'registered'})
          </p>
        </div>

        <button
          onClick={onAddBuyer}
          className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-dairy-600 hover:bg-dairy-700 text-white font-semibold text-sm shadow-sm transition-all touch-target"
        >
          <Plus className="w-5 h-5" />
          <span>{t.buyers.addBuyerBtn}</span>
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-dairy-900 to-dairy-800 rounded-2xl p-5 text-white shadow-md flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-dairy-200">
            {lang === 'sw' ? 'Jumla ya Madeni ya Maziwa (Deni)' : 'Total Outstanding Receivables'}
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            KSh {totalOwed.toLocaleString()}
          </div>
          <p className="text-xs text-dairy-200/80">
            {lang === 'sw' ? 'Kutoka kwa vyama vya ushirika na wateja wa nyumbani' : 'From cooperative deliveries & household monthly accounts'}
          </p>
        </div>
        <div className="p-3 bg-white/10 rounded-2xl">
          <Wallet className="w-8 h-8 text-dairy-200" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'all', label: t.buyers.filterAll, count: buyers.length },
          { key: 'cooperative', label: t.buyers.filterCoop, count: buyers.filter(b => b.type === 'cooperative').length },
          { key: 'household', label: t.buyers.filterHousehold, count: buyers.filter(b => b.type !== 'cooperative').length },
        ].map((tab) => {
          const isActive = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                isActive
                  ? 'bg-dairy-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={lang === 'sw' ? 'Tafuta mnunuzi kwa jina au nambari...' : 'Search buyer by name or phone...'}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-dairy-500 focus:border-dairy-500"
        />
      </div>

      {/* Buyer Cards Grid */}
      {filteredBuyers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 p-6">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium text-sm">
            {lang === 'sw' ? 'Hakuna mnunuzi aliyepatikana.' : 'No milk buyers found.'}
          </p>
          <button
            onClick={onAddBuyer}
            className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-dairy-50 text-dairy-700 font-semibold text-xs rounded-lg hover:bg-dairy-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t.buyers.addBuyerBtn}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBuyers.map((buyer) => (
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
                        {buyer.type === 'cooperative'
                          ? (lang === 'sw' ? 'Chama cha Ushirika' : 'Dairy Cooperative')
                          : (lang === 'sw' ? 'Mteja wa Nyumbani' : 'Household / Direct')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pricing & Balance Box */}
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

                {/* Contact and Notes */}
                <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                  {buyer.phone && (
                    <a
                      href={`tel:${buyer.phone}`}
                      className="inline-flex items-center space-x-2 text-dairy-700 hover:underline font-medium"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{buyer.phone}</span>
                    </a>
                  )}

                  {buyer.paymentCycle && (
                    <p className="text-[11px] text-gray-500">
                      {lang === 'sw' ? 'Malipo:' : 'Cycle:'}{' '}
                      <span className="font-medium text-gray-700 capitalize">{buyer.paymentCycle}</span>
                    </p>
                  )}

                  {buyer.notes && (
                    <p className="text-[11px] text-gray-400 italic pt-1 border-t border-gray-100">
                      {buyer.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
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
                    if (confirm(lang === 'sw' ? `Una uhakika unataka kumfuta mnunuzi ${buyer.name}?` : `Are you sure you want to delete ${buyer.name}?`)) {
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
