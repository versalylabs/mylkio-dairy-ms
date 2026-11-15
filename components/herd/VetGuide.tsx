'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, Camera, CalendarDays, CheckCircle2, ChevronDown, ExternalLink, Info, Lock, PhoneCall, Send, ShieldAlert, Stethoscope, X,
} from 'lucide-react';
import type { Cow } from '@/types';
import {
  CALL_A_VET_NOW, REPORTING_NOTE, RED_FLAGS, SIGNS, type RedFlag, type Sign, type Urgency,
} from '@/lib/vet/red-flags';
import { CONDITIONS } from '@/lib/vet/conditions';
import {
  FIT_LABEL, URGENCY_PHRASE, assess, summaryText, type Calved, type AnimalKind, type ConditionMatch,
} from '@/lib/vet/checker';
import { ALWAYS_ASK_YOUR_VET, SEASONS, SEASON_NOTE, seasonForDate } from '@/lib/vet/seasonal';
import { draftContentAllowed, visibleEntries } from '@/lib/vet/review';
import { DISCLAIMER_FULL, DISCLAIMER_SHORT } from '@/lib/vet/disclaimer';
import { KVB_REGISTERS_NOTE, KVB_REGISTERS_URL, contactsFor } from '@/lib/vet/contacts';
import { canUse } from '@/lib/plans';

interface VetGuideProps {
  /** The farm's date, YYYY-MM-DD (Nairobi). */
  today: string;
  subscription?: { plan: string; status?: string } | null;
  county?: string;
  farmName?: string;
  cows?: Cow[];
}

const URGENCY_STYLE: Record<Urgency, { box: string; chip: string }> = {
  emergency: { box: 'border-rose-300 bg-rose-50', chip: 'bg-rose-600 text-white' },
  today: { box: 'border-amber-300 bg-amber-50', chip: 'bg-amber-500 text-charcoal' },
  soon: { box: 'border-sky-300 bg-sky-50', chip: 'bg-sky-600 text-white' },
};

const CALF_HIDES: Sign['group'][] = ['Udder and milk', 'Calving'];
const ADULT_HIDES: Sign['group'][] = ['Calves'];

const signLabel = (id: string) => SIGNS.find((sign) => sign.id === id)?.label ?? id;

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${className}`}>{children}</span>;
}

function List({ items, mark }: { items: string[]; mark: 'tick' | 'cross' | 'dot' }) {
  return (
    <ul className="mt-1.5 space-y-1.5">
      {items.map((line) => (
        <li key={line} className="flex items-start gap-2 text-base text-charcoal">
          {mark === 'tick' && <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-sage" />}
          {mark === 'cross' && <span aria-hidden className="mt-0.5 shrink-0 font-bold text-rose-700">✕</span>}
          {mark === 'dot' && <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-charcoal-muted" />}
          {line}
        </li>
      ))}
    </ul>
  );
}

function FlagCard({ flag }: { flag: RedFlag }) {
  return (
    <article className={`rounded-2xl border-2 p-5 ${URGENCY_STYLE[flag.urgency].box}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Chip className={URGENCY_STYLE[flag.urgency].chip}>{URGENCY_PHRASE[flag.urgency]}</Chip>
        {flag.notifiable && <Chip className="bg-charcoal text-white">Must be reported</Chip>}
        {flag.humanRisk && <Chip className="bg-rose-800 text-white">Danger to people</Chip>}
        {flag.review.status === 'draft' && <Chip className="border border-amber-500 text-amber-900">Draft</Chip>}
      </div>
      <h3 className="mt-3 text-xl font-semibold text-charcoal">{flag.title}</h3>
      <p className="mt-1 text-base text-charcoal-light">{flag.why}</p>
      <h4 className="mt-4 text-sm font-bold uppercase tracking-wider text-sage">Do now</h4>
      <List items={flag.doNow} mark="tick" />
      <h4 className="mt-4 text-sm font-bold uppercase tracking-wider text-rose-800">Do not</h4>
      <List items={flag.doNot} mark="cross" />
    </article>
  );
}

