'use client';

import React, { useEffect, useState } from 'react';
import type { Language, PaymentRecord } from '@/types';
import { Dialog, fieldInput, fieldLabel, ksh, primaryButton, secondaryButton } from '@/components/ui/Dialog';
import { formatFarmDate } from '@/lib/dates';
import type { OpenTarget } from '@/lib/settlements';
import { Link2 } from 'lucide-react';

interface Props {
  payment: PaymentRecord | null;
  unallocated: number;
  targets: OpenTarget[];
  onClose: () => void;
  onAllocate: (paymentId: string, target: OpenTarget, amount: number) => void;
  lang: Language;
}

export function AllocatePaymentDialog({ payment, unallocated, targets, onClose, onAllocate, lang }: Props) {
  const sw = lang === 'sw';
  const [targetKey, setTargetKey] = useState('');
  const [amount, setAmount] = useState('');
  const target = targets.find((t) => `${t.kind}:${t.id}` === targetKey);

  useEffect(() => {
    if (!payment) return;
    const first = targets[0];
    setTargetKey(first ? `${first.kind}:${first.id}` : '');
    setAmount(first ? String(Math.min(unallocated, first.outstanding)) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment?.id]);

  if (!payment) return null;
  const value = parseFloat(amount) || 0;
  const max = target ? Math.min(unallocated, target.outstanding) : 0;

  return (
    <Dialog
      open
      onClose={onClose}
      icon={<Link2 className="w-5 h-5" />}
      title={sw ? 'Unganisha malipo' : 'Allocate payment'}
      subtitle={`${payment.buyerName} · ${ksh(payment.amount)} · ${formatFarmDate(payment.date, lang)}`}
      footer={
        <>
          <button type="button" className={secondaryButton} onClick={onClose}>{sw ? 'Ghairi' : 'Cancel'}</button>
          <button type="button" className={primaryButton} disabled={!target || value <= 0 || value > max + 0.004}
            onClick={() => target && onAllocate(payment.id, target, value)}>
            {sw ? 'Unganisha' : `Allocate ${ksh(value)}`}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-700">
        {sw ? `Kiasi kisichounganishwa: ${ksh(unallocated)}.` : `${ksh(unallocated)} of this payment is not yet linked to a statement or bill.`}
      </p>
      {targets.length === 0 ? (
        <p className="p-3 rounded-xl bg-gray-50 text-sm">
          {sw ? 'Mnunuzi huyu hana taarifa au bili ambayo haijalipwa.' : 'This buyer has no unpaid statement or bill. The payment still reduces their balance.'}
        </p>
      ) : (
        <>
          <div>
            <label className={fieldLabel} htmlFor="alloc-target">{sw ? 'Lipia' : 'Apply to'}</label>
            <select id="alloc-target" className={fieldInput} value={targetKey}
              onChange={(e) => { setTargetKey(e.target.value); const t = targets.find((x) => `${x.kind}:${x.id}` === e.target.value); if (t) setAmount(String(Math.min(unallocated, t.outstanding))); }}>
              {targets.map((t) => (
                <option key={`${t.kind}:${t.id}`} value={`${t.kind}:${t.id}`}>{t.label} · {ksh(t.outstanding)} {sw ? 'imebaki' : 'outstanding'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={fieldLabel} htmlFor="alloc-amount">{sw ? 'Kiasi (KSh)' : 'Amount (KSh)'}</label>
            <input id="alloc-amount" type="number" step="any" min="0" inputMode="decimal" className={fieldInput} value={amount} onChange={(e) => setAmount(e.target.value)} />
            <p className="text-sm text-gray-600 mt-1">{sw ? `Kiwango cha juu ${ksh(max)}` : `Up to ${ksh(max)}`}</p>
          </div>
        </>
      )}
    </Dialog>
  );
}
