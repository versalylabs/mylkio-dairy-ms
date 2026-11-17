'use client';

import React from 'react';
import { ArrowDown, ArrowUp, Minus, Sparkles } from 'lucide-react';
import type { Language } from '@/types';
import { DROP_COPY } from '@/lib/drop-copy';
import type { CowRank, RankTrend } from '@/lib/milk-drop';

const ICON: Record<RankTrend, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = { up: ArrowUp, down: ArrowDown, level: Minus, new: Sparkles };
// No alarm colours: a cow doing less is information, not an emergency.
const TONE: Record<RankTrend, string> = { up: 'text-sage', down: 'text-amber-800', level: 'text-gray-500', new: 'text-gray-500' };

/** "Your cows this week": each lactating cow with her average a day, highest first, and an up, down or level mark. */
export function CowRanking({ rows, lang }: { rows: CowRank[]; lang: Language }) {
  const t = DROP_COPY[lang];
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="cow-ranking-heading" className="card space-y-3 p-4 sm:p-5">
      <div>
        <h2 id="cow-ranking-heading" className="text-base font-bold text-gray-900">{t.heading}</h2>
        <p className="text-sm text-gray-600">{t.sub}</p>
      </div>
      <ol className="divide-y divide-gray-100">
        {rows.map((row, index) => {
          const Icon = ICON[row.trend];
          return (
            <li key={row.cowId} className="flex items-center justify-between gap-3 py-2.5">
              <span className="flex min-w-0 items-center gap-3">
                <span className="w-5 shrink-0 text-sm font-semibold tabular-nums text-gray-500">{index + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-gray-900">{row.cowName ?? row.cowTag}</span>
                  {row.cowName && <span className="block text-xs text-gray-500">{row.cowTag}</span>}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-bold tabular-nums text-gray-900">{row.average.toFixed(1)} L <span className="font-normal text-gray-500">{t.perDay}</span></span>
                <span className={`inline-flex items-center ${TONE[row.trend]}`} title={t.trend[row.trend]}>
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="sr-only">{t.trend[row.trend]}</span>
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
