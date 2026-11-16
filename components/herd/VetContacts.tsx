'use client';

import React, { useEffect, useState } from 'react';
import { BadgeCheck, ChevronDown, ExternalLink, Lock, MessageCircle, Phone, Plus, Send, Trash2 } from 'lucide-react';
import { KVB_CONTACT, KVB_REGISTERS_NOTE, KVB_REGISTERS_URL } from '@/lib/vet/contacts';
import { VET_KINDS, VET_KIND_IDS, telHref, usablePhone, whatsappHref, type VetKindId } from '@/lib/vet/phone';
import {
  deleteMyVet, loadDirectory, loadMyVets, readCachedVets, saveMyVet, suggestVetToDirectory,
  type DirectoryEntry, type MyVetEntry,
} from '@/lib/vet/client';
import { canUse } from '@/lib/plans';
import { LockedFeature } from '@/components/billing/LockedFeature';
import { VET_COPY, translateMessage, type Lang } from '@/lib/app-copy';
import { useLanguage } from '@/lib/use-language';

interface VetContactsProps {
  farmId: string;
  /** True for a real signed-in account, so vets are saved on the account and the directory can be read. */
  serverBacked: boolean;
  county?: string;
  subscription?: { plan: string; status?: string } | null;
  /** The current symptom check as text, to send to a vet. Absent until something is ticked. */
  summary?: string;
}

const niceDate = (iso: string, lang: Lang) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(lang === 'sw' ? 'sw-KE' : 'en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function Actions({ phone, summary, lang }: { phone: string; summary?: string; lang: Lang }) {
  const t = VET_COPY[lang];
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <a href={telHref(phone)} className="btn btn-primary"><Phone className="h-4 w-4" />{t.call}</a>
      <a href={whatsappHref(phone)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary"><MessageCircle className="h-4 w-4" />{t.whatsapp}</a>
      {summary && (
        <a href={whatsappHref(phone, summary)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary"><Send className="h-4 w-4" />{t.sendCheck}</a>
      )}
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="field-label">{label}</label>{children}</div>;
}

function KindSelect({ id, value, onChange, lang }: { id: string; value: VetKindId; onChange: (value: VetKindId) => void; lang: Lang }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value as VetKindId)} className="field">
      {VET_KIND_IDS.map((kind) => <option key={kind} value={kind}>{VET_COPY[lang].kinds[kind]}</option>)}
    </select>
  );
}

/**
 * "Finding a vet": the farm's own saved vets (every plan), the shared directory of vets that have been
 * confirmed by phone (Farm Pro), and a form to suggest a vet. Nothing here is medical advice, so it is
 * not held back for veterinary review; an unconfirmed entry is simply never shown.
 */
