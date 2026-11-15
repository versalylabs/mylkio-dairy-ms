'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronDown, Info, PhoneCall, ShieldAlert, Stethoscope } from 'lucide-react';
import {
  CALL_A_VET_NOW,
  REPORTING_NOTE,
  RED_FLAGS,
  SIGNS,
  overallUrgency,
  screenRedFlags,
  type Sign,
} from '@/lib/vet/red-flags';
import { ALWAYS_ASK_YOUR_VET, SEASONS, SEASON_NOTE, seasonForDate } from '@/lib/vet/seasonal';
import { draftContentAllowed, visibleEntries } from '@/lib/vet/review';

interface VetGuideProps {
  /** The farm's date, YYYY-MM-DD (Nairobi). */
  today: string;
}

const URGENCY_STYLE = {
  emergency: { label: 'Emergency: act now', box: 'border-rose-300 bg-rose-50', chip: 'bg-rose-600 text-white' },
  today: { label: 'See a vet today', box: 'border-amber-300 bg-amber-50', chip: 'bg-amber-500 text-charcoal' },
} as const;

/**
 * The vet guide on the Herd screen: the emergency-signs checker and this season's risks. Both are plain
 * code and work without a connection. Anything not yet approved by a veterinarian is hidden on live farms
 * and shown with a draft banner on previews (lib/vet/review.ts).
 */
