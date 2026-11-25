'use client';

import React, { useState } from 'react';
import { Wheat } from 'lucide-react';
import type { Delivery, ExpenseRecord, Language, MilkEntry } from '@/types';
import { farmToday, monthRange, previousMonthRange } from '@/lib/dates';
import { feedCost } from '@/lib/feed-cost';
import { FEED_COPY } from '@/lib/feed-copy';
import { formatKsh } from '@/lib/money';
import { canUse } from '@/lib/plans';
import { LockedFeature } from '@/components/billing/LockedFeature';

/**
 * "Feed cost you about KSh 24 for every litre of milk. After feed, each litre left you about KSh 26." With the month
 * before for comparison and where the feed money went. On a plan without it, one calm line says which plan has it.
 */
export function FeedCostCard({ milk, deliveries, expenses, subscription, lang }: {
  milk: MilkEntry[];
  deliveries: Delivery[];
  expenses: ExpenseRecord[];
  subscription?: { plan: string; status?: string; renewsAt?: string } | null;
  lang: Language;
}) {
  const t = FEED_COPY[lang];
  const today = farmToday();
  const [period, setPeriod] = useState<'this_month' | 'last_month'>(() =>
    feedCost(milk, deliveries, expenses, monthRange(today)).state === 'ready' ? 'this_month' : 'last_month');
  if (!canUse(subscription, 'feedCost')) return <LockedFeature feature="feedCost" />;

  const range = period === 'this_month' ? monthRange(today) : previousMonthRange(today);
  const figures = feedCost(milk, deliveries, expenses, range);
  const before = feedCost(milk, deliveries, expenses, previousMonthRange(range.from));
  const diff = figures.feedPerLitre !== null && before.feedPerLitre !== null ? figures.feedPerLitre - before.feedPerLitre : null;
  const anyUnitPrice = figures.lines.some((l) => l.unitPrice);

  return (
    <section aria-labelledby="feed-cost-heading" className="card space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="feed-cost-heading" className="flex items-center gap-2 text-base font-bold text-charcoal">
          <Wheat className="h-4 w-4 text-sage" aria-hidden="true" />{t.heading}
        </h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.heading}>
          {([['this_month', t.periods.thisMonth], ['last_month', t.periods.lastMonth]] as const).map(([key, label]) => (
            <button key={key} type="button" aria-pressed={period === key} onClick={() => setPeriod(key)}
              className={`chip-btn ${period === key ? '!border-sage !bg-sage !text-white' : ''}`}>{label}</button>
          ))}
        </div>
      </div>

      {figures.state === 'ready' && figures.feedPerLitre !== null ? (
        <div className="space-y-4">
          <div className="space-y-1.5 text-base text-charcoal">
            <p>{t.perLitre(figures.feedPerLitre)}{' '}{diff !== null && <span className="text-charcoal-muted">{diff === 0 ? t.same : t.change(diff)}</span>}</p>
            <p className={figures.marginPerLitre !== null && figures.marginPerLitre < 0 ? 'rounded-xl bg-rose-50 p-3 text-rose-900' : ''}>
              {figures.marginPerLitre !== null && figures.marginOverFeed !== null ? t.margin(figures.marginPerLitre, figures.marginOverFeed) : t.noPrice}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-charcoal">{t.whereHeading}</h3>
            <dl className="mt-2 divide-y divide-ivory-border border-y border-ivory-border">
              {figures.lines.map((line) => (
                <div key={line.type} className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 py-2.5">
                  <dt className="font-semibold text-charcoal">{t.types[line.type]}</dt>
                  <dd className="whitespace-nowrap font-bold tabular-nums">{formatKsh(line.amount)}</dd>
                  <div className="col-span-2 mt-1.5 flex items-center gap-3">
                    <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-ivory-muted">
                      <span className="block h-full rounded-full bg-sage" style={{ width: `${line.share}%` }} />
                    </span>
                    <span className="whitespace-nowrap text-xs text-charcoal-muted">
                      {line.share}%{line.unitPrice ? `, ${t.unitPrice(line.unitPrice.price, line.unitPrice.unit)}` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </dl>
          </div>
          {!anyUnitPrice && <p className="text-sm text-charcoal-muted">{t.tip}</p>}
          <p className="text-xs text-charcoal-muted">{t.note}</p>
        </div>
      ) : (
        <p className="text-sm text-charcoal-light">{t.notEnough}</p>
      )}
    </section>
  );
}
