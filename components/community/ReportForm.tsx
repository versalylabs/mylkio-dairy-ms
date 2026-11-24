'use client';
import { useMemo, useState } from 'react';
import { Phone, Send } from 'lucide-react';
import { OUTBREAK_COPY, type Lang } from '@/lib/outbreak-copy';
import { CommunityError, communityCall } from '@/lib/community-client';
import { REPORT_LIMITS, flagsForSigns, signGroups, type VetSeen } from '@/lib/community-outbreak';
import { contactsFor } from '@/lib/vet/contacts';
import { telHref } from '@/lib/vet/phone';
import { addDays, farmToday } from '@/lib/dates';

/**
 * The structured report: signs ticked from the vet guide's own list, how many animals, for how long, the date, and whether a
 * vet has seen them. There is no free text, so a report cannot name anyone. It shows who to call and says plainly that a
 * notifiable disease must be reported to the authorities, not only to the group. The area is never typed: the server takes it
 * from the farm's own profile.
 */
export function ReportForm({ lang, groupId, farmCounty, onCancel, onSent }: {
  lang: Lang; groupId: string; farmCounty: string; onCancel: () => void; onSent: () => void;
}) {
  const t = OUTBREAK_COPY[lang];
  const today = farmToday();
  const [signs, setSigns] = useState<string[]>([]);
  const [animals, setAnimals] = useState('1');
  const [days, setDays] = useState('1');
  const [seenOn, setSeenOn] = useState(today);
  const [vetSeen, setVetSeen] = useState<VetSeen>('no');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const guide = useMemo(() => flagsForSigns(signs), [signs]);
  const contacts = contactsFor(farmCounty);

  const toggle = (id: string) => setSigns((current) =>
    current.includes(id) ? current.filter((s) => s !== id) : current.length >= REPORT_LIMITS.maxSigns ? current : [...current, id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (signs.length === 0) { setError(t.needSign); return; }
    setBusy(true); setError('');
    try {
      await communityCall(`/api/community/groups/${groupId}/reports`, {
        method: 'POST', body: { signs, animals: Number(animals), days: Number(days), seenOn, vetSeen },
      });
      onSent();
    } catch (e) {
      setError(e instanceof CommunityError && e.status === 429 ? t.tooMany : e instanceof CommunityError && e.status === 403 && /veterinarian/i.test(e.message) ? t.closed : t.actionError);
    } finally { setBusy(false); }
  };

  const vetOptions: [VetSeen, string][] = [['yes', t.vetYes], ['called', t.vetCalled], ['no', t.vetNo]];

  return (
    <form onSubmit={submit} className="card space-y-5 p-4 sm:p-5" aria-labelledby="report-heading">
      <div>
        <h3 id="report-heading" className="text-lg font-bold text-charcoal">{t.formTitle}</h3>
        <p className="mt-1 text-sm text-charcoal-light">{t.formIntro}</p>
        <p className="mt-2 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-900">{t.callVetNow}</p>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <fieldset className="space-y-3">
        <legend className="field-label">{t.tickSigns} <span className="font-normal text-charcoal-muted">({t.maxSigns})</span></legend>
        {signGroups().map(({ group, signs: list }) => (
          <div key={group}>
            <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-muted">{group}</p>
            <ul className="mt-1 space-y-1">
              {list.map((sign) => {
                const checked = signs.includes(sign.id);
                const full = !checked && signs.length >= REPORT_LIMITS.maxSigns;
                return (
                  <li key={sign.id}>
                    <label className={`flex min-h-11 items-start gap-3 rounded-lg px-2 py-1.5 ${full ? 'opacity-50' : 'hover:bg-sage/5'}`}>
                      <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[#345C4A]" checked={checked} disabled={full} onChange={() => toggle(sign.id)} />
                      <span className="text-sm text-charcoal">{sign.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </fieldset>

      {/* The emergency steps for what was ticked come before everything else the form asks. */}
      {guide.flags.length > 0 && (
        <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/60 p-3" role="status">
          {guide.flags.map((flag) => (
            <div key={flag.id}>
              <p className="text-sm font-semibold text-charcoal">{flag.title}. {t.doThisFirst}:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-charcoal">{flag.doNow.map((step) => <li key={step}>{step}</li>)}</ul>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="rep-animals" className="field-label">{t.animals}</label>
          <input id="rep-animals" className="field" type="number" inputMode="numeric" min={1} max={REPORT_LIMITS.maxAnimals} value={animals} onChange={(e) => setAnimals(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="rep-days" className="field-label">{t.days}</label>
          <input id="rep-days" className="field" type="number" inputMode="numeric" min={0} max={REPORT_LIMITS.maxDays} value={days} onChange={(e) => setDays(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="rep-seen" className="field-label">{t.seenOn}</label>
          <input id="rep-seen" className="field" type="date" min={addDays(today, -REPORT_LIMITS.seenWithinDays)} max={today} value={seenOn} onChange={(e) => setSeenOn(e.target.value)} required />
        </div>
      </div>

      <fieldset>
        <legend className="field-label">{t.vetSeen}</legend>
        <div className="flex flex-wrap gap-2">
          {vetOptions.map(([value, label]) => (
            <label key={value} className={`chip-btn cursor-pointer gap-2 ${vetSeen === value ? '!border-sage !bg-sage/10 !text-sage' : ''}`}>
              <input type="radio" name="vet-seen" className="sr-only" checked={vetSeen === value} onChange={() => setVetSeen(value)} />{label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2 rounded-xl border border-gold-border bg-gold-subtle p-4">
        <h4 className="text-sm font-bold text-charcoal">{t.reportingTitle}</h4>
        <p className="text-sm text-charcoal">{t.reportingNote}</p>
        {guide.notifiable && <p className="text-sm font-semibold text-rose-900">{t.notifiable}</p>}
        {contacts && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-muted">{t.reportingContacts}</p>
            <ul className="space-y-2">
              {contacts.reporting.map((c) => (
                <li key={c.name} className="text-sm text-charcoal">
                  <p className="font-semibold">{c.name}</p>
                  <p className="flex flex-wrap gap-x-3">{c.phone.map((p) => <a key={p} href={telHref(p)} className="inline-flex items-center gap-1 font-semibold text-sage underline"><Phone className="h-3.5 w-3.5" />{p}</a>)}</p>
                  <p className="mt-0.5 text-xs text-charcoal-muted">{c.note}{c.confirmedOn ? '' : ' This number has not been confirmed by phone yet.'}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary" disabled={busy || signs.length === 0}><Send className="h-4 w-4" />{busy ? t.sending : t.submit}</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>{t.cancel}</button>
      </div>
    </form>
  );
}
