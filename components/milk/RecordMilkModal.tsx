'use client';

import React, { useState } from 'react';
import { Cow, MilkEntry, MilkAllocation, Language } from '@/types';
import { translations } from '@/lib/translations';
import { X, Check, Milk, Sparkles, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface RecordMilkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<MilkEntry, 'id' | 'createdAt' | 'farmId' | 'synced'>) => void;
  cows: Cow[];
  lang: Language;
}

export const RecordMilkModal: React.FC<RecordMilkModalProps> = ({
  isOpen,
  onClose,
  onSave,
  cows,
  lang,
}) => {
  const t = translations[lang];
  const todayStr = new Date().toISOString().split('T')[0];

  const lactatingCows = cows.filter(
    (c) => c.status === 'lactating' || c.status === 'pregnant_heifer'
  );

  const [date, setDate] = useState(todayStr);
  const [session, setSession] = useState<'AM' | 'PM' | 'total'>('AM');
  const [mode, setMode] = useState<'farm_total' | 'cow_level'>('farm_total');
  const [totalLitres, setTotalLitres] = useState<string>('');
  const [cowYields, setCowYields] = useState<Record<string, string>>({});

  // Optional allocations
  const [showAllocations, setShowAllocations] = useState(false);
  const [soldLitres, setSoldLitres] = useState('');
  const [householdLitres, setHouseholdLitres] = useState('');
  const [calvesLitres, setCalvesLitres] = useState('');
  const [wasteLitres, setWasteLitres] = useState('');

  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Calculate live sum if cow_level
  const calculatedCowTotal = Object.values(cowYields).reduce(
    (acc, val) => acc + (parseFloat(val) || 0),
    0
  );

  const activeTotalLitres =
    mode === 'cow_level'
      ? calculatedCowTotal
      : parseFloat(totalLitres) || 0;

  const handleCowYieldChange = (cowId: string, val: string) => {
    setCowYields((prev) => ({
      ...prev,
      [cowId]: val,
    }));
  };

  const handleQuickAdd = (amount: number) => {
    const current = parseFloat(totalLitres) || 0;
    setTotalLitres((current + amount).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTotalLitres <= 0) {
      setError(
        lang === 'sw'
          ? 'Tafadhali weka kiasi cha maziwa (lita lazima zizidi 0)'
          : 'Please enter milk volume (must be greater than 0 litres)'
      );
      return;
    }

    const cowBreakdown =
      mode === 'cow_level'
        ? lactatingCows
            .filter((c) => parseFloat(cowYields[c.id]) > 0)
            .map((c) => ({
              cowId: c.id,
              cowTag: c.tag,
              cowName: c.name,
              litres: parseFloat(cowYields[c.id]) || 0,
            }))
        : undefined;

    let allocation: MilkAllocation | undefined = undefined;
    if (showAllocations) {
      allocation = {
        soldLitres: parseFloat(soldLitres) || 0,
        householdLitres: parseFloat(householdLitres) || 0,
        calvesLitres: parseFloat(calvesLitres) || 0,
        wasteLitres: parseFloat(wasteLitres) || 0,
      };
    }

    onSave({
      date,
      session,
      mode,
      totalLitres: parseFloat(activeTotalLitres.toFixed(1)),
      cowBreakdown,
      allocation,
      notes: notes.trim() || undefined,
    });

    // Reset form
    setTotalLitres('');
    setCowYields({});
    setSoldLitres('');
    setHouseholdLitres('');
    setCalvesLitres('');
    setWasteLitres('');
    setNotes('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-dairy-100 text-dairy-800 flex items-center justify-center">
              <Milk className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {lang === 'sw' ? 'Rekodi Maziwa' : 'Record Milk Yield'}
              </h2>
              <p className="text-xs text-gray-500">
                {lang === 'sw' ? 'Ingiza haraka chini ya sekunde 30' : 'Fast daily logging (under 30s target)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Date & Session Selector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {lang === 'sw' ? 'Tarehe' : 'Date'}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {lang === 'sw' ? 'Zamu (Session)' : 'Milking Session'}
              </label>
              <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl">
                {(['AM', 'PM', 'total'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSession(s)}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      session === s
                        ? 'bg-white text-dairy-800 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {s === 'total' ? (lang === 'sw' ? 'Siku' : 'Day') : s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mode Switch: Farm Total vs By Cow */}
          <div className="p-1 bg-gray-100 rounded-2xl flex items-center">
            <button
              type="button"
              onClick={() => setMode('farm_total')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'farm_total'
                  ? 'bg-dairy-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {lang === 'sw' ? 'Jumla ya Shamba (Total)' : 'Log Total Farm Milk'}
            </button>
            <button
              type="button"
              onClick={() => setMode('cow_level')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'cow_level'
                  ? 'bg-dairy-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {lang === 'sw' ? 'Kwa Kila Ng\'ombe (By Cow)' : 'Log By Individual Cow'}
            </button>
          </div>

          {/* Gentle Nudge if farm has > 10 cows and using farm_total */}
          {cows.length >= 10 && mode === 'farm_total' && (
            <div className="p-2.5 bg-dairy-50 border border-dairy-200 rounded-xl flex items-center justify-between text-xs text-dairy-800">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-dairy-600 shrink-0" />
                <span>Want to see top producing cows? Start logging by cow.</span>
              </span>
              <button
                type="button"
                onClick={() => setMode('cow_level')}
                className="font-bold underline text-dairy-700 ml-2 shrink-0"
              >
                Switch
              </button>
            </div>
          )}

          {/* MODE 1: FARM TOTAL ENTRY */}
          {mode === 'farm_total' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                {lang === 'sw' ? 'Jumla ya Lita Zilizokamuliwa' : 'Total Litres Milked'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={totalLitres}
                  onChange={(e) => setTotalLitres(e.target.value)}
                  placeholder="e.g. 42.5"
                  className="w-full text-3xl font-extrabold text-slate-900 pl-4 pr-16 py-3.5 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 bg-white"
                  autoFocus
                  required
                />
                <span className="absolute right-4 top-4 text-base font-bold text-gray-400">
                  {t.common.litres}
                </span>
              </div>

              {/* Fast Presets for under 30s logging */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-medium text-gray-400">Quick add:</span>
                {[5, 10, 20, 30].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAdd(amt)}
                    className="px-2.5 py-1 text-xs font-semibold bg-white border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors shadow-2xs"
                  >
                    +{amt}L
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* MODE 2: COW LEVEL ENTRY */}
          {mode === 'cow_level' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  {lang === 'sw' ? 'Lita kwa Kila Ng\'ombe' : 'Litres Per Lactating Cow'}
                </label>
                <span className="text-xs font-bold text-dairy-700">
                  Total: {calculatedCowTotal.toFixed(1)} L
                </span>
              </div>

              {lactatingCows.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500">
                  {lang === 'sw'
                    ? 'Hakuna ng\'ombe aliyesajiliwa kama anayekamuliwa.'
                    : 'No lactating cows currently registered. Switch to total milk mode.'}
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {lactatingCows.map((cow) => (
                    <div
                      key={cow.id}
                      className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200 shadow-2xs gap-3"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        {cow.photoUrl ? (
                          <img
                            src={cow.photoUrl}
                            alt={cow.tag}
                            className="w-9 h-9 rounded-lg object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-dairy-100 text-dairy-800 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                            {cow.tag.slice(-2)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-gray-900 truncate">
                            {cow.name || cow.tag}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {cow.tag} • {cow.breed}
                          </div>
                        </div>
                      </div>

                      <div className="w-24 shrink-0 relative">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={cowYields[cow.id] || ''}
                          onChange={(e) => handleCowYieldChange(cow.id, e.target.value)}
                          placeholder="0.0"
                          className="w-full text-right font-bold text-sm px-2.5 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-dairy-500 pr-7"
                        />
                        <span className="absolute right-2 top-2 text-[10px] text-gray-400 font-bold">
                          L
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Optional Milk Allocation Accordion */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAllocations(!showAllocations)}
              className="w-full px-4 py-3 bg-gray-50/80 hover:bg-gray-100/70 flex items-center justify-between text-xs font-bold text-gray-700 transition-colors"
            >
              <span>{lang === 'sw' ? 'Gawio la Maziwa (Mauzo, Nyumbani, Ndama)' : 'Milk Usage Allocation (Optional)'}</span>
              {showAllocations ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {showAllocations && (
              <div className="p-4 space-y-3 bg-white">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      {lang === 'sw' ? 'Maziwa ya Kuuza (L)' : 'Sold to Co-op / Buyers (L)'}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={soldLitres}
                      onChange={(e) => setSoldLitres(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      {lang === 'sw' ? 'Matumizi ya Nyumbani (L)' : 'Household Use (L)'}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={householdLitres}
                      onChange={(e) => setHouseholdLitres(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      {lang === 'sw' ? 'Maziwa ya Ndama (L)' : 'Calves Fed (L)'}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={calvesLitres}
                      onChange={(e) => setCalvesLitres(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      {lang === 'sw' ? 'Iliyomwagika / Hasara (L)' : 'Spillage / Rejected (L)'}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={wasteLitres}
                      onChange={(e) => setWasteLitres(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 font-medium"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              {lang === 'sw' ? 'Maelezo ya Ziada' : 'Milking Notes'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={lang === 'sw' ? 'mfano Maziwa yalipozwa vizuri, asubuhi mapema' : 'e.g. Morning milking went smoothly, cooled to 4°C'}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-xs"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t.herd.cancel}
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-dairy-600 hover:bg-dairy-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              <Check className="w-4 h-4" />
              <span>
                {lang === 'sw'
                  ? `Hifadhi Lita ${activeTotalLitres.toFixed(1)}`
                  : `Save ${activeTotalLitres.toFixed(1)} L Milk`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
