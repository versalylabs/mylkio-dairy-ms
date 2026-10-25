'use client';

import React, { useState } from 'react';
import { Cow, BreedingEvent, BreedingEventType, Language } from '@/types';
import { translations } from '@/lib/translations';
import { X, Check, Dna, Calendar, AlertCircle } from 'lucide-react';

interface BreedingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Omit<BreedingEvent, 'id' | 'createdAt' | 'farmId'>) => void;
  cows: Cow[];
  lang: Language;
}

export const BreedingModal: React.FC<BreedingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  cows,
  lang,
}) => {
  const t = translations[lang];
  const todayStr = new Date().toISOString().split('T')[0];

  const femaleCows = cows.filter((c) => c.sex !== 'male');

  const [cowId, setCowId] = useState(femaleCows[0]?.id || '');
  const [date, setDate] = useState(todayStr);
  const [type, setType] = useState<BreedingEventType>('insemination');
  const [sireOrProvider, setSireOrProvider] = useState('');
  const [pregnancyResult, setPregnancyResult] = useState<'positive' | 'negative' | 'pending'>('pending');
  const [expectedCalvingDate, setExpectedCalvingDate] = useState('');
  const [calvingOutcome, setCalvingOutcome] = useState<'heifer_calf' | 'bull_calf' | 'twins' | 'stillborn' | 'aborted'>('heifer_calf');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const selectedCow = femaleCows.find((c) => c.id === cowId) || femaleCows[0];

  if (!isOpen) return null;

  // Auto-calculate expected calving date (~283 days average gestation) if insemination
  const calculateCalvingDate = (insemDate: string) => {
    if (!insemDate) return '';
    const d = new Date(insemDate);
    d.setDate(d.getDate() + 283);
    return d.toISOString().split('T')[0];
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    if (type === 'insemination' && !expectedCalvingDate) {
      setExpectedCalvingDate(calculateCalvingDate(newDate));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCow) {
      setError(lang === 'sw' ? 'Tafadhali chagua ng\'ombe' : 'Please select a cow');
      return;
    }

    onSave({
      cowId: selectedCow.id,
      cowTag: selectedCow.tag,
      cowName: selectedCow.name,
      date,
      type,
      sireOrProvider: sireOrProvider.trim() || undefined,
      pregnancyResult: type === 'pregnancy_check' || type === 'insemination' ? pregnancyResult : undefined,
      expectedCalvingDate: expectedCalvingDate || undefined,
      calvingOutcome: type === 'calving' ? calvingOutcome : undefined,
      notes: notes.trim() || undefined,
    });

    // Reset
    setSireOrProvider('');
    setExpectedCalvingDate('');
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
            <div className="w-10 h-10 rounded-2xl bg-[#FAF5EB] text-[#C6A76A] border border-[#E5D5B5] flex items-center justify-center">
              <Dna className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {lang === 'sw' ? 'Rekodi Uzazi na Upandishaji' : 'Log Breeding & Calving'}
              </h2>
              <p className="text-xs text-gray-500">
                {lang === 'sw' ? 'Mbegu (AI), vipimo vya mimba na kuzaa' : 'Artificial insemination, pregnancy checks & calving'}
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
            <div className="p-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl">
              {error}
            </div>
          )}

          {/* Select Cow */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              {lang === 'sw' ? 'Chagua Ng\'ombe (Jike) *' : 'Select Female Animal *'}
            </label>
            <select
              value={cowId}
              onChange={(e) => setCowId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm font-semibold bg-white"
              required
            >
              {femaleCows.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.tag} — {c.name || 'Unnamed'} ({c.breed} • Parity: {c.parity})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {lang === 'sw' ? 'Tarehe' : 'Date of Event'}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-xs font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {lang === 'sw' ? 'Tukio la Uzazi' : 'Breeding Event'}
              </label>
              <select
                value={type}
                onChange={(e) => {
                  const val = e.target.value as BreedingEventType;
                  setType(val);
                  if (val === 'insemination') {
                    setExpectedCalvingDate(calculateCalvingDate(date));
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-xs font-medium bg-white"
              >
                <option value="insemination">{lang === 'sw' ? 'Kupandisha (AI / Bull)' : 'Insemination (AI / Bull)'}</option>
                <option value="pregnancy_check">{lang === 'sw' ? 'Kipimo cha Mimba' : 'Pregnancy Check'}</option>
                <option value="calving">{lang === 'sw' ? 'Kuzaa (Calving Outcome)' : 'Calving Outcome'}</option>
                <option value="heat_observation">{lang === 'sw' ? 'Kuingia Joto (Heat)' : 'Heat Observation'}</option>
                <option value="dry_off">{lang === 'sw' ? 'Kukausha Maziwa (Dry Off)' : 'Dry Off Preparation'}</option>
              </select>
            </div>
          </div>

          {(type === 'insemination' || type === 'heat_observation') && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {lang === 'sw' ? 'Dume / Mhudumu wa AI' : 'Sire Breed / AI Provider / Technician'}
              </label>
              <input
                type="text"
                value={sireOrProvider}
                onChange={(e) => setSireOrProvider(e.target.value)}
                placeholder="e.g. KAGRC Friesian #84, ABS Sexed Semen, Vet technician James"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm font-medium"
              />
            </div>
          )}

          {type === 'pregnancy_check' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                  {lang === 'sw' ? 'Matokeo ya Kipimo' : 'Pregnancy Result'}
                </label>
                <select
                  value={pregnancyResult}
                  onChange={(e) => setPregnancyResult(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-xs font-bold bg-white"
                >
                  <option value="positive">{lang === 'sw' ? 'Mimba Imedhibitishwa (+)' : 'Confirmed Pregnant (+)'}</option>
                  <option value="negative">{lang === 'sw' ? 'Hana Mimba (-)' : 'Not Pregnant (-)'}</option>
                  <option value="pending">{lang === 'sw' ? 'Haijadhibitishwa (Pending)' : 'Pending / Retest'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                  {lang === 'sw' ? 'Tarehe Inayotarajiwa Kuzaa' : 'Expected Due Date'}
                </label>
                <input
                  type="date"
                  value={expectedCalvingDate}
                  onChange={(e) => setExpectedCalvingDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-xs font-medium"
                />
              </div>
            </div>
          )}

          {type === 'insemination' && (
            <div className="p-3.5 bg-[#FAF5EB] border border-[#E5D5B5] rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#26332D] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#C6A76A]" />
                  <span>{lang === 'sw' ? 'Makadirio ya Tarehe ya Kuzaa (~Siku 283)' : 'Projected Calving Date (~283 days gestation)'}</span>
                </span>
              </div>
              <input
                type="date"
                value={expectedCalvingDate}
                onChange={(e) => setExpectedCalvingDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5D5B5] bg-white text-xs font-bold text-[#26332D] focus:ring-2 focus:ring-[#345C4A]"
              />
              <p className="text-[11px] text-[#5D7368]">
                Calculated automatically based on standard bovine gestation. Editable as vet confirms.
              </p>
            </div>
          )}

          {type === 'calving' && (
            <div className="p-3.5 bg-[#FAF9F5] border border-gray-200 rounded-2xl space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#26332D]">
                {lang === 'sw' ? 'Matokeo ya Kuzaa (Outcome)' : 'Calving Outcome'}
              </label>
              <select
                value={calvingOutcome}
                onChange={(e) => setCalvingOutcome(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-[#26332D] focus:ring-2 focus:ring-[#345C4A]"
              >
                <option value="heifer_calf">{lang === 'sw' ? 'Ndama Jike (Heifer Calf)' : 'Single Heifer Calf (Female)'}</option>
                <option value="bull_calf">{lang === 'sw' ? 'Ndama Dume (Bull Calf)' : 'Single Bull Calf (Male)'}</option>
                <option value="twins">{lang === 'sw' ? 'Mapacha (Twins)' : 'Twins'}</option>
                <option value="stillborn">{lang === 'sw' ? 'Amezaliwa Akiwa Amekufa (Stillborn)' : 'Stillborn'}</option>
                <option value="aborted">{lang === 'sw' ? 'Mimba Imeharibika (Aborted)' : 'Aborted'}</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              {lang === 'sw' ? 'Maelezo ya Ziada' : 'Breeding Notes'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Good standing heat, inseminated 12 hours after detection"
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
              <span>{lang === 'sw' ? 'Hifadhi Kumbukumbu' : 'Save Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