export function VetContacts({ farmId, serverBacked, county, subscription, summary }: VetContactsProps) {
  const finderAllowed = canUse(subscription, 'vetFinder');
  const [lang] = useLanguage();
  const t = VET_COPY[lang];

  const [mine, setMine] = useState<MyVetEntry[]>([]);
  const [mineError, setMineError] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<{ name: string; kind: VetKindId; phone: string; notes: string }>({ name: '', kind: 'veterinarian', phone: '', notes: '' });
  const [busy, setBusy] = useState(false);

  const [directory, setDirectory] = useState<DirectoryEntry[] | null>(null);
  const [directoryError, setDirectoryError] = useState('');

  const [suggest, setSuggest] = useState({ name: '', kind: 'veterinarian' as VetKindId, county: county ?? '', areas: '', phone: '', whatsapp: false, emergency: false, hours: '', kvbRegNo: '', notes: '' });
  const [suggestNote, setSuggestNote] = useState('');
  const [suggestError, setSuggestError] = useState('');

  // The saved copy shows at once (it works with no signal); the account's list replaces it when it arrives.
  useEffect(() => {
    setMine(readCachedVets(farmId));
    let cancelled = false;
    loadMyVets(farmId, serverBacked).then((vets) => { if (!cancelled) { setMine(vets); setMineError(''); } })
      .catch(() => { if (!cancelled) setMineError(t.savedOnPhone); });
    return () => { cancelled = true; };
  }, [farmId, serverBacked]);

  useEffect(() => {
    if (!finderAllowed || !serverBacked || !county) { setDirectory(null); return; }
    let cancelled = false;
    loadDirectory(county).then((vets) => { if (!cancelled) { setDirectory(vets); setDirectoryError(''); } })
      .catch((error: Error) => { if (!cancelled) setDirectoryError(translateMessage(error.message, lang)); });
    return () => { cancelled = true; };
  }, [finderAllowed, serverBacked, county]);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setMineError('');
    if (form.name.trim().length < 2 || !usablePhone(form.phone)) { setMineError(t.nameAndPhone); return; }
    setBusy(true);
    try {
      setMine(await saveMyVet(farmId, serverBacked, { name: form.name.trim(), kind: form.kind, phone: form.phone.trim(), notes: form.notes.trim() || undefined }));
      setForm({ name: '', kind: 'veterinarian', phone: '', notes: '' });
      setAdding(false);
    } catch (error) { setMineError((error as Error).message); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    setBusy(true);
    try { setMine(await deleteMyVet(farmId, serverBacked, id)); setMineError(''); }
    catch (error) { setMineError((error as Error).message); }
    finally { setBusy(false); }
  }

  async function sendSuggestion(event: React.FormEvent) {
    event.preventDefault();
    setSuggestError(''); setSuggestNote('');
    if (suggest.name.trim().length < 2 || suggest.county.trim().length < 2 || !usablePhone(suggest.phone)) { setSuggestError(t.nameCountyPhone); return; }
    setBusy(true);
    try {
      await suggestVetToDirectory({
        name: suggest.name.trim(), kind: suggest.kind, county: suggest.county.trim(), areas: suggest.areas.trim() || undefined, phone: suggest.phone.trim(),
        whatsapp: suggest.whatsapp, emergency: suggest.emergency, hours: suggest.hours.trim() || undefined, kvbRegNo: suggest.kvbRegNo.trim() || undefined, notes: suggest.notes.trim() || undefined,
      });
      setSuggestNote(t.thanks);
      setSuggest({ ...suggest, name: '', areas: '', phone: '', whatsapp: false, emergency: false, hours: '', kvbRegNo: '', notes: '' });
    } catch (error) { setSuggestError((error as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <section aria-labelledby="call-heading" className="card space-y-6 p-5 sm:p-6">
      <div>
        <h2 id="call-heading" className="font-display text-2xl font-medium text-charcoal">{t.title}</h2>
        <p className="mt-2 text-base text-charcoal-light">{t.intro} {lang === 'en' ? KVB_REGISTERS_NOTE : t.kvbRegistersNote}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={KVB_REGISTERS_URL} target="_blank" rel="noopener noreferrer" className="btn btn-secondary"><ExternalLink className="h-4 w-4" />{t.kvbRegisters}</a>
          {KVB_CONTACT.phone.map((phone) => <a key={phone} href={telHref(phone)} className="btn btn-secondary"><Phone className="h-4 w-4" />{t.ringBoard(phone)}</a>)}
        </div>
        <p className="mt-2 text-xs text-charcoal-muted">{lang === 'en' ? KVB_CONTACT.note : t.kvbContactNote} {t.kvbNote}</p>
      </div>

      {/* My vets */}
      <div>
        <h3 className="text-lg font-semibold text-charcoal">{t.myVets}</h3>
        <p className="text-sm text-charcoal-muted">{serverBacked ? t.savedAccount : t.savedPhone}</p>

        {mine.length === 0 && !adding && (
          <p className="mt-3 rounded-xl border border-ivory-border bg-ivory p-4 text-base text-charcoal-light">{t.noneYet}</p>
        )}

        <ul className="mt-3 space-y-3">
          {mine.map((vet) => (
            <li key={vet.id} className="rounded-2xl border border-ivory-border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-charcoal">{vet.name}</p>
                  <p className="text-sm text-charcoal-muted">{t.kinds[vet.kind] ?? vet.kind} · {vet.phone}</p>
                  {vet.notes && <p className="mt-1 text-sm text-charcoal-light">{vet.notes}</p>}
                </div>
                <button type="button" disabled={busy} onClick={() => void remove(vet.id)} aria-label={t.remove(vet.name)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-charcoal-muted hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
              </div>
              <Actions phone={vet.phone} summary={summary} lang={lang} />
            </li>
          ))}
        </ul>

        {mineError && <p role="alert" className="mt-3 text-sm font-medium text-red-700">{mineError}</p>}

        {adding ? (
          <form onSubmit={add} className="mt-4 space-y-4 rounded-2xl border border-ivory-border bg-ivory p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="mv-name" label={t.name}><input id="mv-name" className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.namePlaceholder} autoComplete="off" /></Field>
              <Field id="mv-kind" label={t.kind}><KindSelect id="mv-kind" lang={lang} value={form.kind} onChange={(kind) => setForm({ ...form, kind })} /></Field>
            </div>
            <Field id="mv-phone" label={t.phone}><input id="mv-phone" type="tel" className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t.phonePlaceholder} /></Field>
            <Field id="mv-notes" label={t.noteOptional}><input id="mv-notes" className="field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t.notePlaceholder} /></Field>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className="btn btn-primary">{t.save}</button>
              <button type="button" onClick={() => { setAdding(false); setMineError(''); }} className="btn btn-secondary">{t.cancel}</button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="btn btn-secondary mt-4"><Plus className="h-4 w-4" />{t.add}</button>
        )}
      </div>

      {/* Directory */}
      <div>
        <h3 className="text-lg font-semibold text-charcoal">{t.nearYou(county)}</h3>
        {!finderAllowed ? (
          <div className="mt-3"><LockedFeature feature="vetFinder">{t.farmProOnly}</LockedFeature></div>
        ) : !serverBacked ? (
          <p className="mt-3 rounded-xl border border-ivory-border bg-ivory p-4 text-base text-charcoal-light">{t.signInToSee}</p>
        ) : directoryError ? (
          <p role="alert" className="mt-3 text-sm font-medium text-red-700">{directoryError}</p>
        ) : directory === null ? (
          <p className="mt-3 text-base text-charcoal-muted">{t.loading}</p>
        ) : directory.length === 0 ? (
          <p className="mt-3 rounded-xl border border-ivory-border bg-ivory p-4 text-base text-charcoal-light">{t.noneListed(county)}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {directory.map((vet) => (
              <li key={vet.id} className="rounded-2xl border border-ivory-border bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-charcoal">{vet.name}</p>
                  {vet.emergency && <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white">{t.emergency}</span>}
                </div>
                <p className="text-sm text-charcoal-muted">{t.kinds[vet.kind] ?? vet.kind} · {vet.phone}{vet.hours ? ` · ${vet.hours}` : ''}</p>
                {vet.areas && <p className="mt-1 text-sm text-charcoal-light">{t.covers(vet.areas)}</p>}
                {vet.notes && <p className="mt-1 text-sm text-charcoal-light">{vet.notes}</p>}
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-charcoal-muted">
                  <span className="inline-flex items-center gap-1 font-medium text-sage"><BadgeCheck className="h-4 w-4" />{t.confirmed(niceDate(vet.confirmed_on, lang))}</span>
                  {vet.kvb_reg_no && <span>{t.kvbReg(vet.kvb_reg_no)}</span>}
                </p>
                <Actions phone={vet.phone} summary={summary} lang={lang} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Suggest */}
      <details className="group rounded-2xl border border-ivory-border bg-white">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base font-semibold text-charcoal">
          <span>{t.suggestTitle}</span>
          <ChevronDown className="h-5 w-5 shrink-0 text-sage transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-ivory-border p-4">
          {!serverBacked ? (
            <p className="text-base text-charcoal-light">{t.signInToSuggest}</p>
          ) : (
            <form onSubmit={sendSuggestion} className="space-y-4">
              <p className="text-sm text-charcoal-muted">{t.suggestIntro}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="sv-name" label={t.name}><input id="sv-name" className="field" value={suggest.name} onChange={(e) => setSuggest({ ...suggest, name: e.target.value })} autoComplete="off" /></Field>
                <Field id="sv-kind" label={t.kind}><KindSelect id="sv-kind" lang={lang} value={suggest.kind} onChange={(kind) => setSuggest({ ...suggest, kind })} /></Field>
                <Field id="sv-county" label={t.county}><input id="sv-county" className="field" value={suggest.county} onChange={(e) => setSuggest({ ...suggest, county: e.target.value })} /></Field>
                <Field id="sv-phone" label={t.phone}><input id="sv-phone" type="tel" className="field" value={suggest.phone} onChange={(e) => setSuggest({ ...suggest, phone: e.target.value })} /></Field>
                <Field id="sv-areas" label={t.areas}><input id="sv-areas" className="field" value={suggest.areas} onChange={(e) => setSuggest({ ...suggest, areas: e.target.value })} placeholder={t.areasPlaceholder} /></Field>
                <Field id="sv-hours" label={t.hours}><input id="sv-hours" className="field" value={suggest.hours} onChange={(e) => setSuggest({ ...suggest, hours: e.target.value })} placeholder={t.hoursPlaceholder} /></Field>
                <Field id="sv-kvb" label={t.kvbNumber}><input id="sv-kvb" className="field" value={suggest.kvbRegNo} onChange={(e) => setSuggest({ ...suggest, kvbRegNo: e.target.value })} /></Field>
                <Field id="sv-notes" label={t.noteOptional}><input id="sv-notes" className="field" value={suggest.notes} onChange={(e) => setSuggest({ ...suggest, notes: e.target.value })} /></Field>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <label className="flex min-h-11 items-center gap-2 text-base"><input type="checkbox" checked={suggest.whatsapp} onChange={(e) => setSuggest({ ...suggest, whatsapp: e.target.checked })} className="h-5 w-5 accent-[#345C4A]" />{t.usesWhatsapp}</label>
                <label className="flex min-h-11 items-center gap-2 text-base"><input type="checkbox" checked={suggest.emergency} onChange={(e) => setSuggest({ ...suggest, emergency: e.target.checked })} className="h-5 w-5 accent-[#345C4A]" />{t.comesEmergency}</label>
              </div>
              {suggestError && <p role="alert" className="text-sm font-medium text-red-700">{suggestError}</p>}
              {suggestNote && <p role="status" className="text-sm font-medium text-sage">{suggestNote}</p>}
              <button type="submit" disabled={busy} className="btn btn-primary">{t.send}</button>
            </form>
          )}
        </div>
      </details>
    </section>
  );
}
