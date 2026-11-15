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

interface VetContactsProps {
  farmId: string;
  /** True for a real signed-in account, so vets are saved on the account and the directory can be read. */
  serverBacked: boolean;
  county?: string;
  subscription?: { plan: string; status?: string } | null;
  /** The current symptom check as text, to send to a vet. Absent until something is ticked. */
  summary?: string;
}

const niceDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function Actions({ phone, summary }: { phone: string; summary?: string }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <a href={telHref(phone)} className="btn btn-primary"><Phone className="h-4 w-4" />Call</a>
      <a href={whatsappHref(phone)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary"><MessageCircle className="h-4 w-4" />WhatsApp</a>
      {summary && (
        <a href={whatsappHref(phone, summary)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary"><Send className="h-4 w-4" />Send my check</a>
      )}
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="field-label">{label}</label>{children}</div>;
}

function KindSelect({ id, value, onChange }: { id: string; value: VetKindId; onChange: (value: VetKindId) => void }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value as VetKindId)} className="field">
      {VET_KIND_IDS.map((kind) => <option key={kind} value={kind}>{VET_KINDS[kind]}</option>)}
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
      .catch(() => { if (!cancelled) setMineError('Showing the vets saved on this phone. Could not refresh them from your account.'); });
    return () => { cancelled = true; };
  }, [farmId, serverBacked]);

  useEffect(() => {
    if (!finderAllowed || !serverBacked || !county) { setDirectory(null); return; }
    let cancelled = false;
    loadDirectory(county).then((vets) => { if (!cancelled) { setDirectory(vets); setDirectoryError(''); } })
      .catch((error: Error) => { if (!cancelled) setDirectoryError(error.message); });
    return () => { cancelled = true; };
  }, [finderAllowed, serverBacked, county]);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setMineError('');
    if (form.name.trim().length < 2 || !usablePhone(form.phone)) { setMineError('Enter a name and a phone number.'); return; }
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
    if (suggest.name.trim().length < 2 || suggest.county.trim().length < 2 || !usablePhone(suggest.phone)) { setSuggestError('Enter a name, a county and a phone number.'); return; }
    setBusy(true);
    try {
      await suggestVetToDirectory({
        name: suggest.name.trim(), kind: suggest.kind, county: suggest.county.trim(), areas: suggest.areas.trim() || undefined, phone: suggest.phone.trim(),
        whatsapp: suggest.whatsapp, emergency: suggest.emergency, hours: suggest.hours.trim() || undefined, kvbRegNo: suggest.kvbRegNo.trim() || undefined, notes: suggest.notes.trim() || undefined,
      });
      setSuggestNote('Thank you. We will ring the number before this vet is listed.');
      setSuggest({ ...suggest, name: '', areas: '', phone: '', whatsapp: false, emergency: false, hours: '', kvbRegNo: '', notes: '' });
    } catch (error) { setSuggestError((error as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <section aria-labelledby="call-heading" className="card space-y-8 p-5 sm:p-6">
      <div>
        <h2 id="call-heading" className="font-display text-2xl font-medium text-charcoal">Finding a vet</h2>
        <p className="mt-2 text-base text-charcoal-light">Keep your vet&apos;s number where you can reach it in a hurry. {KVB_REGISTERS_NOTE}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={KVB_REGISTERS_URL} target="_blank" rel="noopener noreferrer" className="btn btn-secondary"><ExternalLink className="h-4 w-4" />Kenya Veterinary Board registers</a>
          {KVB_CONTACT.phone.map((phone) => <a key={phone} href={telHref(phone)} className="btn btn-secondary"><Phone className="h-4 w-4" />Ring the Board {phone}</a>)}
        </div>
        <p className="mt-2 text-xs text-charcoal-muted">{KVB_CONTACT.note} Number from the Board&apos;s own website, not yet confirmed by phone.</p>
      </div>

      {/* My vets */}
      <div>
        <h3 className="text-lg font-semibold text-charcoal">My vets</h3>
        <p className="text-sm text-charcoal-muted">{serverBacked ? 'Saved on your account and on this phone, so the call buttons work without signal.' : 'Saved on this phone only.'}</p>

        {mine.length === 0 && !adding && (
          <p className="mt-3 rounded-xl border border-ivory-border bg-ivory p-4 text-base text-charcoal-light">You have not saved a vet yet. Add the vet or animal health worker you call, so the number is one tap away in an emergency.</p>
        )}

        <ul className="mt-3 space-y-3">
          {mine.map((vet) => (
            <li key={vet.id} className="rounded-2xl border border-ivory-border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-charcoal">{vet.name}</p>
                  <p className="text-sm text-charcoal-muted">{VET_KINDS[vet.kind] ?? vet.kind} · {vet.phone}</p>
                  {vet.notes && <p className="mt-1 text-sm text-charcoal-light">{vet.notes}</p>}
                </div>
                <button type="button" disabled={busy} onClick={() => void remove(vet.id)} aria-label={`Remove ${vet.name}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-charcoal-muted hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
              </div>
              <Actions phone={vet.phone} summary={summary} />
            </li>
          ))}
        </ul>

        {mineError && <p role="alert" className="mt-3 text-sm font-medium text-red-700">{mineError}</p>}

        {adding ? (
          <form onSubmit={add} className="mt-4 space-y-4 rounded-2xl border border-ivory-border bg-ivory p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="mv-name" label="Name"><input id="mv-name" className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Dr Otieno" autoComplete="off" /></Field>
              <Field id="mv-kind" label="Kind"><KindSelect id="mv-kind" value={form.kind} onChange={(kind) => setForm({ ...form, kind })} /></Field>
            </div>
            <Field id="mv-phone" label="Phone"><input id="mv-phone" type="tel" className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. 0712 345 678" /></Field>
            <Field id="mv-notes" label="Note (optional)"><input id="mv-notes" className="field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Comes out at night" /></Field>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className="btn btn-primary">Save vet</button>
              <button type="button" onClick={() => { setAdding(false); setMineError(''); }} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="btn btn-secondary mt-4"><Plus className="h-4 w-4" />Add a vet</button>
        )}
      </div>

      {/* Directory */}
      <div>
        <h3 className="text-lg font-semibold text-charcoal">Vets near you{county ? ` (${county})` : ''}</h3>
        {!finderAllowed ? (
          <div className="mt-3 flex items-start gap-3 rounded-2xl border border-ivory-border bg-ivory p-4 text-base text-charcoal-light">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
            <p>A list of confirmed vets and animal health workers in your county is part of the Farm Pro plan. You can still save your own vets above.</p>
          </div>
        ) : !serverBacked ? (
          <p className="mt-3 rounded-xl border border-ivory-border bg-ivory p-4 text-base text-charcoal-light">Sign in with your farm account to see vets near you.</p>
        ) : directoryError ? (
          <p role="alert" className="mt-3 text-sm font-medium text-red-700">{directoryError}</p>
        ) : directory === null ? (
          <p className="mt-3 text-base text-charcoal-muted">Loading…</p>
        ) : directory.length === 0 ? (
          <p className="mt-3 rounded-xl border border-ivory-border bg-ivory p-4 text-base text-charcoal-light">No vets are listed for {county} yet. We only list a vet after we have rung the number and confirmed it. You can suggest one below.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {directory.map((vet) => (
              <li key={vet.id} className="rounded-2xl border border-ivory-border bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-charcoal">{vet.name}</p>
                  {vet.emergency && <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white">Emergency call-outs</span>}
                </div>
                <p className="text-sm text-charcoal-muted">{VET_KINDS[vet.kind] ?? vet.kind} · {vet.phone}{vet.hours ? ` · ${vet.hours}` : ''}</p>
                {vet.areas && <p className="mt-1 text-sm text-charcoal-light">Covers: {vet.areas}</p>}
                {vet.notes && <p className="mt-1 text-sm text-charcoal-light">{vet.notes}</p>}
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-charcoal-muted">
                  <span className="inline-flex items-center gap-1 font-medium text-sage"><BadgeCheck className="h-4 w-4" />Number confirmed by phone on {niceDate(vet.confirmed_on)}</span>
                  {vet.kvb_reg_no && <span>KVB registration: {vet.kvb_reg_no} (check it on the registers)</span>}
                </p>
                <Actions phone={vet.phone} summary={summary} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Suggest */}
      <details className="group rounded-2xl border border-ivory-border bg-white">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base font-semibold text-charcoal">
          <span>Suggest a vet for the list</span>
          <ChevronDown className="h-5 w-5 shrink-0 text-sage transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-ivory-border p-4">
          {!serverBacked ? (
            <p className="text-base text-charcoal-light">Sign in with your farm account to suggest a vet.</p>
          ) : (
            <form onSubmit={sendSuggestion} className="space-y-4">
              <p className="text-sm text-charcoal-muted">Know a good vet or animal health worker? Tell us. We ring the number and confirm it before anyone else can see it.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="sv-name" label="Name"><input id="sv-name" className="field" value={suggest.name} onChange={(e) => setSuggest({ ...suggest, name: e.target.value })} autoComplete="off" /></Field>
                <Field id="sv-kind" label="Kind"><KindSelect id="sv-kind" value={suggest.kind} onChange={(kind) => setSuggest({ ...suggest, kind })} /></Field>
                <Field id="sv-county" label="County"><input id="sv-county" className="field" value={suggest.county} onChange={(e) => setSuggest({ ...suggest, county: e.target.value })} /></Field>
                <Field id="sv-phone" label="Phone"><input id="sv-phone" type="tel" className="field" value={suggest.phone} onChange={(e) => setSuggest({ ...suggest, phone: e.target.value })} /></Field>
                <Field id="sv-areas" label="Areas covered (optional)"><input id="sv-areas" className="field" value={suggest.areas} onChange={(e) => setSuggest({ ...suggest, areas: e.target.value })} placeholder="e.g. Kabete, Dagoretti" /></Field>
                <Field id="sv-hours" label="Hours (optional)"><input id="sv-hours" className="field" value={suggest.hours} onChange={(e) => setSuggest({ ...suggest, hours: e.target.value })} placeholder="e.g. Daily 6am to 8pm" /></Field>
                <Field id="sv-kvb" label="KVB registration number (optional)"><input id="sv-kvb" className="field" value={suggest.kvbRegNo} onChange={(e) => setSuggest({ ...suggest, kvbRegNo: e.target.value })} /></Field>
                <Field id="sv-notes" label="Note (optional)"><input id="sv-notes" className="field" value={suggest.notes} onChange={(e) => setSuggest({ ...suggest, notes: e.target.value })} /></Field>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <label className="flex min-h-11 items-center gap-2 text-base"><input type="checkbox" checked={suggest.whatsapp} onChange={(e) => setSuggest({ ...suggest, whatsapp: e.target.checked })} className="h-5 w-5 accent-[#345C4A]" />Uses WhatsApp</label>
                <label className="flex min-h-11 items-center gap-2 text-base"><input type="checkbox" checked={suggest.emergency} onChange={(e) => setSuggest({ ...suggest, emergency: e.target.checked })} className="h-5 w-5 accent-[#345C4A]" />Comes out in emergencies</label>
              </div>
              {suggestError && <p role="alert" className="text-sm font-medium text-red-700">{suggestError}</p>}
              {suggestNote && <p role="status" className="text-sm font-medium text-sage">{suggestNote}</p>}
              <button type="submit" disabled={busy} className="btn btn-primary">Send suggestion</button>
            </form>
          )}
        </div>
      </details>
    </section>
  );
}
