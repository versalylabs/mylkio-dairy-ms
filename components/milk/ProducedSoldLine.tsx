'use client';

import React from 'react';
import type { Language } from '@/types';
import { PRODUCED_COPY } from '@/lib/produced-copy';
import { MILK_USE_KINDS, type ProducedSold, type SplitSummary } from '@/lib/produced-sold';

const litres = (n: number) => `${n.toLocaleString('en-KE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`;

/**
 * "Produced 120 L · Sold 96 L · 24 L not sold". The not-sold figure is a button when the farmer may say where that
 * milk went (optional). If more was sold than recorded, a plain sentence replaces the figure, never a negative number.
 */
export function ProducedSoldLine({ figures, split, lang, isToday, onOpenSplit, className = '' }: {
  figures: ProducedSold;
  split?: SplitSummary;
  lang: Language;
  isToday: boolean;
  onOpenSplit?: () => void;
  className?: string;
}) {
  const t = PRODUCED_COPY[lang];
  if (figures.state === 'no_milk') {
    return <p className={`text-sm text-gray-600 ${className}`}>{t.noMilk}</p>;
  }
  const assigned = split && split.assigned > 0 ? MILK_USE_KINDS.filter((kind) => split.byKind[kind] > 0) : [];
  return (
    <div className={className}>
      <p className="text-sm text-gray-700">
        {t.produced} <strong className="font-bold tabular-nums text-gray-900">{litres(figures.produced)}</strong>
        <span aria-hidden="true"> · </span>
        {t.sold} <strong className="font-bold tabular-nums text-gray-900">{litres(figures.sold)}</strong>
        <span aria-hidden="true"> · </span>
        {figures.state === 'ok' && figures.notSold !== null ? (
          onOpenSplit ? (
            <button type="button" onClick={onOpenSplit} className="font-bold tabular-nums text-sage underline decoration-dotted underline-offset-4">{t.notSold(figures.notSold)}</button>
          ) : (
            <strong className="font-bold tabular-nums text-gray-900">{t.notSold(figures.notSold)}</strong>
          )
        ) : null}
      </p>
      {figures.state === 'sold_more' && (
        <p role="status" className="mt-1 text-sm font-medium text-amber-900">{isToday ? t.soldMoreToday : t.soldMorePeriod}</p>
      )}
      {figures.state === 'ok' && assigned.length > 0 && split && (
        <p className="mt-1 text-xs text-gray-600">
          {assigned.map((kind) => `${t.kinds[kind]} ${litres(split.byKind[kind])}`).join(' · ')}
          {split.unassigned > 0 ? ` · ${t.unassigned(split.unassigned)}` : ''}
        </p>
      )}
    </div>
  );
}