export function VetGuide({ today }: VetGuideProps) {
  const [ticked, setTicked] = useState<string[]>([]);
  const showDrafts = draftContentAllowed();

  const flags = useMemo(() => visibleEntries(RED_FLAGS), []);
  const signs = useMemo(() => {
    const used = new Set(flags.flatMap((flag) => flag.triggers.flat()));
    return SIGNS.filter((sign) => used.has(sign.id));
  }, [flags]);
  const groups = useMemo(() => {
    const map = new Map<Sign['group'], Sign[]>();
    signs.forEach((sign) => map.set(sign.group, [...(map.get(sign.group) ?? []), sign]));
    return [...map.entries()];
  }, [signs]);

  const matches = useMemo(() => screenRedFlags(ticked, flags), [ticked, flags]);
  const urgency = overallUrgency(matches);

  const season = useMemo(() => {
    const current = seasonForDate(today);
    return visibleEntries(SEASONS).find((s) => s.id === current.id) ?? null;
  }, [today]);

  const hasDraft = showDrafts && (flags.some((f) => f.review.status === 'draft') || season?.review.status === 'draft');
  const toggle = (id: string) => setTicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  return (
    <div className="space-y-6">
      {hasDraft && (
        <div role="note" className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 p-4 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p><strong>Draft, for review only.</strong> This guide has not yet been approved by a veterinarian, so it is hidden from farmers. It is shown here so the wording can be checked.</p>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-2xl bg-rose-600 p-4 text-white shadow-soft">
        <PhoneCall className="mt-0.5 h-6 w-6 shrink-0" />
        <p className="text-base font-semibold">{CALL_A_VET_NOW}</p>
      </div>

      {/* Emergency signs */}
      <section aria-labelledby="signs-heading" className="card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="icon-tile"><ShieldAlert className="h-6 w-6" /></span>
          <div>
            <h2 id="signs-heading" className="font-display text-2xl font-medium text-charcoal">Is it an emergency?</h2>
            <p className="mt-1 text-base text-charcoal-light">Tick every sign you can see on the animal. This guide tells you what to do first and when to call a vet. It does not tell you what disease it is.</p>
          </div>
        </div>

        {signs.length === 0 ? (
          <p className="mt-5 rounded-xl border border-ivory-border bg-ivory p-4 text-base text-charcoal-light">
            The emergency guide is being checked by a veterinarian and will appear here once it is approved. Until then, if an animal looks very sick, call your nearest vet or sub-county veterinary officer.
          </p>
        ) : (
          <>
            <div className="mt-5 space-y-5">
              {groups.map(([group, items]) => (
                <fieldset key={group}>
                  <legend className="mb-2 text-sm font-semibold uppercase tracking-wider text-charcoal-muted">{group}</legend>
                  <div className="space-y-2">
                    {items.map((sign) => {
                      const checked = ticked.includes(sign.id);
                      return (
                        <label key={sign.id} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-base transition-colors ${checked ? 'border-sage bg-sage/10' : 'border-ivory-border bg-white hover:border-sage-300'}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggle(sign.id)} className="h-5 w-5 shrink-0 accent-[#345C4A]" />
                          <span>{sign.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>

            {ticked.length > 0 && (
              <button type="button" onClick={() => setTicked([])} className="btn btn-secondary mt-4">Clear all</button>
            )}

            <div aria-live="polite" className="mt-6 space-y-4">
              {ticked.length === 0 && (
                <p className="flex items-start gap-2 text-base text-charcoal-muted"><Info className="mt-0.5 h-5 w-5 shrink-0" />Guidance appears here as you tick signs.</p>
              )}

              {ticked.length > 0 && matches.length === 0 && (
                <div className="rounded-2xl border border-ivory-border bg-ivory p-4 text-base text-charcoal">
                  <p className="font-semibold">Nothing you ticked matches an emergency sign in this guide.</p>
                  <p className="mt-1 text-charcoal-light">That does <strong>not</strong> mean the animal is well. This guide only covers some serious signs. If you are worried, call a vet.</p>
                </div>
              )}

              {urgency && (
                <p className={`rounded-xl px-4 py-2.5 text-base font-bold ${URGENCY_STYLE[urgency].chip}`}>{URGENCY_STYLE[urgency].label}</p>
              )}

              {matches.map((flag) => (
                <article key={flag.id} className={`rounded-2xl border-2 p-5 ${URGENCY_STYLE[flag.urgency].box}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${URGENCY_STYLE[flag.urgency].chip}`}>{URGENCY_STYLE[flag.urgency].label}</span>
                    {flag.notifiable && <span className="rounded-full bg-charcoal px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white">Must be reported</span>}
                    {flag.humanRisk && <span className="rounded-full bg-rose-800 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white">Danger to people</span>}
                    {flag.review.status === 'draft' && <span className="rounded-full border border-amber-500 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-900">Draft</span>}
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-charcoal">{flag.title}</h3>
                  <p className="mt-1 text-base text-charcoal-light">{flag.why}</p>

                  <h4 className="mt-4 text-sm font-bold uppercase tracking-wider text-sage">Do now</h4>
                  <ul className="mt-1.5 space-y-1.5">
                    {flag.doNow.map((line) => (
                      <li key={line} className="flex items-start gap-2 text-base text-charcoal"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-sage" />{line}</li>
                    ))}
                  </ul>

                  <h4 className="mt-4 text-sm font-bold uppercase tracking-wider text-rose-800">Do not</h4>
                  <ul className="mt-1.5 space-y-1.5">
                    {flag.doNot.map((line) => (
                      <li key={line} className="flex items-start gap-2 text-base text-charcoal"><span aria-hidden className="mt-0.5 shrink-0 font-bold text-rose-700">✕</span>{line}</li>
                    ))}
                  </ul>

                  {flag.notifiable && <p className="mt-4 rounded-xl bg-white/70 p-3 text-sm text-charcoal">{REPORTING_NOTE}</p>}
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* This season */}
      {season && (
        <section aria-labelledby="season-heading" className="card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="icon-tile icon-tile-gold"><CalendarDays className="h-6 w-6" /></span>
            <div>
              <h2 id="season-heading" className="font-display text-2xl font-medium text-charcoal">Watch for this season</h2>
              <p className="mt-1 text-base text-charcoal-light"><strong>{season.name}.</strong> {season.summary}</p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {season.risks.map((risk) => (
              <details key={risk.title} className="group rounded-xl border border-ivory-border bg-white">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base font-semibold text-charcoal">
                  <span>{risk.title}</span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-sage transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-3 border-t border-ivory-border px-4 pb-4 pt-3">
                  <p className="text-base text-charcoal-light">{risk.why}</p>
                  <ul className="space-y-1.5">
                    {risk.prevention.map((line) => (
                      <li key={line} className="flex items-start gap-2 text-base text-charcoal"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-sage" />{line}</li>
                    ))}
                  </ul>
                </div>
              </details>
            ))}
          </div>

          <p className="mt-4 text-sm text-charcoal-muted">{SEASON_NOTE}</p>
          <p className="mt-2 flex items-start gap-2 text-sm text-charcoal-muted"><Stethoscope className="mt-0.5 h-4 w-4 shrink-0" />{ALWAYS_ASK_YOUR_VET}</p>
        </section>
      )}

      <p className="flex items-start gap-2 rounded-xl border border-ivory-border bg-white p-4 text-sm text-charcoal-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>This is guidance only. It is not a diagnosis and does not replace a vet. When in doubt, call a vet.</span>
      </p>
    </div>
  );
}
