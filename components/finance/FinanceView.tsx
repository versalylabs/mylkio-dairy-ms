'use client';

import React, { useState } from 'react';
import { ExpenseRecord, Delivery, PaymentRecord, ExpenseCategory, Language } from '@/types';
import { translations } from '@/lib/translations';
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

  const totalBilled = deliveries.reduce((acc, d) => acc + d.expectedAmount, 0);
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netMargin = totalBilled - totalExpenses;

  // Breakdown by category
  const categoryTotals: Record<ExpenseCategory, number> = {
    feed: 0,
    veterinary: 0,
    labor: 0,
    transport: 0,
    maintenance: 0,
    other: 0,
  };

  expenses.forEach((e) => {
    if (categoryTotals[e.category] !== undefined) {
      categoryTotals[e.category] += e.amount;
    }
  });

  const filteredExpenses = expenses.filter((e) => {
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

      {/* KPI Cards: Revenue, Expenses, Net Profit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Billed Revenue */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {lang === 'sw' ? 'Mauzo Yaliyorekodiwa' : 'Total Milk Revenue'}
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-gray-900">
              KSh {totalBilled.toLocaleString()}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              Across all deliveries
            </div>
          </div>
        </div>

        {/* Cash Collected */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {lang === 'sw' ? 'Pesa Zilizopokelewa' : 'Cash Collected'}
            </span>
            <div className="p-2 bg-[#A9B392]/20 text-[#48563A] rounded-xl">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-[#48563A]">
              KSh {totalPaid.toLocaleString()}
            </div>
            <div className="text-[11px] text-[#5a6d49] mt-0.5">
              Settlements & cash
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {lang === 'sw' ? 'Jumla ya Gharama' : 'Total Farm Costs'}
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-rose-700">
              KSh {totalExpenses.toLocaleString()}
            </div>
            <div className="text-[11px] text-rose-600 mt-0.5">
              {expenses.length} expense items
            </div>
          </div>
        </div>

        {/* Net Operating Margin */}
        <div className={`rounded-3xl p-5 text-white shadow-md flex flex-col justify-between ${
          netMargin >= 0 
            ? 'bg-gradient-to-br from-dairy-800 to-dairy-950'
            : 'bg-gradient-to-br from-rose-800 to-rose-950'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-dairy-200">
              {lang === 'sw' ? 'Faida Halisi (Margin)' : 'Net Farm Margin'}
            </span>
            <div className="p-2 bg-white/10 rounded-xl">
              {netMargin >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-300" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-300" />
              )}
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black">
              KSh {netMargin.toLocaleString()}
            </div>
            <div className="text-[11px] text-dairy-200/80 mt-0.5">
              Billed revenue less operating costs
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown Chips */}
      <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <PieChart className="w-4 h-4 text-dairy-700" />
          <span>{lang === 'sw' ? 'Mgawanyo wa Gharama kwa Makundi' : 'Cost Breakdown by Category'}</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { key: 'feed', label: 'Feeds & Hay', amount: categoryTotals.feed, color: 'bg-amber-50 text-amber-900 border-amber-200' },
            { key: 'veterinary', label: 'Vet & Drugs', amount: categoryTotals.veterinary, color: 'bg-rose-50 text-rose-900 border-rose-200' },
            { key: 'labor', label: 'Labor Wages', amount: categoryTotals.labor, color: 'bg-blue-50 text-blue-900 border-blue-200' },
            { key: 'transport', label: 'Milk Transport', amount: categoryTotals.transport, color: 'bg-purple-50 text-purple-900 border-purple-200' },
            { key: 'maintenance', label: 'Maintenance', amount: categoryTotals.maintenance, color: 'bg-slate-50 text-slate-900 border-slate-200' },
            { key: 'other', label: 'Other Ops', amount: categoryTotals.other, color: 'bg-gray-50 text-gray-900 border-gray-200' },
          ].map((cat) => (
            <div key={cat.key} className={`p-3 rounded-2xl border ${cat.color} flex flex-col justify-between`}>
              <span className="text-[11px] font-semibold opacity-75">{cat.label}</span>
              <span className="text-base font-extrabold mt-1">
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
