'use client';

import React, { useState } from 'react';
import { Cow, HealthEvent, HealthEventType, Language } from '@/types';
import { translations } from '@/lib/translations';
import { X, Check, Stethoscope, AlertTriangle, ShieldAlert } from 'lucide-react';

interface HealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Omit<HealthEvent, 'id' | 'createdAt' | 'farmId'>) => void;
  cows: Cow[];
  lang: Language;
}

export const HealthModal: React.FC<HealthModalProps> = ({
  isOpen,
  onClose,
  onSave,
  cows,
  lang,
}) => {
  const t = translations[lang];
  const todayStr = new Date().toISOString().split('T')[0];

  const [cowId, setCowId] = useState(cows[0]?.id || '');
  const [date, setDate] = useState(todayStr);
  const [type, setType] = useState<HealthEventType>('treatment');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicineName, setMedicineName] = useState('');
  const [administeredBy, setAdministeredBy] = useState('');
  const [costKSh, setCostKSh] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [hasWithdrawal, setHasWithdrawal] = useState(false);
  const [withdrawalDays, setWithdrawalDays] = useState('3');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const selectedCow = cows.find((c) => c.id === cowId) || cows[0];

  if (!isOpen) return null;

  // Calculate withdrawal end date
  let computedWithdrawalEndDate = '';
  if (hasWithdrawal && parseInt(withdrawalDays) > 0) {
    const d = new Date(date);
    d.setDate(d.getDate() + parseInt(withdrawalDays));
    computedWithdrawalEndDate = d.toISOString().split('T')[0];
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCow) {
      setError(lang === 'sw' ? 'Tafadhali chagua ng\'ombe' : 'Please select a cow');
      return;
    }
    if (!medicineName.trim() && !diagnosis.trim()) {
      setError(lang === 'sw' ? 'Weka dawa au uchunguzi wa ugonjwa' : 'Please provide medication name or diagnosis');
      return;
    }

    onSave({
      cowId: selectedCow.id,
      cowTag: selectedCow.tag,
      cowName: selectedCow.name,
      date,
      type,
      diagnosis: diagnosis.trim() || undefined,
      medicineName: medicineName.trim() || undefined,
      administeredBy: administeredBy.trim() || undefined,
      costKSh: parseFloat(costKSh) || undefined,
      nextDueDate: nextDueDate || undefined,
      withdrawalDays: hasWithdrawal ? parseInt(withdrawalDays) : undefined,
      withdrawalEndDate: hasWithdrawal ? computedWithdrawalEndDate : undefined,
      isWithdrawalActive: hasWithdrawal,
      notes: notes.trim() || undefined,
    });

    // Reset
    setDiagnosis('');
    setMedicineName('');
    setAdministeredBy('');
    setCostKSh('');
    setNextDueDate('');
    setHasWithdrawal(false);
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
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {lang === 'sw' ? 'Rekodi Afya na Chanjo' : 'Log Health & Medication'}
              </h2>
              <p className="text-xs text-gray-500">
                {lang === 'sw' ? 'Matibabu, chanjo na muda wa kizuizi cha maziwa' : 'Veterinary treatment, vaccination & milk withdrawal'}
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
              {lang === 'sw' ? 'Chagua Ng\'ombe *' : 'Select Animal *'}
            </label>
            <select
              value={cowId}
              onChange={(e) => setCowId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm font-semibold bg-white"
              required
            >
              {cows.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.tag} — {c.name || 'Unnamed'} ({c.breed} • {c.status})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {lang === 'sw' ? 'Tarehe' : 'Date Administered'}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-xs font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {lang === 'sw' ? 'Aina ya Tukio' : 'Event Type'}
              </label>
              <select
                value={type}
                onChange={(e) => {
                  const val = e.target.value as HealthEventType;
                  setType(val);
                  if (val === 'vaccination' && !medicineName) {
                    setMedicineName('FMD Vaccine');
                  } else if (val === 'deworming' && !medicineName) {
                    setMedicineName('Albendazole 10%');
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-xs font-medium bg-white"
              >
                <option value="treatment">{lang === 'sw' ? 'Matibabu (Treatment)' : 'Treatment / Illness'}</option>
                <option value="vaccination">{lang === 'sw' ? 'Chanjo (Vaccination)' : 'Vaccination'}</option>
                <option value="deworming">{lang === 'sw' ? 'Dawa ya Minyoo' : 'Deworming'}</option>
                <option value="routine_check">{lang === 'sw' ? 'Ukaguzi wa Daktari' : 'Routine Vet Check'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              {lang === 'sw' ? 'Jina la Dawa au Chanjo *' : 'Medicine / Vaccine Name *'}
            </label>
            <input
              type="text"
              value={medicineName}
              onChange={(e) => setMedicineName(e.target.value)}
              placeholder="e.g. PenStrep, Mastritech, FMD Vaccine, Albendazole"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {lang === 'sw' ? 'Uchunguzi / Dalili' : 'Diagnosis / Symptoms'}
              </label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Mastitis, Tick fever, Loss of appetite"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {lang === 'sw' ? 'Mhudumu / Daktari' : 'Administered By'}
              </label>
              <input
                type="text"
                value={administeredBy}
                onChange={(e) => setAdministeredBy(e.target.value)}
                placeholder="e.g. Dr. Otieno, County Vet"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-xs font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {lang === 'sw' ? 'Gharama (KSh)' : 'Cost (KSh)'}
              </label>
              <input
                type="number"
                value={costKSh}
                onChange={(e) => setCostKSh(e.target.value)}
                placeholder="e.g. 1500"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {lang === 'sw' ? 'Tarehe ya Marudio (Next Due)' : 'Next Due Date (Booster)'}
              </label>
              <input
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-xs font-medium"
              />
            </div>
          </div>

          {/* Milk Withdrawal Period (Consequential MVP Safety Guardrail) */}
          <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-3">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hasWithdrawal}
                onChange={(e) => setHasWithdrawal(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500"
              />
              <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>{lang === 'sw' ? 'Dawa hii inahitaji Kizuizi cha Maziwa (Withdrawal Period)?' : 'Active Milk Withdrawal Period (Antibiotics / Toxins)?'}</span>
              </span>
            </label>

            {hasWithdrawal && (
              <div className="space-y-2 pt-1 border-t border-rose-200/60">
                <div className="flex items-center gap-3">
                  <div className="w-32">
                    <label className="block text-[11px] font-semibold text-rose-800 mb-1">
                      {lang === 'sw' ? 'Idadi ya Siku' : 'Withdrawal Days'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={withdrawalDays}
                      onChange={(e) => setWithdrawalDays(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-rose-300 focus:ring-2 focus:ring-rose-500 text-xs font-bold bg-white"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-rose-800 mb-1">
                      {lang === 'sw' ? 'Maziwa Salama Tarehe' : 'Safe to Sell After'}
                    </label>
                    <div className="px-3 py-1.5 rounded-lg border border-rose-300 bg-white text-xs font-extrabold text-rose-700">
                      {computedWithdrawalEndDate || 'Calculate...'}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-rose-700 italic">
                  Warning: Milk from this animal must not be sold to cooperatives or customers during this window.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              {lang === 'sw' ? 'Maelezo ya Ziada' : 'Notes'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Prescribed by Dr. Otieno, 3-day intramuscular course"
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
              <span>{lang === 'sw' ? 'Hifadhi Tukio la Afya' : 'Save Health Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
