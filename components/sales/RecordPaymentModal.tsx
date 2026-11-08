'use client';

import React, { useState, useEffect } from 'react';
import { Buyer, PaymentRecord, Language } from '@/types';
import { translations } from '@/lib/translations';
import { farmToday, formatFarmDate } from '@/lib/dates';
import { paymentsWithReference, roundMoney } from '@/lib/ledger';
import { X, Check, DollarSign, Smartphone, CreditCard, Banknote } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: Omit<PaymentRecord, 'id' | 'createdAt' | 'farmId' | 'synced'>) => void;
  buyers: Buyer[];
  payments: PaymentRecord[];
  lang: Language;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  buyers,
  payments,
  lang,
}) => {
  const t = translations[lang];
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);

  const [buyerId, setBuyerId] = useState(buyers[0]?.id || '');
  const [date, setDate] = useState(farmToday());
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'bank' | 'other'>('mpesa');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const selectedBuyer = buyers.find((b) => b.id === buyerId);

  useEffect(() => {
    if (buyers.length > 0 && !buyerId) {
      setBuyerId(buyers[0].id);
    }
  }, [buyers, buyerId]);

  useEffect(() => {
    if (isOpen) setDate(farmToday());
  }, [isOpen]);

  useEffect(() => setDuplicateConfirmed(false), [referenceNo]);

  if (!isOpen) return null;

  const sameReference = paymentsWithReference(payments, referenceNo);
  const enteredAmount = parseFloat(amount) || 0;
  const balanceAfter = selectedBuyer ? roundMoney(selectedBuyer.currentBalance - enteredAmount) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount) || 0;
    if (!selectedBuyer) {
      setError(lang === 'sw' ? 'Tafadhali chagua mnunuzi' : 'Please select a buyer');
      return;
    }
    if (numAmount <= 0) {
      setError(lang === 'sw' ? 'Weka kiasi kilichopokelewa' : 'Please enter payment amount');
      return;
    }
    if (sameReference.length > 0 && !duplicateConfirmed) {
      setError(lang === 'sw' ? 'Nambari hii ya muamala tayari imerekodiwa. Thibitisha kama ni malipo tofauti.' : 'This reference is already recorded. Confirm it is a different payment before saving.');
      return;
    }

    onSave({
      buyerId: selectedBuyer.id,
      buyerName: selectedBuyer.name,
      date,
      amount: numAmount,
      paymentMethod,
      referenceNo: referenceNo.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    // Reset
    setAmount('');
    setReferenceNo('');
    setDuplicateConfirmed(false);
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
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {lang === 'sw' ? 'Rekodi Malipo Yaliyopokelewa' : 'Record Payment Receipt'}
              </h2>
              <p className="text-xs text-gray-500">
                {lang === 'sw' ? 'Malipo ya M-Pesa, benki au pesa taslimu' : 'Log cash, M-Pesa reference, or bank transfer'}
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
            <div className="p-3 bg-[#FAF5EB] border border-[#E5D5B5] text-[#26332D] rounded-xl text-xs font-semibold">
              {lang === 'sw' ? 'Hakuna mnunuzi aliyesajiliwa bado. Tafadhali ongeza mnunuzi kwanza.' : 'No buyers or cooperatives registered yet. Please add a buyer in the Sales tab first.'}
            </div>
          )}

          {error && (
            <div className="p-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl">
              {error}
            </div>
          )}

          {/* Select Buyer */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              {lang === 'sw' ? 'Mnunuzi / Mlipaji *' : 'Paying Buyer / Cooperative *'}
            </label>
            <select
              value={buyerId}
              onChange={(e) => setBuyerId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm font-semibold bg-white"
              required
            >
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.currentBalance >= 0 ? (lang === 'sw' ? 'Deni' : 'Owes') : (lang === 'sw' ? 'Mapema' : 'Advance')}: KSh {Math.abs(b.currentBalance).toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
              {lang === 'sw' ? 'Njia ya Malipo' : 'Payment Method'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('mpesa')}
                className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${
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
                className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${
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
                className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${
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

          {/* Amount Received */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              {lang === 'sw' ? 'Kiasi Kilichopokelewa (KSh) *' : 'Amount Received (KSh) *'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-lg font-bold text-gray-400">
                KSh
              </span>
              <input
                type="number"
                step="any"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 1500"
                className="w-full text-2xl font-black text-slate-900 pl-16 pr-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 bg-white"
                autoFocus
                required
              />
            </div>
            {selectedBuyer && (
              <p className="text-sm text-gray-600">
                {lang === 'sw' ? 'Salio sasa' : 'Balance now'}:{' '}
                <strong>
                  {selectedBuyer.currentBalance >= 0
                    ? `KSh ${selectedBuyer.currentBalance.toLocaleString()} ${lang === 'sw' ? 'deni' : 'owed'}`
                    : `KSh ${Math.abs(selectedBuyer.currentBalance).toLocaleString()} ${lang === 'sw' ? 'mapema' : 'advance'}`}
                </strong>
                {enteredAmount > 0 && (
                  <>
                    {' → '}
                    {lang === 'sw' ? 'baada ya malipo' : 'after this payment'}:{' '}
                    <strong>
                      {balanceAfter >= 0
                        ? `KSh ${balanceAfter.toLocaleString()} ${lang === 'sw' ? 'deni' : 'owed'}`
                        : `KSh ${Math.abs(balanceAfter).toLocaleString()} ${lang === 'sw' ? 'mapema (advance)' : 'held as advance'}`}
                    </strong>
                  </>
                )}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {lang === 'sw' ? 'Tarehe' : 'Date Received'}
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
                {paymentMethod === 'mpesa' ? 'M-Pesa Ref / Code' : 'Ref / Receipt No.'}
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder={paymentMethod === 'mpesa' ? 'e.g. TKR729910Q' : 'e.g. REC-042'}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm uppercase font-mono"
              />
            </div>
          </div>

          {sameReference.length > 0 && (
            <div className="p-3.5 rounded-2xl border-2 border-amber-300 bg-amber-50 text-amber-950 space-y-2" role="alert">
              <p className="text-sm font-bold">
                {lang === 'sw' ? 'Nambari hii tayari imerekodiwa:' : 'This reference is already recorded:'}
              </p>
              <ul className="text-sm list-disc pl-5">
                {sameReference.map((p) => (
                  <li key={p.id}>
                    KSh {p.amount.toLocaleString()} {lang === 'sw' ? 'kutoka' : 'from'} {p.buyerName}, {formatFarmDate(p.date, lang)}
                  </li>
                ))}
              </ul>
              <label className="flex items-start gap-2 text-sm font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={duplicateConfirmed}
                  onChange={(e) => setDuplicateConfirmed(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[#345C4A]"
                />
                <span>{lang === 'sw' ? 'Hii ni malipo tofauti — hifadhi hata hivyo' : 'This is a different payment — save it anyway'}</span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              {lang === 'sw' ? 'Maelezo' : 'Notes'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. September cooperative settlement payout"
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
              <span>{lang === 'sw' ? 'Hifadhi Malipo' : 'Save Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
