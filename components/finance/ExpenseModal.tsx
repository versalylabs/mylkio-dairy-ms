'use client';

import React, { useState } from 'react';
import { ExpenseRecord, ExpenseCategory, Language } from '@/types';
import { translations } from '@/lib/translations';
import { X, Check, Receipt, Smartphone, Banknote, CreditCard, AlertCircle } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Omit<ExpenseRecord, 'id' | 'createdAt' | 'farmId'>) => void;
  lang: Language;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  lang,
}) => {
  const t = translations[lang];
  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(todayStr);
  const [category, setCategory] = useState<ExpenseCategory>('feed');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'bank'>('mpesa');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount) || 0;
    if (!description.trim()) {
      setError(lang === 'sw' ? 'Weka maelezo ya matumizi' : 'Please enter expense description');
      return;
    }
    if (numAmount <= 0) {
      setError(lang === 'sw' ? 'Weka kiasi halisi cha fedha' : 'Please enter a valid amount');
      return;
    }

    onSave({
      date,
      category,
      description: description.trim(),
      amount: numAmount,
      paymentMethod,
      referenceNo: referenceNo.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    // Reset
    setDescription('');
    setAmount('');
    setReferenceNo('');
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
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {lang === 'sw' ? 'Rekodi Gharama za Shamba' : 'Record Farm Expense'}
              </h2>
              <p className="text-xs text-gray-500">
                {lang === 'sw' ? 'Chakula, matibabu, mishahara na usafiri' : 'Feeds, vet treatments, labor wages & transport'}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {lang === 'sw' ? 'Tarehe' : 'Date'}
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
                {lang === 'sw' ? 'Kundi la Matumizi' : 'Category'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-xs font-bold bg-white"
              >
                <option value="feed">{lang === 'sw' ? 'Chakula cha Ng\'ombe (Feed)' : 'Feed & Supplements'}</option>
                <option value="veterinary">{lang === 'sw' ? 'Dawa na Daktari (Vet)' : 'Veterinary & Medicines'}</option>
                <option value="labor">{lang === 'sw' ? 'Mishahara ya Wafanyakazi' : 'Labor & Milker Wages'}</option>
                <option value="transport">{lang === 'sw' ? 'Usafiri wa Maziwa' : 'Milk Transport'}</option>
                <option value="maintenance">{lang === 'sw' ? 'Matengenezo ya Shamba' : 'Barn & Equipment Maintenance'}</option>
                <option value="other">{lang === 'sw' ? 'Mengineyo' : 'Other Farm Operating Costs'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              {lang === 'sw' ? 'Maelezo ya Bidhaa / Huduma *' : 'Description / Supplier *'}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 10 Bags Dairy Meal 16% (Unga Farm Care)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm font-semibold"
              required
            />
          </div>

          {/* Amount Input */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              {lang === 'sw' ? 'Kiasi Kilichotumika (KSh) *' : 'Total Expense Amount (KSh) *'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2.5 text-lg font-bold text-gray-400">
                KSh
              </span>
              <input
                type="number"
                step="50"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 24000"
                className="w-full text-2xl font-black text-slate-900 pl-16 pr-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 bg-white"
                autoFocus
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
              {lang === 'sw' ? 'Njia ya Kulipa' : 'Payment Method'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('mpesa')}
                className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${
                  paymentMethod === 'mpesa'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold ring-2 ring-emerald-500/20'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Smartphone className="w-4 h-4 mb-1 text-emerald-600" />
                <span className="text-xs">M-Pesa</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-dairy-600 bg-dairy-50 text-dairy-800 font-bold ring-2 ring-dairy-500/20'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Banknote className="w-4 h-4 mb-1 text-dairy-600" />
                <span className="text-xs">{lang === 'sw' ? 'Taslimu' : 'Cash'}</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('bank')}
                className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${
                  paymentMethod === 'bank'
                    ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold ring-2 ring-blue-500/20'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <CreditCard className="w-4 h-4 mb-1 text-blue-600" />
                <span className="text-xs">{lang === 'sw' ? 'Benki' : 'Bank'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              {paymentMethod === 'mpesa' ? 'M-Pesa Reference / Code' : 'Receipt / Cheque No.'}
            </label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. QJ902812A"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-xs font-mono uppercase"
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
              <span>{lang === 'sw' ? 'Hifadhi Gharama' : 'Save Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
