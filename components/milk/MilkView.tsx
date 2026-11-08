'use client';

import React, { useMemo, useState } from 'react';
import { MilkEntry, Cow, Language } from '@/types';
import { translations } from '@/lib/translations';
import { farmToday, formatFarmDate } from '@/lib/dates';
import { cowYields, countedEntryIds, dailyProduction, datesNeedingReview, productionTrend } from '@/lib/milk';
import { Milk, Plus, Award, Ban, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface MilkViewProps {
  entries: MilkEntry[];
  cows: Cow[];
  onOpenRecordModal: () => void;
  onVoidEntry: (id: string, reason: string) => void;
  lang: Language;
}

export const MilkView: React.FC<MilkViewProps> = ({
  entries,
  cows,
  onOpenRecordModal,
  onVoidEntry,
  lang,
}) => {
  const t = translations[lang];
  const sw = lang === 'sw';
  const [filterSession, setFilterSession] = useState<'all' | 'AM' | 'PM' | 'total'>('all');
  const [showVoided, setShowVoided] = useState(false);

  const todayStr = farmToday();
  const today = dailyProduction(entries, todayStr);
  const trend = productionTrend(entries, todayStr, 7);
  const review = datesNeedingReview(entries);
  const counted = useMemo(() => countedEntryIds(entries), [entries]);

  const topCows = cowYields(entries)
    .sort((a, b) => (b.averagePerDay ?? 0) - (a.averagePerDay ?? 0))
    .slice(0, 3);
  const topCowPhoto = topCows[0] ? cows.find((c) => c.id === topCows[0].cowId)?.photoUrl : undefined;

  const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const filteredEntries = sortedEntries.filter((e) => {
    if (!showVoided && e.voidedAt) return false;
    if (filterSession === 'all') return true;
    return e.session === filterSession;
  });
  const voidedCount = entries.filter((e) => e.voidedAt).length;

  const handleVoid = (entry: MilkEntry) => {
    const reason = window.prompt(
      sw
        ? `Kwa nini unabatilisha rekodi ya lita ${entry.totalLitres} (${entry.date})? Itabaki kwenye historia.`
        : `Why are you voiding the ${entry.totalLitres} L record for ${formatFarmDate(entry.date)}? It will stay in history but will no longer be counted.`,
      sw ? 'Imerekodiwa mara mbili' : 'Recorded twice',
    );
    if (reason && reason.trim()) onVoidEntry(entry.id, reason.trim());
  };

  const sessionText = (s: MilkEntry['session']) => (s === 'total' ? (sw ? 'Siku nzima' : 'Day total') : s);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {sw ? 'Uzalishaji wa Maziwa' : 'Milk Production'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {sw
              ? 'Rekodi maziwa ya shamba au ya kila ng\'ombe. Kila siku ina jumla moja tu.'
              : 'Record farm totals or cow yields. Each day has one counted total.'}
          </p>
        </div>

        <button
          onClick={onOpenRecordModal}
          className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-dairy-600 hover:bg-dairy-700 text-white font-semibold text-sm shadow-sm transition-all touch-target"
        >
          <Plus className="w-5 h-5" />
          <span>{sw ? 'Rekodi Maziwa' : 'Record Milk'}</span>
        </button>
      </div>

      {/* Records needing review */}
      {review.length > 0 && (
        <div className="p-4 rounded-3xl border-2 border-amber-300 bg-amber-50 text-amber-950 space-y-2" role="alert">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
            <span>
              {sw
                ? `Siku ${review.length} zina rekodi zinazopishana`
                : `${review.length} day${review.length > 1 ? 's have' : ' has'} overlapping milk records`}
            </span>
          </div>
          <ul className="text-sm space-y-1">
            {review.slice(0, 5).map((d) => (
              <li key={d.date}>
                <strong>{formatFarmDate(d.date, lang)}</strong>:{' '}
                {sw ? `tunahesabu ${d.litres} L. Hazihesabiwi: ` : `counting ${d.litres} L. Not counted: `}
                {d.ignored.map((e) => `${sessionText(e.session)} ${e.totalLitres} L`).join(', ')}.
              </li>
            ))}
          </ul>
          <p className="text-sm">
            {sw
              ? 'Batilisha rekodi isiyo sahihi hapa chini ili jumla iwe wazi.'
              : 'Void the incorrect record below so the day total is unambiguous.'}
          </p>
        </div>
      )}

      {/* Production Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today's Total */}
        <div className="bg-gradient-to-br from-dairy-900 via-dairy-800 to-dairy-900 rounded-3xl p-5 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-dairy-100">
                {sw ? 'Maziwa ya Leo' : "Today's milk"}
              </span>
              <div className="p-2 bg-white/10 rounded-xl">
                <Milk className="w-5 h-5 text-dairy-200" />
              </div>
            </div>
            <div className="text-3xl font-extrabold mt-3">
              {today.litres.toFixed(1)} <span className="text-base font-normal text-dairy-200">{t.common.litres}</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-dairy-700/60 flex items-center justify-between text-sm text-dairy-100">
            {today.dayTotal !== null ? (
              <span>{sw ? 'Jumla ya siku nzima' : 'Recorded as a day total'}</span>
            ) : today.countedIds.length === 0 ? (
              <span>{sw ? 'Bado haijarekodiwa' : 'Nothing recorded yet'}</span>
            ) : (
              <>
                <span>AM: {today.am !== null ? `${today.am.toFixed(1)} L` : '—'}</span>
                <span>PM: {today.pm !== null ? `${today.pm.toFixed(1)} L` : '—'}</span>
              </>
            )}
          </div>
        </div>

        {/* 7-Day Average */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">
                {sw ? 'Wastani wa siku 7' : '7-day daily average'}
              </span>
              <div className="p-2 bg-[#A8BFA5]/20 rounded-xl text-[#345C4A]">
                {trend.changePercent !== null && trend.changePercent < 0 ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
              </div>
            </div>
            <div className="text-3xl font-extrabold text-gray-900 mt-3">
              {trend.average !== null ? trend.average.toFixed(1) : '—'}{' '}
              <span className="text-base font-normal text-gray-500">{t.common.litres}</span>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            {trend.average === null
              ? (sw ? 'Hakuna rekodi katika siku 7 zilizopita' : 'No milk recorded in the last 7 days')
              : trend.changePercent === null
              ? (sw ? `Kutoka siku ${trend.recordedDays} zilizorekodiwa kati ya 7` : `From ${trend.recordedDays} of 7 days recorded`)
              : sw
              ? `${trend.changePercent >= 0 ? 'Juu' : 'Chini'} kwa ${Math.abs(trend.changePercent)}% kuliko wiki iliyopita (siku ${trend.recordedDays}/7)`
              : `${trend.changePercent >= 0 ? 'Up' : 'Down'} ${Math.abs(trend.changePercent)}% vs the previous 7 days (${trend.recordedDays}/7 days recorded)`}
          </p>
        </div>

        {/* Top Producer Highlight */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">
              {sw ? 'Kinara wa Maziwa' : 'Top producer'}
            </span>
            <div className="p-2 bg-[#FAF5EB] rounded-xl text-[#C6A76A] border border-[#E5D5B5]">
              <Award className="w-5 h-5" />
            </div>
          </div>
          {topCows.length > 0 ? (
            <div className="mt-3 flex items-center space-x-3">
              {topCowPhoto ? (
                <img src={topCowPhoto} alt={topCows[0].cowTag} className="w-12 h-12 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-[#FAF5EB] text-[#26332D] border border-[#E5D5B5] font-bold flex items-center justify-center shrink-0">
                  {topCows[0].cowTag.slice(-2)}
                </div>
              )}
              <div>
                <div className="text-base font-bold text-gray-900">{topCows[0].cowName || topCows[0].cowTag}</div>
                <div className="text-sm font-medium text-[#8a6f37]">
                  {topCows[0].averagePerDay?.toFixed(1)} L {sw ? 'kwa siku' : 'per recorded day'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 mt-3">
              {sw ? 'Rekodi maziwa kwa ng\'ombe ili kuona kinara' : 'Record milk by cow to rank producers'}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            {sw ? 'Kutoka rekodi za ng\'ombe zinazohesabiwa tu' : 'From counted cow-level records only'}
          </p>
        </div>
      </div>

      {/* History Log Section */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {sw ? 'Kumbukumbu za Maziwa' : 'Milk records'}
            </h2>
            <p className="text-sm text-gray-600">
              {entries.length - voidedCount} {sw ? 'rekodi' : 'records'}
              {voidedCount > 0 && (
                <>
                  {' · '}
                  <button type="button" onClick={() => setShowVoided(!showVoided)} className="underline font-medium text-dairy-700">
                    {showVoided
                      ? (sw ? 'Ficha zilizobatilishwa' : 'Hide voided')
                      : (sw ? `Onyesha ${voidedCount} zilizobatilishwa` : `Show ${voidedCount} voided`)}
                  </button>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center space-x-1.5 bg-gray-100 p-1 rounded-xl" role="group" aria-label={sw ? 'Chuja kwa zamu' : 'Filter by session'}>
            {(['all', 'AM', 'PM', 'total'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterSession(s)}
                aria-pressed={filterSession === s}
                className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-all ${
                  filterSession === s ? 'bg-white text-dairy-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {s === 'all' ? (sw ? 'Zote' : 'All') : s === 'total' ? (sw ? 'Siku' : 'Day') : s}
              </button>
            ))}
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-600">
            {sw ? 'Hakuna kumbukumbu za maziwa zilizopatikana.' : 'No milk records yet. Tap "Record Milk" to add today\'s milk.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredEntries.map((entry) => {
              const isCounted = counted.has(entry.id);
              const voided = Boolean(entry.voidedAt);
              return (
                <div
                  key={entry.id}
                  className={`p-4 sm:p-5 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${voided ? 'bg-gray-50 opacity-70' : 'hover:bg-gray-50/70'}`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-sm text-gray-900 ${voided ? 'line-through' : ''}`}>
                        {formatFarmDate(entry.date, lang)}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-gray-100 text-gray-700">
                        {sessionText(entry.session)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                        entry.mode === 'cow_level' ? 'bg-[#A8BFA5]/25 text-[#345C4A]' : 'bg-[#FAF9F5] text-[#26332D] border border-gray-200'
                      }`}>
                        {entry.mode === 'cow_level' ? (sw ? 'Kwa Ng\'ombe' : 'By cow') : (sw ? 'Jumla ya Shamba' : 'Farm total')}
                      </span>
                      {voided ? (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-gray-200 text-gray-700">{sw ? 'Imebatilishwa' : 'Voided'}</span>
                      ) : !isCounted ? (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-900">{sw ? 'Haihesabiwi — kagua' : 'Not counted — review'}</span>
                      ) : null}
                    </div>

                    {voided && entry.voidReason && (
                      <p className="text-sm text-gray-600">{sw ? 'Sababu' : 'Reason'}: {entry.voidReason}</p>
                    )}

                    {entry.notes && <p className="text-sm text-gray-600 italic">&quot;{entry.notes}&quot;</p>}

                    {entry.cowBreakdown && entry.cowBreakdown.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {entry.cowBreakdown.map((cb) => (
                          <span key={cb.cowId} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                            {cb.cowName || cb.cowTag}: <strong>{cb.litres} L</strong>
                          </span>
                        ))}
                      </div>
                    )}

                    {entry.allocation && (
                      <div className="flex items-center gap-3 text-xs text-gray-600 pt-1 flex-wrap">
                        {entry.allocation.soldLitres > 0 && <span>{sw ? 'Imeuzwa' : 'Sold'}: <strong>{entry.allocation.soldLitres} L</strong></span>}
                        {entry.allocation.householdLitres > 0 && <span>{sw ? 'Nyumbani' : 'Home'}: <strong>{entry.allocation.householdLitres} L</strong></span>}
                        {entry.allocation.calvesLitres > 0 && <span>{sw ? 'Ndama' : 'Calves'}: <strong>{entry.allocation.calvesLitres} L</strong></span>}
                        {entry.allocation.wasteLitres > 0 && <span>{sw ? 'Hasara' : 'Lost'}: <strong>{entry.allocation.wasteLitres} L</strong></span>}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-4">
                    <div className="text-right">
                      <span className={`text-xl font-extrabold ${voided ? 'text-gray-500 line-through' : 'text-dairy-800'}`}>
                        {entry.totalLitres.toFixed(1)}
                      </span>
                      <span className="text-sm text-gray-500 ml-1">L</span>
                    </div>

                    {!voided && (
                      <button
                        onClick={() => handleVoid(entry)}
                        className="flex items-center gap-1 px-2.5 py-2 text-sm font-semibold text-gray-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        aria-label={sw ? `Batilisha rekodi ya lita ${entry.totalLitres}` : `Void ${entry.totalLitres} L record for ${entry.date}`}
                      >
                        <Ban className="w-4 h-4" />
                        <span>{sw ? 'Batilisha' : 'Void'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
