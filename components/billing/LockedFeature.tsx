'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import type { FeatureId } from '@/lib/plans';
import { PLAN_TEXT, lockedLine } from '@/lib/plan-copy';
import { useLanguage } from '@/lib/use-language';

/** The app listens for this and opens Settings, where the plan and how to change it are. */
export const OPEN_SETTINGS_EVENT = 'mylkio_open_settings';

/**
 * The one calm line shown where a feature the farm's plan does not include would appear, naming the plan that has it
 * ("Cost per litre is part of the Farmer plan.") with a link to Settings. No pop-up and no repeated nudge: it sits
 * quietly where the feature would be. Anything else worth saying (for example "the emergency guide is free on every
 * plan") goes in as children.
 */
export function LockedFeature({ feature, children }: { feature: FeatureId; children?: React.ReactNode }) {
  const [lang] = useLanguage();
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-ivory-border bg-ivory p-4 text-base text-charcoal-light">
      <Lock className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" aria-hidden="true" />
      <p>
        <strong className="font-semibold text-charcoal">{lockedLine(feature, lang)}</strong>{' '}
        {children}{children ? ' ' : ''}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))}
          className="font-semibold text-sage underline underline-offset-2"
        >
          {PLAN_TEXT[lang].seePlans}
        </button>
      </p>
    </div>
  );
}
