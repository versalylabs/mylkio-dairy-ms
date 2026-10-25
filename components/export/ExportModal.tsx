'use client';

import React from 'react';
import { DataExporter } from '@/lib/export';
import { Cow, MilkEntry, Delivery, ExpenseRecord, Farm, Language } from '@/types';
import { X, Download, FileSpreadsheet, Database, Milk, Truck, Receipt, Users } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  farm: Farm;
  cows: Cow[];
  buyers: any[];
  milk: MilkEntry[];
  deliveries: Delivery[];
  payments: any[];
  health: any[];
  breeding: any[];
  expenses: ExpenseRecord[];
  lang: Language;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  farm,
  cows,
  buyers,
  milk,
  deliveries,
  payments,
  health,
  breeding,
  expenses,
  lang,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-dairy-50 text-dairy-800 flex items-center justify-center">
              <Download className="w-5 h-5 text-dairy-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {lang === 'sw' ? 'Pakua Data ya Shamba (CSV & Backup)' : 'Export Farm Data (CSV & Backup)'}
              </h2>
              <p className="text-xs text-gray-500">
                {lang === 'sw' ? 'Pakua ripoti za Excel/CSV au chelezo kamili ya mfumo' : 'Download spreadsheets for audits, co-op reports or backups'}
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

        {/* Options */}
        <div className="p-5 space-y-3">
          {/* Milk CSV */}
          <div className="p-4 bg-slate-50 hover:bg-dairy-50/50 rounded-2xl border border-slate-200 transition-colors flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white text-dairy-700 rounded-xl shadow-xs border border-gray-100">
                <Milk className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-gray-900">
                  {lang === 'sw' ? 'Ripoti ya Uzalishaji wa Maziwa' : 'Milk Production History (CSV)'}
                </h3>
                <span className="text-[11px] text-gray-500">
                  {milk.length} sessions (AM/PM yields, allocation breakdown)
                </span>
              </div>
            </div>
            <button
              onClick={() => DataExporter.exportMilkToCSV(milk)}
              className="px-3.5 py-1.5 bg-dairy-600 hover:bg-dairy-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>

          {/* Deliveries CSV */}
          <div className="p-4 bg-[#FAF9F5] hover:bg-white rounded-2xl border border-gray-200 transition-colors flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white text-[#345C4A] rounded-xl shadow-2xs border border-gray-200">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-gray-900">
                  {lang === 'sw' ? 'Leja ya Mauzo na Ushirika' : 'Deliveries & Sales Ledger (CSV)'}
                </h3>
                <span className="text-[11px] text-gray-500">
                  {deliveries.length} entries (Co-op deductions, balances)
                </span>
              </div>
            </div>
            <button
              onClick={() => DataExporter.exportDeliveriesToCSV(deliveries)}
              className="px-3.5 py-1.5 bg-[#345C4A] hover:bg-[#274537] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>

          {/* Expenses CSV */}
          <div className="p-4 bg-[#FAF9F5] hover:bg-white rounded-2xl border border-gray-200 transition-colors flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white text-[#26332D] rounded-xl shadow-2xs border border-gray-200">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-gray-900">
                  {lang === 'sw' ? 'Leja ya Gharama za Shamba' : 'Operating Expenses (CSV)'}
                </h3>
                <span className="text-[11px] text-gray-500">
                  {expenses.length} expense rows (Feed, vet, labor)
                </span>
              </div>
            </div>
            <button
              onClick={() => DataExporter.exportExpensesToCSV(expenses)}
              className="px-3.5 py-1.5 bg-[#345C4A] hover:bg-[#274537] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>

          {/* Herd CSV */}
          <div className="p-4 bg-[#FAF9F5] hover:bg-white rounded-2xl border border-gray-200 transition-colors flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white text-[#C6A76A] rounded-xl shadow-2xs border border-[#E5D5B5]">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-gray-900">
                  {lang === 'sw' ? 'Usajili wa Mifugo' : 'Cattle Herd Registry (CSV)'}
                </h3>
                <span className="text-[11px] text-gray-500">
                  {cows.length} cattle (Ear tags, breeds, parity)
                </span>
              </div>
            </div>
            <button
              onClick={() => DataExporter.exportHerdToCSV(cows)}
              className="px-3.5 py-1.5 bg-[#345C4A] hover:bg-[#274537] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>

          {/* Full Backup JSON */}
          <div className="p-4 bg-gradient-to-r from-dairy-900 to-dairy-800 text-white rounded-2xl flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/10 text-dairy-300 rounded-xl">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-xs">
                  {lang === 'sw' ? 'Chelezo Kamili ya Shamba' : 'Full Farm Database Backup'}
                </h3>
                <span className="text-[11px] text-dairy-200/80">
                  Complete offline snapshot (JSON)
                </span>
              </div>
            </div>
            <button
              onClick={() =>
                DataExporter.exportFullBackupJSON({
                  farm,
                  cows,
                  buyers,
                  milk,
                  deliveries,
                  payments,
                  health,
                  breeding,
                  expenses,
                })
              }
              className="px-3.5 py-1.5 bg-white text-dairy-900 hover:bg-dairy-50 rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors"
          >
            {lang === 'sw' ? 'Funga' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
