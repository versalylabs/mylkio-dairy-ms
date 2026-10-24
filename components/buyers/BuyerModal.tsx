'use client';

import React, { useState, useEffect } from 'react';
import { Buyer, BuyerType, Language } from '@/types';
import { translations } from '@/lib/translations';
import { X, Check } from 'lucide-react';

interface BuyerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (buyer: Omit<Buyer, 'id' | 'createdAt' | 'farmId'>) => void;
  buyerToEdit?: Buyer | null;
  lang: Language;
}

export const BuyerModal: React.FC<BuyerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  buyerToEdit,
  lang,
}) => {
  const t = translations[lang];

  const [name, setName] = useState('');
  const [type, setType] = useState<BuyerType>('cooperative');
  const [phone, setPhone] = useState('');
  const [ratePerLitre, setRatePerLitre] = useState<number>(48);
  const [deliverySchedule, setDeliverySchedule] = useState<'daily' | 'twice_daily' | 'on_demand'>('daily');
  const [paymentCycle, setPaymentCycle] = useState<'monthly' | 'weekly' | 'daily' | 'advance'>('monthly');
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (buyerToEdit) {
      setName(buyerToEdit.name);
      setType(buyerToEdit.type);
      setPhone(buyerToEdit.phone || '');
      setRatePerLitre(buyerToEdit.ratePerLitre);
      setDeliverySchedule(buyerToEdit.deliverySchedule || 'daily');
      setPaymentCycle(buyerToEdit.paymentCycle || 'monthly');
      setCurrentBalance(buyerToEdit.currentBalance || 0);
      setNotes(buyerToEdit.notes || '');
    } else {
      setName('');
      setType('cooperative');
      setPhone('');
      setRatePerLitre(48);
      setDeliverySchedule('daily');
      setPaymentCycle('monthly');
      setCurrentBalance(0);
      setNotes('');
    }
    setError('');
  }, [buyerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(lang === 'sw' ? 'Tafadhali weka jina la mnunuzi' : 'Please enter buyer or cooperative name');
      return;
    }
    if (ratePerLitre <= 0) {
      setError(lang === 'sw' ? 'Bei kwa lita lazima izidi sifuri' : 'Price per litre must be greater than zero');
      return;
    }

    onSave({
      name: name.trim(),
      type,
      phone: phone.trim() || undefined,
      ratePerLitre: Number(ratePerLitre),
      deliverySchedule,
      paymentCycle,
      currentBalance: Number(currentBalance) || 0,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {buyerToEdit ? (lang === 'sw' ? 'Badilisha Mnunuzi' : 'Edit Buyer Details') : t.buyerModal.titleNew}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {lang === 'sw' ? 'Weka taarifa za bei na malipo ya maziwa' : 'Configure pricing and payment settlement rules'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              {t.buyerModal.nameLabel}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'cooperative' ? 'e.g. Baraka Dairy Cooperative' : 'e.g. Mama Wanjiku'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 focus:border-dairy-500 text-sm font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {t.buyerModal.typeLabel}
              </label>
              <select
                value={type}
                onChange={(e) => {
                  const val = e.target.value as BuyerType;
                  setType(val);
                  if (val === 'household' && ratePerLitre === 48) {
                    setRatePerLitre(60); // typical retail price in Kenya
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm bg-white font-medium"
              >
                <option value="cooperative">{lang === 'sw' ? 'Chama cha Ushirika (Co-op)' : 'Dairy Cooperative'}</option>
                <option value="household">{lang === 'sw' ? 'Mteja wa Nyumbani' : 'Household / Direct Customer'}</option>
                <option value="trader">{lang === 'sw' ? 'Hoteli / Mfanyabiashara' : 'Hotel / Trader / Café'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {t.buyerModal.rateLabel}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-gray-400">KSh</span>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={ratePerLitre}
                  onChange={(e) => setRatePerLitre(parseFloat(e.target.value) || 0)}
                  className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm font-semibold"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {t.buyerModal.phoneLabel}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +254 712 345 678"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {t.buyerModal.cycleLabel}
              </label>
              <select
                value={paymentCycle}
                onChange={(e) => setPaymentCycle(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm bg-white"
              >
                <option value="monthly">{lang === 'sw' ? 'Mwisho wa Mwezi (Monthly)' : 'Monthly Settlement'}</option>
                <option value="weekly">{lang === 'sw' ? 'Kila Wiki (Weekly)' : 'Weekly'}</option>
                <option value="daily">{lang === 'sw' ? 'Kila Siku / Wakati wa Kuleta' : 'Pay on Delivery'}</option>
                <option value="advance">{lang === 'sw' ? 'Malipo ya Mapema (Advance)' : 'Advance Payment'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              {t.buyerModal.initialBalanceLabel}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-gray-400">KSh</span>
              <input
                type="number"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm"
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              {lang === 'sw' ? 'Kiasi ambacho mnunuzi anadaiwa na shamba kufikia sasa.' : 'Amount this buyer currently owes the farm (leave 0 if balanced).'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              {t.buyerModal.notesLabel}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Rongai chilling plant, clerk name Mr. Mwangi"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t.herd.cancel}
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-dairy-600 hover:bg-dairy-700 text-white font-medium text-sm shadow-sm transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{t.buyers.saveBuyer}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
