'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { buildFaqs, SAMPLE_TESTIMONIALS } from '@/components/marketing/content';
import { SITE_CONTENT_CHANGED } from '@/components/site/SiteContentProvider';
import { PLANS, PLAN_ORDER } from '@/lib/plans';
import { formatKsh } from '@/lib/money';
import {
  newItemId, type SiteContact, type SiteContent, type SiteContentKey, type SiteContentMeta, type SiteFaq, type SitePrices, type SiteTestimonial,
} from '@/lib/site-content';

type Loaded = { content: SiteContent; saved: SiteContentKey[]; meta: SiteContentMeta };

const when = (iso: string) => new Date(iso).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

async function call(method: 'GET' | 'PUT' | 'DELETE', body?: unknown) {
  const response = await fetch('/api/admin/site-content', {
    method, cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'That could not be saved. Please try again.');
  return result;
}

/** One editable part of the website: a heading, what it controls, when it was last changed, and Save / Reset. */
function Card({ title, help, savedInfo, dirty, busy, saveLabel = 'Save changes', onSave, onReset, error, done, children }: {
  title: string; help: string; savedInfo: { updatedAt: string; updatedBy: string | null } | null; dirty: boolean; busy: boolean; saveLabel?: string;
  onSave: () => void; onReset: () => void; error: string; done: boolean; children: React.ReactNode;
}) {
  return <section className="card space-y-4 p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="font-display text-xl font-bold">{title}</h3>
        <p className="mt-1 max-w-2xl text-sm text-charcoal-light">{help}</p>
      </div>
      <p className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${savedInfo ? 'bg-sage/10 text-sage' : 'bg-ivory-muted text-charcoal-muted'}`}>
        {savedInfo ? `Edited ${when(savedInfo.updatedAt)}${savedInfo.updatedBy ? ` by ${savedInfo.updatedBy}` : ''}` : 'Showing the built-in wording'}
      </p>
    </div>
    {children}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="flex flex-wrap items-center gap-3 border-t border-ivory-border pt-4">
      <button type="button" className="btn btn-primary" disabled={busy || !dirty} onClick={onSave}>{busy ? 'Saving…' : saveLabel}</button>
      {savedInfo && <button type="button" className="btn btn-ghost" disabled={busy} onClick={onReset}>Go back to the built-in wording</button>}
      {done && !dirty && <span role="status" className="text-sm font-semibold text-sage">Saved. The website shows it within about a minute.</span>}
      {dirty && <span className="text-sm text-charcoal-muted">You have unsaved changes.</span>}
    </div>
  </section>;
}

function useCard(onSave: (value: unknown) => Promise<void>, onReset: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(''); setDone(false);
    try { await action(); setDone(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'That could not be saved.'); }
    finally { setBusy(false); }
  };
  return { busy, error, done, save: (value: unknown) => run(() => onSave(value)), reset: () => run(onReset) };
}

type Parent = { loaded: Loaded; save: (key: SiteContentKey, value: unknown) => Promise<void>; reset: (key: SiteContentKey) => Promise<void> };

function ContactCard({ loaded, save, reset }: Parent) {
  const stored = loaded.content.contact;
  const [draft, setDraft] = useState<SiteContact>(stored);
  const storedKey = JSON.stringify(stored);
  useEffect(() => setDraft(stored), [storedKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const card = useCard((v) => save('contact', v), async () => { if (window.confirm('Put the built-in phone, WhatsApp and email back?')) await reset('contact'); });
  const dirty = JSON.stringify(draft) !== JSON.stringify(stored);
  const set = (key: keyof SiteContact) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, [key]: e.target.value });
  return <Card title="Contact details" savedInfo={loaded.meta.contact ?? null} dirty={dirty} busy={card.busy} error={card.error} done={card.done}
    help="Shown in the website's contact section and footer, in the free checklist download, and used for every “Message Mylkio” button farmers see inside the app."
    onSave={() => void card.save(draft)} onReset={() => void card.reset()}>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <label><span className="field-label">Phone number</span><input className="field" inputMode="tel" autoComplete="off" value={draft.phone} onChange={set('phone')} /><span className="mt-1 block text-xs text-charcoal-muted">As written on the site, e.g. +254 184 129145</span></label>
      <label><span className="field-label">WhatsApp number</span><input className="field" inputMode="tel" autoComplete="off" value={draft.whatsapp} onChange={set('whatsapp')} /><span className="mt-1 block text-xs text-charcoal-muted">Builds the wa.me chat links</span></label>
      <label><span className="field-label">Support email</span><input className="field" type="email" autoComplete="off" value={draft.email} onChange={set('email')} /></label>
    </div>
    <p className="rounded-xl bg-gold-subtle p-3 text-sm text-charcoal-light">The Privacy notice and Terms of use quote the support email in their wording. Changing it here does not edit those pages: if the email changes, ask for that text to be updated too, since a lawyer should read it.</p>
  </Card>;
}

function PricesCard({ loaded, save, reset }: Parent) {
  const stored = loaded.content.prices;
  const [draft, setDraft] = useState<SitePrices>(stored);
  const storedKey = JSON.stringify(stored);
  useEffect(() => setDraft(stored), [storedKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const card = useCard((v) => save('prices', v), async () => { if (window.confirm(`Put the built-in prices back (${PLAN_ORDER.map((id) => `${PLANS[id].name} ${formatKsh(PLANS[id].priceKsh)}`).join(', ')})?`)) await reset('prices'); });
  const dirty = JSON.stringify(draft) !== JSON.stringify(stored);
  return <Card title="Subscription prices" savedInfo={loaded.meta.prices ?? null} dirty={dirty} busy={card.busy} error={card.error} done={card.done}
    help="The monthly price of each plan, shown on the website, in the sign-up form and in the cost FAQ. New sign-ups and plan changes you make from the Accounts tab record the current price. Farms that already have a subscription keep the price they were given, so a change here never quietly re-bills anyone."
    onSave={() => void card.save(draft)} onReset={() => void card.reset()}>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {PLAN_ORDER.map((id) => <label key={id}>
        <span className="field-label">{PLANS[id].name} (KSh per month)</span>
        <input className="field tabular-nums" inputMode="numeric" value={draft[id]} onChange={(e) => setDraft({ ...draft, [id]: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
      </label>)}
    </div>
    <p className="text-sm text-charcoal-muted">Trial length (14 days) and each plan&apos;s cow limit are fixed in the system, not set here.</p>
  </Card>;
}

function move<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function TestimonialsCard({ loaded, save, reset }: Parent) {
  const stored = loaded.content.testimonials;
  const start = useMemo(() => stored ?? SAMPLE_TESTIMONIALS, [stored]);
  const [draft, setDraft] = useState<SiteTestimonial[]>(start);
  const startKey = JSON.stringify(start);
  useEffect(() => setDraft(start), [startKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const card = useCard((v) => save('testimonials', v), async () => { if (window.confirm('Remove your saved stories and go back to the built-in examples?')) await reset('testimonials'); });
  // Showing the built-in examples counts as "nothing changed" until the administrator edits something.
  const dirty = JSON.stringify(draft) !== JSON.stringify(start);
  const patch = (index: number, change: Partial<SiteTestimonial>) => setDraft(draft.map((t, i) => (i === index ? { ...t, ...change } : t)));
  const shown = draft.filter((t) => t.approved).length;
  return <Card title="Testimonials" savedInfo={loaded.meta.testimonials ?? null} dirty={dirty} busy={card.busy} error={card.error} done={card.done}
    help="Farmer stories on the home page. Until you save your own list, the website shows invented examples, clearly labelled. Add a real story only with the farmer's agreement, and untick “An example” for it: the labels then disappear from that card, and when every shown story is real the section is headed “What dairy farmers say”."
    onSave={() => void card.save(draft)} onReset={() => void card.reset()}>
    <p className="text-sm text-charcoal-muted">{shown} of {draft.length} {draft.length === 1 ? 'story is' : 'stories are'} shown on the website.</p>
    <div className="space-y-4">
      {draft.map((t, index) => <article key={t.id} className="space-y-3 rounded-2xl border border-ivory-border bg-ivory p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label><span className="field-label">Farmer</span><input className="field" value={t.farmerName} maxLength={80} onChange={(e) => patch(index, { farmerName: e.target.value })} /></label>
          <label><span className="field-label">Farm</span><input className="field" value={t.farmName} maxLength={100} onChange={(e) => patch(index, { farmName: e.target.value })} /></label>
          <label><span className="field-label">County</span><input className="field" value={t.county} maxLength={80} onChange={(e) => patch(index, { county: e.target.value })} /></label>
          <label><span className="field-label">Cows</span><input className="field tabular-nums" inputMode="numeric" value={t.cowsCount} onChange={(e) => patch(index, { cowsCount: Number(e.target.value.replace(/\D/g, '')) || 0 })} /></label>
        </div>
        <label className="block"><span className="field-label">What they said</span>
          <textarea className="field min-h-24" value={t.quote} maxLength={600} onChange={(e) => patch(index, { quote: e.target.value })} />
          <span className="mt-1 block text-xs text-charcoal-muted">{t.quote.length} / 600 characters</span></label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5" checked={t.approved} onChange={(e) => patch(index, { approved: e.target.checked })} />Show on the website</label>
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5" checked={t.sample} onChange={(e) => patch(index, { sample: e.target.checked })} />An example, not a real farmer</label>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Move up" className="btn btn-ghost !px-3" disabled={index === 0} onClick={() => setDraft(move(draft, index, index - 1))}><ArrowUp className="h-4 w-4" /></button>
            <button type="button" aria-label="Move down" className="btn btn-ghost !px-3" disabled={index === draft.length - 1} onClick={() => setDraft(move(draft, index, index + 1))}><ArrowDown className="h-4 w-4" /></button>
            <button type="button" className="btn btn-ghost !text-red-700" onClick={() => { if (window.confirm(`Delete the story from ${t.farmerName || 'this farmer'}?`)) setDraft(draft.filter((_, i) => i !== index)); }}><Trash2 className="h-4 w-4" />Delete</button>
          </div>
        </div>
      </article>)}
      {draft.length === 0 && <p className="text-sm text-charcoal-muted">No stories yet. The section stays hidden on the website until you add one and show it.</p>}
    </div>
    <button type="button" className="btn btn-secondary" disabled={draft.length >= 30}
      onClick={() => setDraft([...draft, { id: newItemId('story'), farmerName: '', farmName: '', county: '', cowsCount: 0, quote: '', rating: 5, approved: false, sample: false }])}>
      <Plus className="h-4 w-4" />Add a story
    </button>
  </Card>;
}

function FaqCard({ loaded, save, reset }: Parent) {
  const stored = loaded.content.faqs;
  const prices = loaded.content.prices;
  const start = useMemo<SiteFaq[]>(() => stored ?? buildFaqs(prices).map((f, i) => ({ id: `faq-${i + 1}`, q: f.q, a: f.a })), [stored, prices]);
  const [draft, setDraft] = useState<SiteFaq[]>(start);
  const startKey = JSON.stringify(start);
  useEffect(() => setDraft(start), [startKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const card = useCard((v) => save('faqs', v), async () => { if (window.confirm('Remove your edited questions and go back to the built-in ones?')) await reset('faqs'); });
  const dirty = JSON.stringify(draft) !== JSON.stringify(start);
  const patch = (index: number, change: Partial<SiteFaq>) => setDraft(draft.map((f, i) => (i === index ? { ...f, ...change } : f)));
  return <Card title="Frequently asked questions" savedInfo={loaded.meta.faqs ?? null} dirty={dirty} busy={card.busy} error={card.error} done={card.done}
    help="The questions at the bottom of the home page, in the order shown. The cost question uses the prices above until you edit it. Once you save, this list replaces the built-in one, so later price changes will not rewrite your wording."
    onSave={() => void card.save(draft)} onReset={() => void card.reset()}>
    <div className="space-y-4">
      {draft.map((f, index) => <article key={f.id} className="space-y-3 rounded-2xl border border-ivory-border bg-ivory p-4">
        <label className="block"><span className="field-label">Question</span><input className="field" value={f.q} maxLength={200} onChange={(e) => patch(index, { q: e.target.value })} /></label>
        <label className="block"><span className="field-label">Answer</span><textarea className="field min-h-24" value={f.a} maxLength={1200} onChange={(e) => patch(index, { a: e.target.value })} /></label>
        <div className="flex items-center justify-end gap-1">
          <button type="button" aria-label="Move up" className="btn btn-ghost !px-3" disabled={index === 0} onClick={() => setDraft(move(draft, index, index - 1))}><ArrowUp className="h-4 w-4" /></button>
          <button type="button" aria-label="Move down" className="btn btn-ghost !px-3" disabled={index === draft.length - 1} onClick={() => setDraft(move(draft, index, index + 1))}><ArrowDown className="h-4 w-4" /></button>
          <button type="button" className="btn btn-ghost !text-red-700" onClick={() => { if (window.confirm('Delete this question?')) setDraft(draft.filter((_, i) => i !== index)); }}><Trash2 className="h-4 w-4" />Delete</button>
        </div>
      </article>)}
    </div>
    <button type="button" className="btn btn-secondary" disabled={draft.length >= 30} onClick={() => setDraft([...draft, { id: newItemId('faq'), q: '', a: '' }])}>
      <Plus className="h-4 w-4" />Add a question
    </button>
  </Card>;
}

/** The "Website" tab: edit what visitors see on the live site without a code release. */
export function WebsiteContentAdmin() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await call('GET');
      setLoaded({ content: result.content, saved: result.saved, meta: result.meta });
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load the website content.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const after = async () => {
    await load();
    window.dispatchEvent(new Event(SITE_CONTENT_CHANGED));
  };
  const save = async (key: SiteContentKey, value: unknown) => { await call('PUT', { key, value }); await after(); };
  const reset = async (key: SiteContentKey) => { await call('DELETE', { key }); await after(); };

  return <section aria-labelledby="website-heading" className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id="website-heading" className="font-display text-2xl font-bold">Website content</h2>
        <p className="mt-1 max-w-2xl text-sm text-charcoal-light">Change what visitors see on the live site. Nothing here touches farmers&apos; records. Each part has a built-in version you can go back to, and earlier versions are kept in the database.</p>
      </div>
      <a className="btn btn-secondary" href="/" target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" />View the website</a>
    </div>
    <p className="rounded-xl bg-sage/10 p-3 text-sm text-charcoal-light">Subscriptions themselves (who is on which plan, payments, trials) are managed in the <strong>Accounts</strong> tab. Enquiries from the contact form are in the <strong>Enquiries</strong> tab.</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {!loaded && !error && <p className="text-sm text-charcoal-muted">Loading…</p>}
    {loaded && <>
      <ContactCard loaded={loaded} save={save} reset={reset} />
      <PricesCard loaded={loaded} save={save} reset={reset} />
      <TestimonialsCard loaded={loaded} save={save} reset={reset} />
      <FaqCard loaded={loaded} save={save} reset={reset} />
    </>}
  </section>;
}
