'use client';

import React, { useMemo } from 'react';
import { Scissors } from 'lucide-react';
import type { Buyer, CoopStatement, Delivery, Language, PaymentRecord } from '@/types';
import { addDays, farmToday, formatFarmDate } from '@/lib/dates';
import { formatKsh } from '@/lib/money';
import { AGE_BUCKETS, deductionsSummary, moneyOwedSummary, type AgeBucket } from '@/lib/money-owed';
import { OWED_COPY } from '@/lib/owed-copy';
import { canUse } from '@/lib/plans';
import { LockedFeature } from '@/components/billing/LockedFeature';

/** Bar colours from on time to very late: sage, then slip yellow deepening to rose. */
const BUCKET_COLOUR: Record<AgeBucket, string> = {
  notDue: 'bg-sage-300', late1to30: 'bg-gold-300', late31to60: 'bg-gold-500', late61to90: 'bg-rose-400', late90plus: 'bg-rose-700',
};

function AgeBar({ buckets, total, label }: { buckets: Record<AgeBucket, number>; total: number; label: string }) {
  if (total <= 0) return null;
  return (
    <div role="img" aria-label={label} className="flex h-2.5 w-full overflow-hidden rounded-full bg-ivory-muted">
      {AGE_BUCKETS.filter((b) => buckets[b] > 0).map((b) => (
        <span key={b} className={BUCKET_COLOUR[b]} style={{ width: `${(buckets[b] / total) * 100}%` }} />
      ))}
    </div>
  );
}

/**
 * Who owes the farm money and how late it is. Every plan sees each buyer's balance, since when it is unpaid and how
 * many days late; Farmer and up also see the lateness broken down and what co-ops deducted over the last year.
 */
export function MoneyOwedPanel({ buyers, deliveries, payments, statements, subscription, lang }: {
  buyers: Buyer[];
  deliveries: Delivery[];
  payments: PaymentRecord[];
  statements: CoopStatement[];
  subscription?: { plan: string; status?: string; renewsAt?: string } | null;
  lang: Language;
}) {
  const t = OWED_COPY[lang];
  const today = farmToday();
  const full = canUse(subscription, 'paymentAgeing');
  const summary = useMemo(() => moneyOwedSummary(buyers, deliveries, payments, statements, today), [buyers, deliveries, payments, statements, today]);
  const deductions = useMemo(() => deductionsSummary(statements, { from: addDays(today, -365), to: today }), [statements, today]);
  const ageLabel = (buckets: Record<AgeBucket, number>) => AGE_BUCKETS.filter((b) => buckets[b] > 0).map((b) => `${t.buckets[b]}: ${formatKsh(buckets[b])}`).join('; ');

  return (
    <div className="space-y-5">
      <section aria-labelledby="owed-heading" className="card overflow-hidden">
        <div className="space-y-3 border-b border-ivory-border p-5">
          <h2 id="owed-heading" className="font-display text-xl font-bold text-charcoal">{t.heading}</h2>
          {summary.buyers.length === 0 ? (
            <p className="text-charcoal-light">{t.nothingOwed}</p>
          ) : (
            <>
              <p className="text-lg text-charcoal">{t.totals(summary.owed, summary.overdue)}</p>
              {full && (
                <div className="space-y-2">
                  <AgeBar buckets={summary.buckets} total={summary.owed} label={ageLabel(summary.buckets)} />
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-charcoal-muted">
                    {AGE_BUCKETS.filter((b) => summary.buckets[b] > 0).map((b) => (
                      <li key={b} className="flex items-center gap-1.5">
                        <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${BUCKET_COLOUR[b]}`} />
                        {t.buckets[b]}: <strong className="font-bold text-charcoal">{formatKsh(summary.buckets[b])}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {summary.buyers.length > 0 && (
          <ul className="divide-y divide-ivory-border">
            {summary.buyers.map((row) => {
              const owed = row.unpaid.reduce((s, i) => s + i.amount, 0);
              return (
                <li key={row.buyerId} className="space-y-2 px-5 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="font-bold text-charcoal">{row.buyerName}</p>
                    <p className="whitespace-nowrap text-lg font-bold tabular-nums text-charcoal">{formatKsh(owed)}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
                    {row.oldestUnpaidDate && <span className="text-charcoal-muted">{t.oldest(formatFarmDate(row.oldestUnpaidDate, lang))}</span>}
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${row.mostDaysLate > 60 ? 'bg-rose-50 text-rose-800' : row.mostDaysLate > 0 ? 'bg-gold-100 text-gold-600' : 'bg-sage/10 text-sage'}`}>
                      {row.mostDaysLate > 0 ? t.late(row.mostDaysLate) : t.onTime}
                    </span>
                  </div>
                  {full && <AgeBar buckets={row.buckets} total={owed} label={ageLabel(row.buckets)} />}
                </li>
              );
            })}
          </ul>
        )}
        <p className="border-t border-ivory-border bg-ivory px-5 py-3 text-xs text-charcoal-muted">{t.dueRule}</p>
      </section>

      {full ? (
        <section aria-labelledby="deductions-heading" className="card space-y-4 p-5">
          <div>
            <h2 id="deductions-heading" className="flex items-center gap-2 font-display text-xl font-bold text-charcoal">
              <Scissors className="h-5 w-5 text-sage" aria-hidden="true" />{t.deductionsHeading}
            </h2>
            <p className="text-sm text-charcoal-muted">{t.deductionsPeriod}</p>
          </div>
          {deductions.lines.length === 0 ? (
            <p className="text-charcoal-light">{t.noDeductions}</p>
          ) : (
            <>
              <p className="text-charcoal">{t.deductionsTotal(deductions.deducted, deductions.percentOfGross, deductions.statementCount)}</p>
              <dl className="divide-y divide-ivory-border border-y border-ivory-border">
                {deductions.lines.map((line) => (
                  <div key={line.label} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2.5">
                    <dt className="font-semibold text-charcoal">{line.label}</dt>
                    <dd className="flex items-baseline gap-3 whitespace-nowrap">
                      <span className="text-xs text-charcoal-muted">{t.ofGross(line.percentOfGross)}</span>
                      <span className="font-bold tabular-nums">{formatKsh(line.amount)}</span>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="text-sm text-charcoal-muted">{t.ask}</p>
            </>
          )}
        </section>
      ) : (
        <LockedFeature feature="paymentAgeing" />
      )}
    </div>
  );
}
