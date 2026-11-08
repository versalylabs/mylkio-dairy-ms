'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { Buyer, CoopStatement, Delivery, Language, StatementDeduction } from '@/types';
import { Dialog, fieldInput, fieldLabel, ksh, primaryButton, secondaryButton } from '@/components/ui/Dialog';
import { farmToday, formatFarmDate, previousMonthRange } from '@/lib/dates';
import { reconcileStatement } from '@/lib/settlements';
import { FileText, Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (statement: Omit<CoopStatement, 'id' | 'farmId' | 'synced' | 'createdAt'>) => void;
  buyers: Buyer[];
  deliveries: Delivery[];
  lang: Language;
}

const DEDUCTION_PRESETS = ['Transport', 'Feed advance', 'AI service', 'Share contribution', 'Loan repayment', 'Vet services'];

export function CoopStatementModal({ open, onClose, onSave, buyers, deliveries, lang }: Props) {
  const sw = lang === 'sw';
  const coops = buyers.filter((b) => b.type === 'cooperative');
  const last = previousMonthRange(farmToday());

  const [buyerId, setBuyerId] = useState('');
  const [from, setFrom] = useState(last.from);
  const [to, setTo] = useState(last.to);
  const [statementRef, setStatementRef] = useState('');
  const [litres, setLitres] = useState('');
  const [rate, setRate] = useState('');
  const [bonus, setBonus] = useState('');
  const [deductions, setDeductions] = useState<StatementDeduction[]>([]);
  const [paymentDate, setPaymentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const range = previousMonthRange(farmToday());
    const first = coops[0];
    setBuyerId(first?.id ?? '');
    setFrom(range.from);
    setTo(range.to);
    setRate(first ? String(first.ratePerLitre) : '');
    setStatementRef(''); setLitres(''); setBonus(''); setDeductions([]); setPaymentDate(''); setNotes(''); setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const buyer = coops.find((b) => b.id === buyerId);
  const draft: CoopStatement = useMemo(() => ({
    id: 'draft', farmId: '', synced: false, createdAt: '',
    buyerId, buyerName: buyer?.name ?? '', periodFrom: from, periodTo: to, statementRef,
    statementLitres: parseFloat(litres) || 0, ratePerLitre: parseFloat(rate) || 0, bonusKSh: parseFloat(bonus) || 0,
    deductions: deductions.filter((d) => d.label.trim() && d.amount),
  }), [buyerId, buyer, from, to, statementRef, litres, rate, bonus, deductions]);
  const rec = reconcileStatement(draft, deliveries);

  const addDeduction = (label = '') => setDeductions((d) => [...d, { id: crypto.randomUUID(), label, amount: 0 }]);
  const updateDeduction = (id: string, patch: Partial<StatementDeduction>) =>
    setDeductions((list) => list.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyer) return setError(sw ? 'Chagua chama cha ushirika' : 'Choose the cooperative');
    if (!(draft.statementLitres > 0)) return setError(sw ? 'Weka lita zilizo kwenye taarifa' : 'Enter the litres shown on the statement');
    if (!(draft.ratePerLitre > 0)) return setError(sw ? 'Weka bei kwa lita' : 'Enter the rate per litre');
    if (from > to) return setError(sw ? 'Tarehe za kipindi si sahihi' : 'The period end is before its start');
    const { id: _i, farmId: _f, synced: _s, createdAt: _c, ...data } = draft;
    onSave({ ...data, expectedPaymentDate: paymentDate || undefined, notes: notes.trim() || undefined });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      wide
      icon={<FileText className="w-5 h-5" />}
      title={sw ? 'Rekodi Taarifa ya Ushirika' : 'Record co-op statement'}
      subtitle={sw ? 'Weka kile kilichoandikwa kwenye taarifa ya mwezi' : 'Enter the figures exactly as printed on the monthly statement'}
      footer={
        <>
          <button type="button" className={secondaryButton} onClick={onClose}>{sw ? 'Ghairi' : 'Cancel'}</button>
          <button type="submit" form="coop-statement-form" className={primaryButton}>
            {sw ? 'Hifadhi taarifa' : `Save statement · ${ksh(rec.net)} payout`}
          </button>
        </>
      }
    >
      <form id="coop-statement-form" onSubmit={submit} className="space-y-4">
        {coops.length === 0 && (
          <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm">
            {sw ? 'Ongeza mnunuzi wa aina ya ushirika kwanza.' : 'Add a buyer of type "cooperative" first.'}
          </p>
        )}
        {error && <p role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm font-semibold text-red-800">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className={fieldLabel} htmlFor="stmt-buyer">{sw ? 'Ushirika' : 'Cooperative'}</label>
            <select id="stmt-buyer" className={fieldInput} value={buyerId}
              onChange={(e) => { setBuyerId(e.target.value); const b = coops.find((c) => c.id === e.target.value); if (b) setRate(String(b.ratePerLitre)); }}>
              {coops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={fieldLabel} htmlFor="stmt-from">{sw ? 'Kuanzia' : 'Period from'}</label>
            <input id="stmt-from" type="date" className={fieldInput} value={from} onChange={(e) => setFrom(e.target.value)} required />
          </div>
          <div>
            <label className={fieldLabel} htmlFor="stmt-to">{sw ? 'Hadi' : 'Period to'}</label>
            <input id="stmt-to" type="date" className={fieldInput} value={to} onChange={(e) => setTo(e.target.value)} required />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className={fieldLabel} htmlFor="stmt-ref">{sw ? 'Nambari ya taarifa' : 'Statement no.'}</label>
            <input id="stmt-ref" className={fieldInput} value={statementRef} onChange={(e) => setStatementRef(e.target.value)} placeholder="e.g. BDF/10/0417" />
          </div>
          <div>
            <label className={fieldLabel} htmlFor="stmt-litres">{sw ? 'Lita zilizokubaliwa' : 'Accepted litres'}</label>
            <input id="stmt-litres" type="number" step="0.1" min="0" inputMode="decimal" className={fieldInput} value={litres} onChange={(e) => setLitres(e.target.value)} required />
          </div>
          <div>
            <label className={fieldLabel} htmlFor="stmt-rate">{sw ? 'Bei / lita' : 'Rate / litre'}</label>
            <input id="stmt-rate" type="number" step="any" min="0" inputMode="decimal" className={fieldInput} value={rate} onChange={(e) => setRate(e.target.value)} required />
          </div>
          <div>
            <label className={fieldLabel} htmlFor="stmt-bonus">{sw ? 'Bonasi (KSh)' : 'Bonus (KSh)'}</label>
            <input id="stmt-bonus" type="number" step="any" min="0" inputMode="decimal" className={fieldInput} value={bonus} onChange={(e) => setBonus(e.target.value)} placeholder="0" />
          </div>
        </div>

        <fieldset className="rounded-2xl border border-gray-200 p-4 space-y-3">
          <legend className="px-1 text-sm font-bold text-gray-900">{sw ? 'Makato yaliyoorodheshwa' : 'Itemised deductions'}</legend>
          {deductions.length === 0 && (
            <p className="text-sm text-gray-600">{sw ? 'Hakuna makato bado.' : 'No deductions yet. Add each line from the statement.'}</p>
          )}
          {deductions.map((d) => (
            <div key={d.id} className="flex items-center gap-2">
              <input aria-label={sw ? 'Aina ya makato' : 'Deduction'} className={`${fieldInput} flex-1`} value={d.label}
                onChange={(e) => updateDeduction(d.id, { label: e.target.value })} placeholder={sw ? 'mfano Usafiri' : 'e.g. Transport'} />
              <input aria-label={sw ? 'Kiasi (KSh)' : 'Amount (KSh)'} type="number" step="any" min="0" inputMode="decimal" className={`${fieldInput} w-32`}
                value={d.amount || ''} onChange={(e) => updateDeduction(d.id, { amount: parseFloat(e.target.value) || 0 })} placeholder="KSh" />
              <button type="button" onClick={() => setDeductions((list) => list.filter((x) => x.id !== d.id))}
                className="p-2 rounded-lg text-gray-500 hover:text-rose-700 hover:bg-rose-50" aria-label={sw ? 'Ondoa makato' : `Remove ${d.label || 'deduction'}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {DEDUCTION_PRESETS.filter((p) => !deductions.some((d) => d.label === p)).map((p) => (
              <button key={p} type="button" onClick={() => addDeduction(p)} className="px-3 py-1.5 rounded-full border border-gray-300 text-sm font-medium hover:bg-gray-50">
                + {p}
              </button>
            ))}
            <button type="button" onClick={() => addDeduction()} className="px-3 py-1.5 rounded-full border border-dashed border-gray-400 text-sm font-medium hover:bg-gray-50 inline-flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> {sw ? 'Nyingine' : 'Other'}
            </button>
          </div>
        </fieldset>

        {/* Live reconciliation against the farm's own delivery records */}
        <section aria-live="polite" className={`rounded-2xl p-4 border-2 space-y-2 ${rec.matches ? 'border-[#A8BFA5] bg-[#A8BFA5]/10' : 'border-amber-300 bg-amber-50'}`}>
          <div className="flex items-start gap-2 font-bold text-sm">
            {rec.matches ? <CheckCircle2 className="w-5 h-5 text-[#345C4A] shrink-0" /> : <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />}
            <span>
              {rec.deliveryCount === 0
                ? (sw ? 'Hakuna utoaji uliorekodiwa katika kipindi hiki.' : 'You have no deliveries recorded to this co-op in this period.')
                : sw
                ? `Ulirekodi lita ${rec.recordedAccepted}; taarifa inaonyesha lita ${rec.statementLitres}.`
                : `You recorded ${rec.recordedAccepted} L accepted; the statement shows ${rec.statementLitres} L.`}
              {!rec.matches && rec.deliveryCount > 0 && (sw
                ? ` Kagua tofauti ya lita ${Math.abs(rec.litreDifference)}.`
                : ` Review the ${Math.abs(rec.litreDifference)} L difference.`)}
            </span>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-sm">
            <dt className="text-gray-600">{sw ? 'Uliyorekodi' : 'Your records'}</dt><dd className="font-semibold text-right sm:text-left">{ksh(rec.recordedCharges)}</dd>
            <dt className="text-gray-600">{sw ? 'Jumla ya taarifa' : 'Statement gross'}</dt><dd className="font-semibold text-right sm:text-left">{ksh(rec.statementGross)}</dd>
            <dt className="text-gray-600">{sw ? 'Makato' : 'Deductions'}</dt><dd className="font-semibold text-right sm:text-left">− {ksh(rec.deductions)}</dd>
            <dt className="text-gray-600">{sw ? 'Malipo halisi' : 'Net payout'}</dt><dd className="font-black text-right sm:text-left text-[#345C4A]">{ksh(rec.net)}</dd>
          </dl>
          {rec.deliveryCount > 0 && (
            <p className="text-sm text-gray-700">
              {sw
                ? `Ulirekodi lita ${rec.recordedDelivered} zilizopelekwa, ${rec.recordedRejected} zilikataliwa (siku ${rec.deliveryCount}). Baada ya kuhifadhi, akaunti ya ushirika itafuata taarifa hii kwa kipindi hiki.`
                : `${rec.deliveryCount} deliveries: ${rec.recordedDelivered} L delivered, ${rec.recordedRejected} L rejected. Once saved, this co-op's balance for the period follows the statement (${formatFarmDate(from, lang)} – ${formatFarmDate(to, lang)}).`}
            </p>
          )}
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel} htmlFor="stmt-paydate">{sw ? 'Tarehe ya malipo inayotarajiwa' : 'Expected payout date'}</label>
            <input id="stmt-paydate" type="date" className={fieldInput} value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div>
            <label className={fieldLabel} htmlFor="stmt-notes">{sw ? 'Maelezo' : 'Notes'}</label>
            <input id="stmt-notes" className={fieldInput} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </form>
    </Dialog>
  );
}
