'use client';

import React from 'react';
import { Check } from 'lucide-react';
import type { Language } from '@/types';
import { START_COPY } from '@/lib/start-copy';

export type StartStepId = 'milk' | 'cow' | 'buyer';

/** True when Home should show the three-step start instead of an empty "nothing needs your attention": no cows, no milk yet. */
export const isNewFarm = (input: { cows: number; milk: number; openReminders: number }) =>
  input.cows === 0 && input.milk === 0 && input.openReminders === 0;

/**
 * A brand-new farm has nothing to attend to, and "Nothing needs your attention today" tells it nothing. This shows
 * the three first things to do instead: record milk, add a cow, add a buyer. Milk comes first and needs no cow. A step
 * the person may not take (a worker cannot add a cow or a buyer) is left out; a step already done is ticked.
 */
export function FarmStart({ steps, lang }: {
  steps: { id: StartStepId; done: boolean; onStart: () => void }[];
  lang: Language;
}) {
  const t = START_COPY[lang];
  return (
    <section aria-labelledby="start-heading" className="space-y-3 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h2 id="start-heading" className="text-base font-bold text-gray-900">{t.heading}</h2>
        <p className="text-sm text-gray-600">{t.sub}</p>
      </div>
      <ol className="space-y-2">
        {steps.map((step, index) => {
          const copy = t.steps[step.id];
          return (
            <li key={step.id} className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-[#FAF9F5] p-3">
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${step.done ? 'bg-[#345C4A] text-white' : 'bg-white text-gray-700 ring-1 ring-gray-300'}`}>
                {step.done ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">{copy.title}</p>
                <p className="text-sm text-gray-600">{copy.hint}</p>
                {step.done
                  ? <p className="mt-2 text-sm font-semibold text-[#345C4A]">{t.done}</p>
                  : <button type="button" onClick={step.onStart} className="btn btn-primary mt-2">{copy.button}</button>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