function ConditionCard({ match }: { match: ConditionMatch }) {
  const c = match.condition;
  return (
    <article className="rounded-2xl border border-ivory-border bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center gap-2">
        <Chip className={match.fit === 'close' ? 'bg-sage text-white' : 'bg-ivory-muted text-charcoal'}>{FIT_LABEL[match.fit]}</Chip>
        <Chip className={URGENCY_STYLE[c.urgency].chip}>{URGENCY_PHRASE[c.urgency]}</Chip>
        {c.notifiable && <Chip className="bg-charcoal text-white">Must be reported</Chip>}
        {c.humanRisk && <Chip className="bg-rose-800 text-white">Danger to people</Chip>}
        {c.review.status === 'draft' && <Chip className="border border-amber-500 text-amber-900">Draft</Chip>}
      </div>
      <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-charcoal-muted">Could be</p>
      <h3 className="text-xl font-semibold text-charcoal">{c.name}</h3>
      <p className="mt-1 text-base text-charcoal-light">{c.summary}</p>

      <p className="mt-3 text-sm text-charcoal-muted"><strong className="text-charcoal">Why it fits:</strong> {match.matchedSigns.map(signLabel).join('; ')}.</p>
      {c.lookAlikes && <p className="mt-2 text-sm text-charcoal-muted"><strong className="text-charcoal">Can look like:</strong> {c.lookAlikes}</p>}

      <h4 className="mt-4 text-sm font-bold uppercase tracking-wider text-sage">Do now</h4>
      <List items={c.doNow} mark="tick" />
      <h4 className="mt-4 text-sm font-bold uppercase tracking-wider text-rose-800">Do not</h4>
      <List items={c.doNot} mark="cross" />
      <h4 className="mt-4 text-sm font-bold uppercase tracking-wider text-charcoal-muted">Tell the vet</h4>
      <List items={c.tellTheVet} mark="dot" />

      <details className="group mt-4 rounded-xl border border-ivory-border bg-ivory">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2 text-sm font-semibold text-charcoal">
          <span>Where this comes from</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-sage transition-transform group-open:rotate-180" />
        </summary>
        <ul className="space-y-2 border-t border-ivory-border px-3.5 pb-3 pt-2.5">
          {c.sources.map((source) => (
            <li key={source.url} className="text-sm text-charcoal-light">
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1.5 font-medium text-sage underline">
                {source.title}<ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              </a>
              <span className="block text-charcoal-muted">{source.publisher}, read {source.checkedOn}</span>
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}

/**
 * The vet guide on the Herd screen: a symptom checker (emergency signs first, then what the signs could fit),
 * who to call, and this season's risks. All of it is plain code from sourced content and works without a
 * connection. Anything not yet approved by a veterinarian is hidden on live farms and shown with a draft
 * banner on previews (lib/vet/review.ts). A photo is optional and never leaves the phone unless the farmer
 * shares it.
 */
export function VetGuide({ today, subscription, county, farmName, cows = [] }: VetGuideProps) {
  const [animal, setAnimal] = useState<AnimalKind>('adult');
  const [calved, setCalved] = useState<Calved>('no');
  const [cowId, setCowId] = useState('');
  const [ticked, setTicked] = useState<string[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [shareNote, setShareNote] = useState('');
  const resultsRef = useRef<HTMLDivElement>(null);

  const showDrafts = draftContentAllowed();
  const fullChecker = canUse(subscription, 'healthChecker');

  const flags = useMemo(() => visibleEntries(RED_FLAGS), []);
  const conditions = useMemo(() => visibleEntries(CONDITIONS), []);

  const shownSigns = useMemo(() => {
    const used = new Set([
      ...flags.flatMap((flag) => flag.triggers.flat()),
      ...(fullChecker ? conditions.flatMap((c) => Object.keys(c.signs)) : []),
    ]);
    const hidden = animal === 'calf' ? CALF_HIDES : ADULT_HIDES;
    return SIGNS.filter((sign) => used.has(sign.id) && !hidden.includes(sign.group));
  }, [flags, conditions, fullChecker, animal]);

  const groups = useMemo(() => {
    const map = new Map<Sign['group'], Sign[]>();
    shownSigns.forEach((sign) => map.set(sign.group, [...(map.get(sign.group) ?? []), sign]));
    return [...map.entries()];
  }, [shownSigns]);

  // Only signs that are on screen count, so switching between a cow and a calf cannot leave hidden ticks behind.
  const activeSigns = useMemo(() => ticked.filter((id) => shownSigns.some((s) => s.id === id)), [ticked, shownSigns]);
  const result = useMemo(
    () => assess({ signs: activeSigns, animal, calved: animal === 'calf' ? 'no' : calved }, { flags, conditions: fullChecker ? conditions : [] }),
    [activeSigns, animal, calved, flags, conditions, fullChecker],
  );

  const season = useMemo(() => {
    const current = seasonForDate(today);
    return visibleEntries(SEASONS).find((s) => s.id === current.id) ?? null;
  }, [today]);

  useEffect(() => {
    if (!photo) { setPhotoUrl(null); return; }
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const hasDraft = showDrafts && (flags.some((f) => f.review.status === 'draft') || conditions.some((c) => c.review.status === 'draft') || season?.review.status === 'draft');
  const toggle = (id: string) => setTicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  const reportable = result.redFlags.some((f) => f.notifiable) || result.conditions.some((m) => m.condition.notifiable);
  const contacts = contactsFor(county);
  const cow = cows.find((c) => c.id === cowId);
  const cowLabel = cow ? `${cow.tag}${cow.name ? ` ${cow.name}` : ''}` : undefined;
  const hasResult = activeSigns.length > 0;
  const guideIsEmpty = flags.length === 0;

  const text = () => summaryText({ input: { signs: activeSigns, animal, calved: animal === 'calf' ? 'no' : calved }, assessment: result, farmName, cowLabel, date: today });

  async function share() {
    const message = text();
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    try {
      if (photo && nav.canShare?.({ files: [photo] })) { await nav.share({ files: [photo], text: message, title: 'Mylkio health check' }); setShareNote('Shared.'); return; }
      if (nav.share) { await nav.share({ text: message, title: 'Mylkio health check' }); setShareNote(photo ? 'Shared the summary. Your phone could not attach the photo: send it to the vet yourself.' : 'Shared.'); return; }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    setShareNote(photo ? 'Opened WhatsApp with the summary. Add the photo yourself.' : 'Opened WhatsApp with the summary.');
  }

  async function copy() {
    try { await navigator.clipboard.writeText(text()); setShareNote('Summary copied.'); } catch { setShareNote('Could not copy. Use the send button instead.'); }
  }

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

      <section aria-labelledby="check-heading" className="card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="icon-tile"><Stethoscope className="h-6 w-6" /></span>
          <div>
            <h2 id="check-heading" className="font-display text-2xl font-medium text-charcoal">Check an animal</h2>
            <p className="mt-1 text-base text-charcoal-light">Tell us what you can see. The guide tells you what to do first, when to call a vet, and what the signs could fit. It does not tell you what disease the animal has.</p>
          </div>
        </div>

        {guideIsEmpty ? (
          <p className="mt-5 rounded-xl border border-ivory-border bg-ivory p-4 text-base text-charcoal-light">
            The health guide is being checked by a veterinarian and will appear here once it is approved. Until then, if an animal looks very sick, call your nearest vet or sub-county veterinary officer.
          </p>
        ) : (
          <>
            {/* About the animal */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <fieldset>
                <legend className="field-label">What is it?</legend>
                <div className="grid grid-cols-2 gap-2">
                  {([['adult', 'A cow or bull'], ['calf', 'A calf']] as const).map(([value, label]) => (
                    <button key={value} type="button" aria-pressed={animal === value} onClick={() => setAnimal(value)}
                      className={`min-h-11 rounded-xl border px-3 text-base font-semibold transition-colors ${animal === value ? 'border-sage bg-sage/10 text-sage' : 'border-ivory-border bg-white text-charcoal hover:border-sage-300'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              {animal === 'adult' && (
                <div>
                  <label htmlFor="vg-calved" className="field-label">Has she calved recently?</label>
                  <select id="vg-calved" value={calved} onChange={(e) => setCalved(e.target.value as Calved)} className="field">
                    <option value="no">No</option>
                    <option value="within_3_days">Yes, in the last 3 days</option>
                    <option value="within_2_weeks">Yes, in the last 2 weeks</option>
                  </select>
                </div>
              )}
              {cows.length > 0 && (
                <div className="sm:col-span-2">
                  <label htmlFor="vg-cow" className="field-label">Which animal? (optional)</label>
                  <select id="vg-cow" value={cowId} onChange={(e) => setCowId(e.target.value)} className="field">
                    <option value="">Not in my list</option>
                    {cows.filter((c) => c.status !== 'sold').map((c) => <option key={c.id} value={c.id}>{c.tag}{c.name ? ` ${c.name}` : ''}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Optional photo */}
            <div className="mt-5 rounded-2xl border border-ivory-border bg-ivory p-4">
              <p className="flex items-center gap-2 text-base font-semibold text-charcoal"><Camera className="h-5 w-5 text-sage" />Photo (optional)</p>
              <p className="mt-1 text-sm text-charcoal-muted">The photo stays on your phone and is not analysed. You can send it to a vet with your summary.</p>
              {photoUrl ? (
                <div className="mt-3 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl} alt="The photo you took of the animal" className="h-20 w-20 rounded-xl object-cover" />
                  <button type="button" onClick={() => setPhoto(null)} className="btn btn-secondary"><X className="h-4 w-4" />Remove photo</button>
                </div>
              ) : (
                <label className="btn btn-secondary mt-3 cursor-pointer">
                  <Camera className="h-4 w-4" />Take or choose a photo
                  <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </div>

            {/* Signs */}
            <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-charcoal-muted">What can you see?</p>
            <div className="mt-2 space-y-2">
              {groups.map(([group, items], index) => {
                const count = items.filter((sign) => ticked.includes(sign.id)).length;
                return (
                  <details key={`${animal}-${group}`} open={index === 0 || undefined} className="group rounded-xl border border-ivory-border bg-white">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base font-semibold text-charcoal">
                      <span className="flex items-center gap-2">
                        {group}
                        {count > 0 && <span className="rounded-full bg-sage px-2 py-0.5 text-xs font-bold text-white">{count} ticked</span>}
                      </span>
                      <ChevronDown className="h-5 w-5 shrink-0 text-sage transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="space-y-2 border-t border-ivory-border p-3">
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
                  </details>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {hasResult && (
                <button type="button" onClick={() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="btn btn-primary">
                  View guidance ({activeSigns.length} sign{activeSigns.length === 1 ? '' : 's'})
                </button>
              )}
              {ticked.length > 0 && <button type="button" onClick={() => setTicked([])} className="btn btn-secondary">Clear all</button>}
            </div>

            {/* Results */}
            <div ref={resultsRef} aria-live="polite" className="mt-6 scroll-mt-20 space-y-4">
              {!hasResult && <p className="flex items-start gap-2 text-base text-charcoal-muted"><Info className="mt-0.5 h-5 w-5 shrink-0" />Guidance appears here as you tick signs.</p>}

              {result.urgency && (
                <p className={`rounded-xl px-4 py-2.5 text-base font-bold ${URGENCY_STYLE[result.urgency].chip}`}>{URGENCY_PHRASE[result.urgency]}</p>
              )}

              {/* Where a disease has both a red-flag card and a fuller card below, show only the fuller one. */}
              {result.redFlags
                .filter((flag) => !result.conditions.some((match) => match.condition.id === flag.id))
                .map((flag) => <FlagCard key={flag.id} flag={flag} />)}

              {result.conditions.length > 0 && (
                <>
                  <h3 className="pt-2 font-display text-xl font-medium text-charcoal">What the signs could fit</h3>
                  {result.conditions.map((match) => <ConditionCard key={match.condition.id} match={match} />)}
                </>
              )}

              {!fullChecker && hasResult && (
                <div className="flex items-start gap-3 rounded-2xl border border-ivory-border bg-ivory p-4 text-base text-charcoal-light">
                  <Lock className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
                  <p><strong className="text-charcoal">Want to know what the signs could fit?</strong> The full symptom checker, with reasons and sources, is part of the Farmer plan. The emergency guidance above is free on every plan.</p>
                </div>
              )}

              {result.noClearMatch && (
                <div className="rounded-2xl border border-ivory-border bg-ivory p-4 text-base text-charcoal">
                  <p className="font-semibold">Nothing in this guide matches what you ticked.</p>
                  <p className="mt-1 text-charcoal-light">That does <strong>not</strong> mean the animal is well. The guide only covers some common problems. {result.urgency ? 'Because several signs are present, see a vet in the next day or two.' : 'If you are worried, call a vet.'}</p>
                </div>
              )}

              {reportable && (
                <div className="rounded-2xl border-2 border-charcoal bg-white p-4 text-base text-charcoal">
                  <h3 className="font-semibold">Who to report to</h3>
                  <p className="mt-1 text-charcoal-light">{REPORTING_NOTE}</p>
                  {contacts?.reporting.map((contact) => (
                    <div key={contact.name} className="mt-3 rounded-xl bg-ivory p-3">
                      <p className="font-semibold">{contact.name}</p>
                      <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1">
                        {contact.phone.map((phone) => <a key={phone} href={`tel:${phone.replace(/\s/g, '')}`} className="font-semibold text-sage underline">{phone}</a>)}
                      </p>
                      <p className="mt-1 text-sm text-charcoal-muted">{contact.note}{contact.confirmedOn ? '' : ' This number has not been confirmed by phone yet.'}</p>
                    </div>
                  ))}
                </div>
              )}

              {hasResult && (
                <div className="rounded-2xl border border-ivory-border bg-white p-4">
                  <h3 className="font-semibold text-charcoal">Send this to a vet</h3>
                  <p className="mt-1 text-sm text-charcoal-muted">Sends a short summary of what you ticked{photo ? ' and your photo' : ''}. You choose who gets it.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void share()} className="btn btn-primary"><Send className="h-4 w-4" />Send summary</button>
                    <button type="button" onClick={() => void copy()} className="btn btn-secondary">Copy summary</button>
                  </div>
                  {shareNote && <p role="status" className="mt-2 text-sm text-charcoal-muted">{shareNote}</p>}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Who to call and how to find a vet */}
      <section aria-labelledby="call-heading" className="card p-5 sm:p-6">
        <h2 id="call-heading" className="font-display text-2xl font-medium text-charcoal">Finding a vet</h2>
        <p className="mt-2 text-base text-charcoal-light">{KVB_REGISTERS_NOTE}</p>
        <a href={KVB_REGISTERS_URL} target="_blank" rel="noopener noreferrer" className="btn btn-secondary mt-3"><ExternalLink className="h-4 w-4" />Kenya Veterinary Board registers</a>
        <p className="mt-3 text-sm text-charcoal-muted">A list of vets and animal health workers near your farm is planned for the Farm Pro plan.</p>
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
                  <List items={risk.prevention} mark="tick" />
                </div>
              </details>
            ))}
          </div>
          <p className="mt-4 text-sm text-charcoal-muted">{SEASON_NOTE}</p>
          <p className="mt-2 flex items-start gap-2 text-sm text-charcoal-muted"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />{ALWAYS_ASK_YOUR_VET}</p>
        </section>
      )}

      <details className="group rounded-xl border border-ivory-border bg-white">
        <summary className="flex min-h-12 cursor-pointer list-none items-start gap-2 p-4 text-sm text-charcoal-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{DISCLAIMER_SHORT} <span className="font-semibold text-sage underline">Read the full notice</span></span>
        </summary>
        <div className="space-y-2 border-t border-ivory-border px-4 pb-4 pt-3 text-sm text-charcoal-light">
          {DISCLAIMER_FULL.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </details>
    </div>
  );
}
