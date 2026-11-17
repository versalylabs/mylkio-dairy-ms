'use client';

import React, { useState } from 'react';
import { Scale } from 'lucide-react';
import type { Delivery, ExpenseRecord, Language, MilkEntry } from '@/types';
import { farmToday, monthRange, previousMonthRange } from '@/lib/dates';
import { costPerLitre } from '@/lib/cost-per-litre';
import { COST_COPY } from '@/lib/cost-copy';
import { canUse } from '@/lib/plans';
import { LockedFeature } from '@/components/billing/LockedFeature';

/**
 * "Milk cost you about KSh 38 per litre to produce. Buyers paid you about KSh 52 per litre. Feed was 61% of your
 * costs." For this month or last month only. On a plan without it, one calm line says which plan has it.
 */
export function CostPerLitreCard({ milk, deliveries, expenses, subscription, lang }: {
  milk: MilkEntry[];
  deliveries: Delivery[];
  expenses: ExpenseRecord[];
  subscription?: { plan: string; status?: string; renewsAt?: string } | null;
  lang: Language;
}) {
  const t = COST_COPY[lang];
  // Start on this month once it has enough to show, otherwise on last month (the last complete one).
  const [period, setPeriod] = useState<'this_month' | 'last_month'>(() =>
    costPerLitre(milk, deliveries, expenses, monthRange(farmToday())).state === 'ready' ? 'this_month' : 'last_month');
  if (!canUse(subscription, 'costPerLitre')) return <LockedFeature feature="costPerLitre" />;

  const today = farmToday();
  const range = period === 'this_month' ? monthRange(today) : previousMonthRange(today);
  const figures = costPerLitre(milk, deliveries, expenses, range);

  return (
    <section aria-labelledby="cost-per-litre-heading" className="card space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="cost-per-litre-heading" className="flex items-center gap-2 text-base font-bold text-gray-900">
          <Scale className="h-4 w-4 text-sage" aria-hidden="true" />{t.heading}
        </h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.heading}>
          {([['this_month', t.periods.thisMonth], ['last_month', t.periods.lastMonth]] as const).map(([key, label]) => (
            <button key={key} type="button" aria-pressed={period === key} onClick={() => setPeriod(key)}
              className={`chip-btn ${period === key ? '!border-sage !bg-sage !text-white' : ''}`}>{label}</button>
          ))}
        </div>
      </div>

      {figures.state === 'ready' && figures.costPerLitre !== null ? (
        <div className="space-y-1.5 text-base text-gray-800">
          <p>{t.cost(figures.costPerLitre)}</p>
          {figures.pricePerLitre !== null && <p>{t.price(figures.pricePerLitre)}</p>}
          {figures.feedSharePercent !== null && <p>{t.feed(figures.feedSharePercent)}</p>}
          {figures.costHigherThanPrice && <p className="rounded-xl bg-ivory p-3 text-sm text-charcoal-light">{t.higher(figures.costAbovePrice)}</p>}
          <p className="pt-1 text-xs text-gray-500">{t.note}</p>
        </div>
      ) : (
        <p className="text-sm text-gray-600">{t.notEnough}</p>
      )}
    </section>
  );
}
