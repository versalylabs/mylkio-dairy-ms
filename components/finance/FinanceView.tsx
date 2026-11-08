'use client';

import React, { useState } from 'react';
import { ExpenseRecord, Delivery, PaymentRecord, ExpenseCategory, Language } from '@/types';
import { translations } from '@/lib/translations';
import { farmToday, inRange, monthRange, previousMonthRange, type DateRange } from '@/lib/dates';
import { cashReceived, expensesInRange, salesInRange } from '@/lib/ledger';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  Smartphone, 
  Banknote, 
  CreditCard,
  Trash2, 
  PieChart,
  Layers
} from 'lucide-react';

interface FinanceViewProps {
  expenses: ExpenseRecord[];
  deliveries: Delivery[];
  payments: PaymentRecord[];
  onOpenRecordExpense: () => void;
  onDeleteExpense: (id: string) => void;
  lang: Language;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  expenses,
  deliveries,
  payments,
  onOpenRecordExpense,
  onDeleteExpense,
  lang,
}) => {
  const t = translations[lang];
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [period, setPeriod] = useState<'this_month' | 'last_month' | 'all'>('this_month');
  const sw = lang === 'sw';

  const todayStr = farmToday();
  const range: DateRange =
    period === 'this_month' ? monthRange(todayStr) : period === 'last_month' ? previousMonthRange(todayStr) : { from: '0000-01-01', to: '9999-12-31' };
  const periodExpenses = expenses.filter((e) => inRange(e.date, range));

  // Billed = accepted milk charges (rejected litres excluded, voided records excluded).
  const totalBilled = salesInRange(deliveries, range).billed;
  const totalPaid = cashReceived(payments, range).amount;
  const totalExpenses = expensesInRange(expenses, range).amount;
  const netMargin = totalBilled - totalExpenses;
  const periodLabel =
    period === 'this_month' ? (sw ? 'Mwezi huu' : 'This month') : period === 'last_month' ? (sw ? 'Mwezi uliopita' : 'Last month') : (sw ? 'Tangu mwanzo' : 'All time');

  // Breakdown by category
  const categoryTotals: Record<ExpenseCategory, number> = {
    feed: 0,
    veterinary: 0,
    labor: 0,
    transport: 0,
    maintenance: 0,
    other: 0,
  };

  periodExpenses.forEach((e) => {
    if (categoryTotals[e.category] !== undefined) {
      categoryTotals[e.category] += e.amount;
    }
  });

  const filteredExpenses = periodExpenses.filter((e) => {
    if (filterCategory === 'all') return true;
    return e.category === filterCategory;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {lang === 'sw' ? 'Fedha na Gharama za Shamba' : 'Farm Finance & Operating Profit'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'sw'
              ? 'Fuatilia mauzo ya maziwa dhidi ya gharama za chakula na matibabu'
              : 'Monitor milk earnings vs. feed, veterinary & labor operating costs'}
          </p>
        </div>

        <button
          onClick={onOpenRecordExpense}
          className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-dairy-600 hover:bg-dairy-700 text-white font-semibold text-sm shadow-sm transition-all touch-target"
        >
          <Plus className="w-5 h-5" />
          <span>{lang === 'sw' ? 'Rekodi Gharama' : 'Record Farm Expense'}</span>
        </button>
      </div>

      {/* Reporting period */}
      <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl w-fit" role="group" aria-label={sw ? 'Kipindi' : 'Reporting period'}>
        {(['this_month', 'last_month', 'all'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            aria-pressed={period === p}
            className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-all ${period === p ? 'bg-white text-dairy-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {p === 'this_month' ? (sw ? 'Mwezi huu' : 'This month') : p === 'last_month' ? (sw ? 'Mwezi uliopita' : 'Last month') : (sw ? 'Zote' : 'All time')}
          </button>
        ))}
      </div>

      {/* KPI Cards: Revenue, Expenses, Net Profit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Billed Revenue */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {sw ? 'Mauzo Yaliyodaiwa' : 'Milk Billed'}
            </span>
            <div className="p-2 bg-[#FAF5EB] text-[#C6A76A] rounded-xl border border-[#E5D5B5]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-gray-900">
              KSh {totalBilled.toLocaleString()}
            </div>
            <div className="text-xs text-gray-600 mt-0.5">
              {periodLabel} · {sw ? 'lita zilizokubaliwa tu' : 'accepted litres only'}
            </div>
          </div>
        </div>

        {/* Cash Collected */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {lang === 'sw' ? 'Pesa Zilizopokelewa' : 'Cash Collected'}
            </span>
            <div className="p-2 bg-[#A8BFA5]/20 text-[#345C4A] rounded-xl">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-[#345C4A]">
              KSh {totalPaid.toLocaleString()}
            </div>
            <div className="text-xs text-[#5D7368] mt-0.5">
              {periodLabel} · {sw ? 'pesa halisi iliyopokelewa' : 'money actually received'}
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {lang === 'sw' ? 'Jumla ya Gharama' : 'Total Farm Costs'}
            </span>
            <div className="p-2 bg-[#FAF9F5] text-[#26332D] rounded-xl border border-gray-200">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-[#26332D]">
              KSh {totalExpenses.toLocaleString()}
            </div>
            <div className="text-xs text-[#5D7368] mt-0.5">
              {periodLabel} · {periodExpenses.length} {sw ? 'gharama' : 'expense items'}
            </div>
          </div>
        </div>

        {/* Net Operating Margin */}
        <div className={`rounded-3xl p-5 text-white shadow-xs flex flex-col justify-between ${
          netMargin >= 0 
            ? 'bg-gradient-to-br from-[#345C4A] via-[#274537] to-[#1d3329]'
            : 'bg-[#26332D] border border-[#3D4F46]'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#FAF5EB]/90">
              {lang === 'sw' ? 'Faida Halisi (Margin)' : 'Net Farm Margin'}
            </span>
            <div className="p-2 bg-white/10 rounded-xl">
              {netMargin >= 0 ? (
                <TrendingUp className="w-4 h-4 text-[#A8BFA5]" />
              ) : (
                <TrendingDown className="w-4 h-4 text-[#FAF5EB]" />
              )}
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black">
              KSh {netMargin.toLocaleString()}
            </div>
            <div className="text-xs text-[#FAF5EB]/80 mt-0.5">
              {periodLabel} · {netMargin >= 0 ? (sw ? 'mauzo yaliyodaiwa ukiondoa gharama' : 'billed milk less expenses') : (sw ? 'gharama zimezidi mauzo' : 'expenses exceed billed milk')}
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown Chips */}
      <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <PieChart className="w-4 h-4 text-[#345C4A]" />
          <span>{lang === 'sw' ? 'Mgawanyo wa Gharama kwa Makundi' : 'Cost Breakdown by Category'}</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { key: 'feed', label: 'Feeds & Hay', amount: categoryTotals.feed },
            { key: 'veterinary', label: 'Vet & Drugs', amount: categoryTotals.veterinary },
            { key: 'labor', label: 'Labor Wages', amount: categoryTotals.labor },
            { key: 'transport', label: 'Milk Transport', amount: categoryTotals.transport },
            { key: 'maintenance', label: 'Maintenance', amount: categoryTotals.maintenance },
            { key: 'other', label: 'Other Ops', amount: categoryTotals.other },
          ].map((cat) => (
            <div key={cat.key} className="bg-[#FAF9F5] border border-[#E8E4D8] hover:border-[#345C4A]/40 transition-all p-3 rounded-2xl flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-[#5D7368]">{cat.label}</span>
              <span className="text-base font-extrabold text-[#26332D] mt-1">
                KSh {cat.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Expenses Ledger */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {lang === 'sw' ? 'Leja ya Matumizi ya Shamba' : 'Operating Expenses Ledger'}
            </h2>
            <p className="text-xs text-gray-500">
              {expenses.length} entries recorded
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'feed', label: 'Feed' },
              { key: 'veterinary', label: 'Vet' },
              { key: 'labor', label: 'Labor' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterCategory(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterCategory === f.key
                    ? 'bg-dairy-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No expenses found in this category.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredExpenses.map((exp) => (
              <div
                key={exp.id}
                className="p-4 sm:p-5 hover:bg-gray-50/70 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-gray-900">
                      {exp.description}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                      {exp.category}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      {exp.date}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="capitalize font-semibold text-gray-700 flex items-center gap-1">
                      {exp.paymentMethod === 'mpesa' && <Smartphone className="w-3.5 h-3.5 text-emerald-600" />}
                      {exp.paymentMethod === 'cash' && <Banknote className="w-3.5 h-3.5 text-dairy-600" />}
                      {exp.paymentMethod === 'bank' && <CreditCard className="w-3.5 h-3.5 text-blue-600" />}
                      <span>{exp.paymentMethod}</span>
                    </span>
                    {exp.referenceNo && (
                      <span className="font-mono text-gray-600">
                        (Ref: {exp.referenceNo})
                      </span>
                    )}
                  </div>

                  {exp.notes && (
                    <p className="text-xs text-gray-400 italic">
                      &quot;{exp.notes}&quot;
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-4">
                  <span className="text-base font-extrabold text-rose-700">
                    -KSh {exp.amount.toLocaleString()}
                  </span>

                  <button
                    onClick={() => {
                      if (confirm(lang === 'sw' ? 'Je, una uhakika unataka kufuta rekodi hii ya gharama?' : 'Delete this expense record?')) {
                        onDeleteExpense(exp.id);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={t.common.delete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
