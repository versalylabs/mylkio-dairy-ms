'use client';

import React, { useState } from 'react';
import { Cow, BreedingEvent, BreedingEventType, FarmReminder, Language } from '@/types';
import { addDays, farmToday } from '@/lib/dates';
import { translations } from '@/lib/translations';
import { autoCalfTag, describeCalving, liveCalves, planCalving, type CalfSex } from '@/lib/herd-care';
import { X, Check, Dna, Calendar, AlertCircle, Info } from 'lucide-react';

interface BreedingModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Returns false when the record was refused (for example a calf tag already in use): the form then stays open. */
  onSave: (event: Omit<BreedingEvent, 'id' | 'createdAt' | 'farmId'>) => boolean | void;
  cows: Cow[];
  /** Used to show what a calving will change before it is saved. */
  breedingEvents?: BreedingEvent[];
  reminders?: FarmReminder[];
  lang: Language;
}

export const BreedingModal: React.FC<BreedingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  cows,
  breedingEvents = [],
  reminders = [],
  lang,
}) => {
  const t = translations[lang];
  const todayStr = farmToday();

  const femaleCows = cows.filter((c) => c.sex !== 'male');

  const [cowId, setCowId] = useState(femaleCows[0]?.id || '');
  const [date, setDate] = useState(todayStr);
  const [type, setType] = useState<BreedingEventType>('insemination');
  const [sireOrProvider, setSireOrProvider] = useState('');
  const [pregnancyResult, setPregnancyResult] = useState<'positive' | 'negative' | 'pending'>('pending');
  const [expectedCalvingDate, setExpectedCalvingDate] = useState('');
  const [calvingOutcome, setCalvingOutcome] = useState<'heifer_calf' | 'bull_calf' | 'twins' | 'stillborn' | 'aborted'>('heifer_calf');
  const [calfTag, setCalfTag] = useState('');
  const [calfSex, setCalfSex] = useState<CalfSex>('female');
  const [calfTag2, setCalfTag2] = useState('');
  const [calfSex2, setCalfSex2] = useState<CalfSex>('male');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const selectedCow = femaleCows.find((c) => c.id === cowId) || femaleCows[0];

  if (!isOpen) return null;

  // What a calving would change, worked out the same way the save does it.
  const calvingEvent = {
    date,
    calvingOutcome,
    calfTag: calfTag.trim() || undefined,
    calfSex: calvingOutcome === 'twins' ? calfSex : undefined,
    calfTag2: calfTag2.trim() || undefined,
    calfSex2: calvingOutcome === 'twins' ? calfSex2 : undefined,
  };
  const calvingPlan = type === 'calving' && selectedCow ? planCalving({ cow: selectedCow, cows, event: calvingEvent, breedingEvents, reminders }) : null;
  const calvingLines = calvingPlan && selectedCow ? describeCalving(selectedCow, calvingPlan, calvingOutcome) : [];
  const nextTag = selectedCow ? autoCalfTag(selectedCow.tag, cows.map((c) => c.tag)) : '';

  // Auto-calculate expected calving date (~283 days average gestation) if insemination
  const calculateCalvingDate = (insemDate: string) => {
    if (!insemDate) return '';
    return addDays(insemDate, 283);
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

    if (calvingPlan?.problems.length) {
      setError(calvingPlan.problems[0]);
      return;
    }

    const saved = onSave({
      cowId: selectedCow.id,
      cowTag: selectedCow.tag,
      cowName: selectedCow.name,
      date,
      type,
      sireOrProvider: sireOrProvider.trim() || undefined,
      pregnancyResult: type === 'pregnancy_check' || type === 'insemination' ? pregnancyResult : undefined,
      expectedCalvingDate: expectedCalvingDate || undefined,
      calvingOutcome: type === 'calving' ? calvingOutcome : undefined,
      ...(type === 'calving' && liveCalves(calvingOutcome) > 0 ? calvingEvent : {}),
      notes: notes.trim() || undefined,
    });
    if (saved === false) return; // refused: keep the form open so nothing typed is lost

    // Reset
    setSireOrProvider('');
    setExpectedCalvingDate('');
    setCalfTag('');
    setCalfTag2('');
    setNotes('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/60 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4">
      <div className="flex max-h-[94dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-3xl border border-ivory-border bg-white shadow-2xl sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FCF6DC] text-[#8A6A10] border border-[#EED98E] flex items-center justify-center">
              <Dna className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-charcoal">
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
            <label className="field-label">
              {lang === 'sw' ? 'Chagua Ng\'ombe (Jike) *' : 'Select Female Animal *'}
            </label>
            <select
              value={cowId}
              onChange={(e) => setCowId(e.target.value)}
              className="field"
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
              <label className="field-label">
                {lang === 'sw' ? 'Tarehe' : 'Date of Event'}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="field"
                required
              />
            </div>

            <div>
              <label className="field-label">
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
                className="field"
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
              <label className="field-label">
                {lang === 'sw' ? 'Dume / Mhudumu wa AI' : 'Sire Breed / AI Provider / Technician'}
              </label>
              <input
                type="text"
                value={sireOrProvider}
                onChange={(e) => setSireOrProvider(e.target.value)}
                placeholder="e.g. KAGRC Friesian #84, ABS Sexed Semen, Vet technician James"
                className="field"
              />
            </div>
          )}

          {type === 'pregnancy_check' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">
                  {lang === 'sw' ? 'Matokeo ya Kipimo' : 'Pregnancy Result'}
                </label>
                <select
                  value={pregnancyResult}
                  onChange={(e) => setPregnancyResult(e.target.value as any)}
                  className="field"
                >
                  <option value="positive">{lang === 'sw' ? 'Mimba Imedhibitishwa (+)' : 'Confirmed Pregnant (+)'}</option>
                  <option value="negative">{lang === 'sw' ? 'Hana Mimba (-)' : 'Not Pregnant (-)'}</option>
                  <option value="pending">{lang === 'sw' ? 'Haijadhibitishwa (Pending)' : 'Pending / Retest'}</option>
                </select>
              </div>

              <div>
                <label className="field-label">
                  {lang === 'sw' ? 'Tarehe Inayotarajiwa Kuzaa' : 'Expected Due Date'}
                </label>
                <input
                  type="date"
                  value={expectedCalvingDate}
                  onChange={(e) => setExpectedCalvingDate(e.target.value)}
                  className="field"
                />
              </div>
            </div>
          )}

          {type === 'insemination' && (
            <div className="p-3.5 bg-[#FCF6DC] border border-[#EED98E] rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#26332D] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#8A6A10]" />
                  <span>{lang === 'sw' ? 'Makadirio ya Tarehe ya Kuzaa (~Siku 283)' : 'Projected Calving Date (~283 days gestation)'}</span>
                </span>
              </div>
              <input
                type="date"
                value={expectedCalvingDate}
                onChange={(e) => setExpectedCalvingDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EED98E] bg-white text-xs font-bold text-[#26332D] focus:ring-2 focus:ring-[#345C4A]"
              />
              <p className="text-xs text-[#5D7368]">
                Calculated automatically based on standard bovine gestation. Editable as vet confirms.
              </p>
            </div>
          )}

          {type === 'calving' && (
            <div className="p-3.5 bg-[#F8F8F3] border border-gray-200 rounded-2xl space-y-3">
              <label className="block text-xs font-bold text-[#26332D]">
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

              {liveCalves(calvingOutcome) > 0 && (
                <div className="space-y-2.5">
                  {(calvingOutcome === 'twins' ? [1, 2] : [1]).map((n) => (
                    <div key={n} className="grid grid-cols-[1fr_auto] gap-2">
                      <div>
                        <label htmlFor={`calf-tag-${n}`} className="field-label">
                          {calvingOutcome === 'twins' ? `Calf ${n} ear tag` : 'Calf ear tag'} (optional)
                        </label>
                        <input
                          id={`calf-tag-${n}`}
                          type="text"
                          value={n === 1 ? calfTag : calfTag2}
                          onChange={(e) => (n === 1 ? setCalfTag(e.target.value) : setCalfTag2(e.target.value))}
                          placeholder={`Automatic: ${n === 1 ? nextTag : `${selectedCow?.tag ?? ''}-C${calfTag.trim() ? 1 : 2}`}`}
                          className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm"
                        />
                      </div>
                      {calvingOutcome === 'twins' && (
                        <div>
                          <label htmlFor={`calf-sex-${n}`} className="field-label">Sex</label>
                          <select
                            id={`calf-sex-${n}`}
                            value={n === 1 ? calfSex : calfSex2}
                            onChange={(e) => (n === 1 ? setCalfSex(e.target.value as CalfSex) : setCalfSex2(e.target.value as CalfSex))}
                            className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
                          >
                            <option value="female">Heifer</option>
                            <option value="male">Bull</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {calvingLines.length > 0 && (
                <div className="rounded-xl border border-[#A8BFA5]/60 bg-[#EEF4EC] p-3">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-[#2B4A3B]"><Info className="w-3.5 h-3.5" />When you save</p>
                  <ul className="mt-1.5 space-y-1 text-sm text-[#26332D]">
                    {calvingLines.map((line) => <li key={line}>• {line}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="field-label">
              {lang === 'sw' ? 'Maelezo ya Ziada' : 'Breeding Notes'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Good standing heat, inseminated 12 hours after detection"
              className="field"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              {t.herd.cancel}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
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
