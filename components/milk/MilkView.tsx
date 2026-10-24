'use client';

import React, { useState } from 'react';
import { MilkEntry, Cow, Language } from '@/types';
import { translations } from '@/lib/translations';
import { Milk, Plus, Calendar, Clock, Award, Trash2, TrendingUp, CheckCircle } from 'lucide-react';

interface MilkViewProps {
  entries: MilkEntry[];
  cows: Cow[];
  onOpenRecordModal: () => void;
  onDeleteEntry: (id: string) => void;
  lang: Language;
}

export const MilkView: React.FC<MilkViewProps> = ({
  entries,
  cows,
  onOpenRecordModal,
  onDeleteEntry,
  lang,
}) => {
  const t = translations[lang];
  const [filterSession, setFilterSession] = useState<'all' | 'AM' | 'PM'>('all');

  const todayStr = new Date().toISOString().split('T')[0];

  // Calculate today's total production
  const todayEntries = entries.filter((e) => e.date === todayStr);
  const todayLitres = todayEntries.reduce((acc, e) => acc + e.totalLitres, 0);

  const todayAM = todayEntries
    .filter((e) => e.session === 'AM')
    .reduce((acc, e) => acc + e.totalLitres, 0);

  const todayPM = todayEntries
    .filter((e) => e.session === 'PM')
    .reduce((acc, e) => acc + e.totalLitres, 0);

  // Filter entries
  const filteredEntries = entries.filter((e) => {
    if (filterSession === 'all') return true;
    return e.session === filterSession;
  });

  // Calculate top cows from cowBreakdowns across all entries
  const cowProductionMap: Record<string, { tag: string; name?: string; litres: number; photoUrl?: string }> = {};

  entries.forEach((entry) => {
    if (entry.cowBreakdown) {
      entry.cowBreakdown.forEach((cb) => {
        const cow = cows.find((c) => c.id === cb.cowId);
        if (!cowProductionMap[cb.cowId]) {
          cowProductionMap[cb.cowId] = {
            tag: cb.cowTag,
            name: cb.cowName,
            litres: 0,
            photoUrl: cow?.photoUrl,
          };
        }
        cowProductionMap[cb.cowId].litres += cb.litres;
      });
    }
  });

  const topCows = Object.values(cowProductionMap)
    .sort((a, b) => b.litres - a.litres)
    .slice(0, 3);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {lang === 'sw' ? 'Uzalishaji wa Maziwa' : 'Milk Production'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'sw'
              ? 'Rekodi na ufuatilie maziwa ya shamba au kwa kila ng\'ombe'
              : 'Log daily farm totals or individual cow yields in under 30 seconds'}
          </p>
        </div>

        <button
          onClick={onOpenRecordModal}
          className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-dairy-600 hover:bg-dairy-700 text-white font-semibold text-sm shadow-sm transition-all touch-target"
        >
          <Plus className="w-5 h-5" />
          <span>{lang === 'sw' ? 'Rekodi Maziwa Leo' : 'Record Milk Yield'}</span>
        </button>
      </div>

      {/* Production Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today's Total */}
        <div className="bg-gradient-to-br from-dairy-900 via-dairy-800 to-dairy-900 rounded-3xl p-5 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-dairy-200">
                {lang === 'sw' ? 'Maziwa ya Leo' : "Today's Farm Yield"}
              </span>
              <div className="p-2 bg-white/10 rounded-xl">
                <Milk className="w-5 h-5 text-dairy-200" />
              </div>
            </div>
            <div className="text-3xl font-extrabold mt-3">
              {todayLitres.toFixed(1)} <span className="text-base font-normal text-dairy-200">{t.common.litres}</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-dairy-700/60 flex items-center justify-between text-xs text-dairy-200">
            <span>AM: {todayAM.toFixed(1)}L</span>
            <span>PM: {todayPM.toFixed(1)}L</span>
          </div>
        </div>

        {/* 7-Day Average */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {lang === 'sw' ? 'Wastani wa Siku 7' : '7-Day Daily Average'}
              </span>
              <div className="p-2 bg-[#A9B392]/20 rounded-xl text-[#48563A]">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-gray-900 mt-3">
              62.9 <span className="text-base font-normal text-gray-500">{t.common.litres}</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            {lang === 'sw' ? 'Uzalishaji umezidi kwa 4.1% wiki hii' : 'Production up 4.1% vs last week'}
          </p>
        </div>

        {/* Top Producer Highlight */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {lang === 'sw' ? 'Kinara wa Maziwa' : 'Top Producer'}
            </span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          {topCows.length > 0 ? (
            <div className="mt-3 flex items-center space-x-3">
              {topCows[0].photoUrl ? (
                <img
                  src={topCows[0].photoUrl}
                  alt={topCows[0].tag}
                  className="w-12 h-12 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-900 font-bold flex items-center justify-center shrink-0">
                  {topCows[0].tag.slice(-2)}
                </div>
              )}
              <div>
                <div className="text-base font-bold text-gray-900">
                  {topCows[0].name || topCows[0].tag}
                </div>
                <div className="text-xs font-medium text-amber-700">
                  {topCows[0].litres.toFixed(1)} L recorded
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400 mt-3">
              Log milk by cow to rank top producers
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-2">
            Based on logged cow-level sessions
          </p>
        </div>
      </div>

      {/* History Log Section */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {lang === 'sw' ? 'Kumbukumbu za Maziwa' : 'Milk Production History'}
            </h2>
            <p className="text-xs text-gray-500">
              {entries.length} {lang === 'sw' ? 'rekodi zilizohifadhiwa' : 'sessions logged'}
            </p>
          </div>

          <div className="flex items-center space-x-1.5 bg-gray-100 p-1 rounded-xl">
            {(['all', 'AM', 'PM'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterSession(s)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  filterSession === s
                    ? 'bg-white text-dairy-800 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {s === 'all' ? (lang === 'sw' ? 'Zote' : 'All') : s}
              </button>
            ))}
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            {lang === 'sw' ? 'Hakuna kumbukumbu za maziwa zilizopatikana.' : 'No milk entries found.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 sm:p-5 hover:bg-gray-50/70 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-gray-900">
                      {entry.date}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                      {entry.session}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                      entry.mode === 'cow_level'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-dairy-100 text-dairy-800'
                    }`}>
                      {entry.mode === 'cow_level'
                        ? (lang === 'sw' ? 'Kwa Ng\'ombe' : 'By Cow')
                        : (lang === 'sw' ? 'Jumla ya Shamba' : 'Farm Total')}
                    </span>
                  </div>

                  {entry.notes && (
                    <p className="text-xs text-gray-500 italic">
                      &quot;{entry.notes}&quot;
                    </p>
                  )}

                  {/* Cow breakdown preview if available */}
                  {entry.cowBreakdown && entry.cowBreakdown.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {entry.cowBreakdown.map((cb) => (
                        <span
                          key={cb.cowId}
                          className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                        >
                          {cb.cowName || cb.cowTag}: <strong>{cb.litres}L</strong>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Usage allocation preview if available */}
                  {entry.allocation && (
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 pt-1">
                      {entry.allocation.soldLitres > 0 && (
                        <span>Sold: <strong>{entry.allocation.soldLitres}L</strong></span>
                      )}
                      {entry.allocation.householdLitres > 0 && (
                        <span>Home: <strong>{entry.allocation.householdLitres}L</strong></span>
                      )}
                      {entry.allocation.calvesLitres > 0 && (
                        <span>Calves: <strong>{entry.allocation.calvesLitres}L</strong></span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-4">
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-dairy-800">
                      {entry.totalLitres.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">L</span>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(lang === 'sw' ? 'Je, una uhakika unataka kufuta rekodi hii?' : 'Delete this milk entry?')) {
                        onDeleteEntry(entry.id);
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
    </div>
  );
};
