'use client';

import React, { useState } from 'react';
import { ExpenseRecord, ExpenseCategory, FeedType, FeedUnit, Language } from '@/types';
import { FEED_TYPES, FEED_UNITS } from '@/lib/feed-cost';
import { FEED_COPY, FEED_UNIT_NAMES } from '@/lib/feed-copy';
import { farmToday } from '@/lib/dates';
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
  const todayStr = farmToday();

  const [date, setDate] = useState(todayStr);
  const [category, setCategory] = useState<ExpenseCategory>('feed');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'bank'>('mpesa');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  // Feed only: what was bought and how much, for the feed cost card.
  const [feedType, setFeedType] = useState<FeedType | ''>('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<FeedUnit>('bag');
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
      ...(category === 'feed' && feedType ? { feedType } : {}),
      ...(category === 'feed' && parseFloat(quantity) > 0 ? { quantity: parseFloat(quantity), unit } : {}),
    });

    // Reset
    setDescription('');
    setAmount('');
    setReferenceNo('');
    setNotes('');
    setFeedType('');
    setQuantity('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/60 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4">
      <div className="flex max-h-[94dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-3xl border border-ivory-border bg-white shadow-2xl sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#F8F8F3] text-[#345C4A] border border-gray-200 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-charcoal">
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
              <label className="field-label">
                {lang === 'sw' ? 'Tarehe' : 'Date'}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="field"
                required
              />
            </div>

            <div>
              <label className="field-label">
                {lang === 'sw' ? 'Kundi la Matumizi' : 'Category'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="field"
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

          {category === 'feed' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
              <div>
                <label htmlFor="feed-type" className="field-label">{FEED_COPY[lang].form.type}</label>
                <select id="feed-type" value={feedType} onChange={(e) => setFeedType(e.target.value as FeedType | '')} className="field">
                  <option value="">{FEED_COPY[lang].form.optional}</option>
                  {FEED_TYPES.map((ft) => <option key={ft} value={ft}>{FEED_COPY[lang].types[ft]}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="feed-qty" className="field-label">{FEED_COPY[lang].form.quantity}</label>
                <input id="feed-qty" type="number" inputMode="decimal" step="any" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder={FEED_COPY[lang].form.optional} className="field" />
              </div>
              <div>
                <label htmlFor="feed-unit" className="field-label">{FEED_COPY[lang].form.unit}</label>
                <select id="feed-unit" value={unit} onChange={(e) => setUnit(e.target.value as FeedUnit)} className="field">
                  {FEED_UNITS.map((u) => <option key={u} value={u}>{FEED_UNIT_NAMES[lang][u]}</option>)}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="field-label">
              {lang === 'sw' ? 'Maelezo ya Bidhaa / Huduma *' : 'Description / Supplier *'}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 10 Bags Dairy Meal 16% (Unga Farm Care)"
              className="field"
              required
            />
          </div>

          {/* Amount Input */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              {lang === 'sw' ? 'Kiasi Kilichotumika (KSh) *' : 'Total Expense Amount (KSh) *'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2.5 text-lg font-bold text-gray-400">
                KSh
              </span>
              <input
                type="number"
                step="any"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 24000"
                className="field text-2xl font-black text-slate-900 pl-16 pr-4"
                autoFocus
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="field-label">
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
                    ? 'border-[#345C4A] bg-[#A8BFA5]/20 text-[#345C4A] font-bold ring-2 ring-[#345C4A]/20'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <CreditCard className="w-4 h-4 mb-1 text-[#345C4A]" />
                <span className="text-xs">{lang === 'sw' ? 'Benki' : 'Bank'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="field-label">
              {paymentMethod === 'mpesa' ? 'M-Pesa Reference / Code' : 'Receipt / Cheque No.'}
            </label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. QJ902812A"
              className="field font-mono uppercase"
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
              <span>{lang === 'sw' ? 'Hifadhi Gharama' : 'Save Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
