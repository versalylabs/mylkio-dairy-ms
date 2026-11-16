'use client';

import React, { useEffect, useState } from 'react';
import { Milk } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { formatFarmDate } from '@/lib/dates';
import { PRODUCED_COPY } from '@/lib/produced-copy';
import { MILK_USE_KINDS, cleanSplit, splitTotal, type MilkUseKind, type MilkUseSplit } from '@/lib/produced-sold';
import type { Language } from '@/types';

/**
 * Say where one day's unsold milk went: home use, calves, spoiled, other. Entirely optional: every field may stay
 * empty, a total larger than the unsold milk only gets a gentle note, and nothing here changes produced or sold.
 */
export function MilkUseModal({ open, date, produced, sold, notSold, current, lang, onSave, onClose }: {
  open: boolean;
  date: string;
  produced: number;
  sold: number;
  notSold: number;
  current: MilkUseSplit;
  lang: Language;
  onSave: (date: string, split: MilkUseSplit) => void;
  onClose: () => void;
}) {
  const t = PRODUCED_COPY[lang];
  const [values, setValues] = useState<Record<MilkUseKind, string>>({ homeUse: '', calves: '', spoiled: '', other: '' });

  // Start from what is already saved for this day each time the form opens.
  useEffect(() => {
    if (!open) return;
    setValues(Object.fromEntries(MILK_USE_KINDS.map((kind) => [kind, current[kind] > 0 ? String(current[kind]) : ''])) as Record<MilkUseKind, string>);
  }, [open, date, current]);

  const typed = cleanSplit(values);
  const total = splitTotal(typed);
  const left = Math.round((notSold - total) * 10) / 10;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(date, typed);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={t.modalTitle} subtitle={t.modalFor(formatFarmDate(date, lang))} icon={<Milk className="h-5 w-5" />}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-charcoal-light">{t.modalFacts(produced, sold, notSold)}</p>
        <div className="grid grid-cols-2 gap-3">
          {MILK_USE_KINDS.map((kind) => (
            <div key={kind}>
              <label className="field-label" htmlFor={`use-${kind}`}>{t.kinds[kind]}</label>
              <div className="relative">
                <input
                  id={`use-${kind}`}
                  className="field pr-14"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={values[kind]}
                  onChange={(e) => setValues({ ...values, [kind]: e.target.value.replace(/[^0-9.]/g, '') })}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-charcoal-muted">{t.litres}</span>
              </div>
            </div>
          ))}
        </div>
        <p role="status" className="text-sm font-medium text-charcoal-light">
          {left < 0 ? t.over(-left) : total === 0 ? '' : left === 0 ? t.allDone : t.left(left)}
        </p>
        <p className="text-xs text-charcoal-muted">{t.modalOptional}</p>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary">{t.save}</button>
          {MILK_USE_KINDS.some((kind) => current[kind] > 0) && (
            <button type="button" className="btn btn-ghost" onClick={() => { onSave(date, cleanSplit({})); onClose(); }}>{t.clear}</button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>{t.cancel}</button>
        </div>
      </form>
    </Dialog>
  );
}
