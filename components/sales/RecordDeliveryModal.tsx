'use client';

import React, { useState, useEffect } from 'react';
import { Buyer, Delivery, Language } from '@/types';
import { translations } from '@/lib/translations';
import { X, Check, Truck, AlertCircle } from 'lucide-react';

interface RecordDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (delivery: Omit<Delivery, 'id' | 'createdAt' | 'farmId' | 'synced'>) => void;
  buyers: Buyer[];
  lang: Language;
}

export const RecordDeliveryModal: React.FC<RecordDeliveryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  buyers,
  lang,
}) => {
  const t = translations[lang];
  const todayStr = new Date().toISOString().split('T')[0];

  const [buyerId, setBuyerId] = useState(buyers[0]?.id || '');
  const [date, setDate] = useState(todayStr);
  const [litres, setLitres] = useState<string>('');
  const [ratePerLitre, setRatePerLitre] = useState<number>(48);
  const [rejectedLitres, setRejectedLitres] = useState<string>('0');
  const [adjustmentKSh, setAdjustmentKSh] = useState<string>('0');
  const [amountPaid, setAmountPaid] = useState<string>('0');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const selectedBuyer = buyers.find((b) => b.id === buyerId);

  useEffect(() => {
    if (selectedBuyer) {
      setRatePerLitre(selectedBuyer.ratePerLitre);
    }
  }, [selectedBuyer]);

  useEffect(() => {
    if (buyers.length > 0 && !buyerId) {
      setBuyerId(buyers[0].id);
    }
  }, [buyers, buyerId]);

  if (!isOpen) return null;

  const numLitres = parseFloat(litres) || 0;
  const numRejected = parseFloat(rejectedLitres) || 0;
  const acceptedLitres = Math.max(0, numLitres - numRejected);
  const numAdjustment = parseFloat(adjustmentKSh) || 0;
  const expectedAmount = Math.max(0, acceptedLitres * ratePerLitre + numAdjustment);
  const numPaid = parseFloat(amountPaid) || 0;
  const netBalance = expectedAmount - numPaid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuyer) {
      setError(lang === 'sw' ? 'Tafadhali chagua mnunuzi' : 'Please select a buyer');
      return;
    }
    if (numLitres <= 0) {
      setError(lang === 'sw' ? 'Weka lita zilizopelekwa' : 'Please enter delivered litres');
      return;
    }

    onSave({
      buyerId: selectedBuyer.id,
      buyerName: selectedBuyer.name,
      buyerType: selectedBuyer.type,
      date,
      litres: numLitres,
      ratePerLitre,
      rejectedLitres: numRejected,
      adjustmentKSh: numAdjustment,
      expectedAmount,
      amountPaid: numPaid,
      balance: netBalance,
      notes: notes.trim() || undefined,
    });

    // Reset
    setLitres('');
    setRejectedLitres('0');
    setAdjustmentKSh('0');
    setAmountPaid('0');
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
            <div className="w-10 h-10 rounded-2xl bg-[#A8BFA5]/20 text-[#345C4A] flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {lang === 'sw' ? 'Rekodi Utoaji wa Maziwa' : 'Record Milk Delivery'}
              </h2>
              <p className="text-xs text-gray-500">
                {lang === 'sw' ? 'Chama cha Ushirika au Wateja wa Nyumbani' : 'Cooperative delivery or customer dispatch'}
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
          {buyers.length === 0 && (
            <div className="p-3 bg-[#FAF5EB] border border-[#E5D5B5] text-[#26332D] rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#C6A76A] shrink-0" />
              <span>{lang === 'sw' ? 'Hakuna mnunuzi aliyesajiliwa bado. Tafadhali ongeza mnunuzi kwanza.' : 'No buyers or cooperatives registered yet. Please add a buyer in the Sales tab first.'}</span>
            </div>
          )}

          {error && (
            <div className="p-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Select Buyer */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              {lang === 'sw' ? 'Mnunuzi / Ushirika *' : 'Buyer / Cooperative *'}
            </label>
            <select
              value={buyerId}
              onChange={(e) => setBuyerId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm font-semibold bg-white"
              required
            >
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.type === 'cooperative' ? 'Co-op' : 'Household'} • KSh {b.ratePerLitre}/L)
                </option>
              ))}
            </select>
          </div>

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
                {lang === 'sw' ? 'Bei kwa Lita (KSh)' : 'Rate / Litre (KSh)'}
              </label>
              <input
                type="number"
                step="0.5"
                value={ratePerLitre}
                onChange={(e) => setRatePerLitre(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm font-semibold"
                required
              />
            </div>
          </div>

          {/* Litres Delivered */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              {lang === 'sw' ? 'Lita Zilizopelekwa *' : 'Litres Delivered *'}
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0.1"
                value={litres}
                onChange={(e) => setLitres(e.target.value)}
                placeholder="e.g. 45"
                className="w-full text-3xl font-extrabold text-slate-900 pl-4 pr-16 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 bg-white"
                autoFocus
                required
              />
              <span className="absolute right-4 top-3.5 text-base font-bold text-gray-400">
                L
              </span>
            </div>

            {/* Deductions / Rejection if cooperative */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  {lang === 'sw' ? 'Lita Zilizokataliwa (L)' : 'Rejected Litres (L)'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={rejectedLitres}
                  onChange={(e) => setRejectedLitres(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  {lang === 'sw' ? 'Marekebisho (KSh transport/feed)' : 'Deductions (KSh -transport)'}
                </label>
                <input
                  type="number"
                  step="10"
                  value={adjustmentKSh}
                  onChange={(e) => setAdjustmentKSh(e.target.value)}
                  placeholder="-100"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Real-time Calculation Summary */}
          <div className="p-3.5 bg-[#FAF9F5] border border-[#E8E4D8] rounded-2xl space-y-2 text-xs">
            <div className="flex items-center justify-between text-[#26332D] font-medium">
              <span>Accepted Litres:</span>
              <span className="font-bold">{acceptedLitres.toFixed(1)} L</span>
            </div>
            <div className="flex items-center justify-between text-[#26332D] font-semibold text-sm pt-1 border-t border-[#E8E4D8]">
              <span>{lang === 'sw' ? 'Kiasi Kinachotarajiwa:' : 'Expected Amount:'}</span>
              <span className="font-black text-[#345C4A]">KSh {expectedAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment received on delivery */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {lang === 'sw' ? 'Imelipwa Papo Hapo (KSh)' : 'Amount Paid Today (KSh)'}
              </label>
              <input
                type="number"
                min="0"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {lang === 'sw' ? 'Baki (Deni)' : 'Balance Due'}
              </label>
              <div className="px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-extrabold text-[#b39252]">
                KSh {netBalance.toLocaleString()}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              {lang === 'sw' ? 'Maelezo' : 'Notes (Cans, clerk name)'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Rongai depot batch 1, aluminium cans"
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
              <span>{lang === 'sw' ? 'Hifadhi Utoaji' : 'Save Delivery'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
