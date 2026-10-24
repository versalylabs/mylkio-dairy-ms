'use client';

import React from 'react';
import { Language } from '@/types';
import { Milk, Sparkles, ArrowRight } from 'lucide-react';

interface MilkPlaceholderProps {
  lang: Language;
  onNavigateHerd: () => void;
}

export const MilkPlaceholder: React.FC<MilkPlaceholderProps> = ({
  lang,
  onNavigateHerd,
}) => {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 text-center pb-24 md:pb-12">
      <div className="w-16 h-16 bg-dairy-100 text-dairy-700 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-inner">
        <Milk className="w-8 h-8" />
      </div>

      <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-dairy-50 text-dairy-800 rounded-full text-xs font-semibold mb-3 border border-dairy-200">
        <Sparkles className="w-3.5 h-3.5 text-dairy-600" />
        <span>{lang === 'sw' ? 'Awamu ya 2: Kurekodi Maziwa' : 'Phase 2 Preview: Daily Operations'}</span>
      </div>

      <h1 className="text-2xl font-black text-slate-900 tracking-tight">
        {lang === 'sw' ? 'Kurekodi Maziwa na Malipo ya Ushirika' : 'Daily Milk Production & Cooperative Sales'}
      </h1>

      <p className="text-slate-600 text-sm mt-3 leading-relaxed">
        {lang === 'sw'
          ? 'Awamu ya 1 (Msingi: Usajili wa Mifugo na Wanunuzi) imekamilika! Kurekodi maziwa ya shamba (Farm-total) na kwa ng\'ombe mmoja mmoja (Cow-level), pamoja na leja za ushirika na wateja wa nyumbani vitaratibiwa katika Awamu ya 2.'
          : 'Phase 1 (Foundation: Farm setup, Herd registry & Buyer registry) is complete! Fast farm-total and cow-level milk entry, AM/PM sessions, cooperative deliveries, and household customer ledger will be implemented in Phase 2.'}
      </p>

      <div className="mt-8 p-5 bg-white rounded-2xl border border-slate-200 text-left shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {lang === 'sw' ? 'Vipengele vitakavyojumuishwa kwenye Awamu ya 2:' : 'Upcoming in Phase 2 (Core Daily Operations):'}
        </h3>
        <ul className="text-xs text-slate-700 space-y-2">
          <li className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-dairy-500"></span>
            <span><strong>Log total farm milk</strong> by default in under 30 seconds</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-dairy-500"></span>
            <span>Optional <strong>per-cow logging toggle</strong> without double counting</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-dairy-500"></span>
            <span><strong>Cooperative deliveries ledger</strong> (accepted litres, rates, transport/feed adjustments)</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-dairy-500"></span>
            <span><strong>Household customer bills</strong> & payment receipts (Cash, M-Pesa ref)</span>
          </li>
        </ul>
      </div>

      <button
        onClick={onNavigateHerd}
        className="mt-6 inline-flex items-center space-x-2 px-5 py-2.5 bg-dairy-600 hover:bg-dairy-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
      >
        <span>{lang === 'sw' ? 'Tazama na Ongeza Ng\'ombe Wako' : 'Explore Herd Registry'}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
