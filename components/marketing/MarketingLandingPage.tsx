'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { farmToday } from '@/lib/dates';
import { PLANS, PLAN_ORDER, TRIAL_DAYS, formatKsh, type PlanId, type SelfServePlanId } from '@/lib/plans';
import { hasDialableNumber } from '@/lib/contact';
import { planFeatureLines } from '@/lib/plan-copy';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Mail,
  Menu,
  MessageCircle,
  MessageSquare,
  Phone,
  X,
} from 'lucide-react';
import { ALL_LINKS, COMMUNITY_SECTION, FEATURES, HERO_PROOF, NAV_LINKS, PREVIEW_TABS, PROBLEMS, SAMPLE_TESTIMONIALS, STEPS, buildFaqs, type PreviewTab } from './content';
import { useSiteContent } from '@/components/site/SiteContentProvider';
import { phoneHref, priceOf, whatsappDigits } from '@/lib/site-content';

interface MarketingLandingPageProps {
  onOpenAuth: (mode: 'login' | 'signup', plan?: SelfServePlanId) => void;
  onExploreDemo: () => void;
}

const PLAN_COPY: Record<SelfServePlanId, { headline: string; blurb: string; points: string[]; featured?: boolean }> = {
  starter: {
    headline: 'For farmers going digital',
    blurb: 'For farmers beginning to digitize their farm records.',
    points: [`Up to ${PLANS.starter.cowLimit} cows`],
  },
  farmer: {
    headline: 'For growing dairy farms',
    blurb: 'For growing dairy farms needing additional tracking and reporting.',
    points: [`Up to ${PLANS.farmer.cowLimit} cows`],
    featured: true,
  },
  farm_pro: {
    headline: 'For commercial herds',
    blurb: 'For larger operations requiring advanced features.',
    points: ['Unlimited herd capacity', 'Priority WhatsApp and phone assistance'],
  },
};

const CUSTOM_PLAN_SUBJECT = 'Custom plan:';

const checklistText = (contact: { phone: string; email: string }) => `MYLKIO FREE DAIRY FARM RECORD-KEEPING CHECKLIST
Developed by Versaly Labs for Kenyan Dairy Farmers
==================================================

DAILY OPERATIONS:
[ ] 1. Morning Yield Recorded (Farm Total or Cow-by-Cow)
[ ] 2. Evening Yield Recorded
[ ] 3. Milk Allocation Logged (Co-op Delivery, Direct Buyers, Calf feeding, Household)
[ ] 4. Co-op Delivery Chit verified (recorded litres vs driver slip)

WEEKLY HEALTH & HYGIENE:
[ ] 5. Teat dipping & mastitis California Mastitis Test (CMT) check
[ ] 6. Milk withdrawal inspection (cows receiving PenStrep or other antibiotics)
[ ] 7. Feed stock audit (Dairy meal, silage, Rhodes grass, mineral salts)

MONTHLY RECONCILIATION:
[ ] 8. Co-op payout statement reconciled against delivery log
[ ] 9. Feed & vet operating expenses tallied against milk income
[ ] 10. AI pregnancy check due dates verified (60-90 days post-insemination)

Get full digital automation with Mylkio: https://mylkio.co.ke
Support Phone & WhatsApp: ${contact.phone}
Support Email: ${contact.email}`;

/** Every section heading: Quicksand set heavy and tight, no label above it. */
function SectionHeading({ title, align = 'left', light = false }: { title: React.ReactNode; align?: 'center' | 'left'; light?: boolean }) {
  return (
    <h2 className={`max-w-3xl font-display text-display-lg [text-wrap:balance] ${align === 'center' ? 'mx-auto text-center' : ''} ${light ? 'text-white' : 'text-charcoal'}`}>{title}</h2>
  );
}

/** The hero photo: a Holstein on pasture (Unsplash), sized per screen. */
const HERO_PHOTO = 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop';
const SEC = 'py-16 sm:py-20 lg:py-24';
/** The slip-yellow button, used only on the forest ground. */
const CHIT_BTN = 'btn bg-chit text-forest hover:-translate-y-0.5 hover:bg-chit-deep focus-visible:ring-chit focus-visible:ring-offset-forest';

/** The page's one bold element: a co-op delivery slip, perforated along the top. Used twice, no more. */
function Slip({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`relative drop-shadow-[0_24px_40px_rgba(10,25,18,0.35)] ${className}`}>
      <div className="slip-paper rounded-b-xl bg-chit px-6 pb-6 pt-7 text-forest sm:px-7">{children}</div>
    </div>
  );
}

/** One line of a slip: the label, a dotted leader, and the figure. */
function Leader({ k, v, tone = '' }: { k: string; v: string; tone?: string }) {
  return (
    <div className={`flex items-baseline gap-2 ${tone}`}>
      <dt className="whitespace-nowrap">{k}</dt>
      <span aria-hidden className="min-w-4 flex-1 translate-y-[-0.2em] border-b-2 border-dotted border-forest/25" />
      <dd className="whitespace-nowrap font-bold tabular-nums">{v}</dd>
    </div>
  );
}

/** A round rubber stamp pressed onto a slip. Decorative: the words are also on the slip. */
function Stamp({ label, className = '' }: { label: string; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className={`pointer-events-none opacity-90 mix-blend-multiply ${className}`}>
      <defs><path id={`stamp-${label}`} d="M60 60 m-41 0 a41 41 0 1 1 82 0 a41 41 0 1 1 -82 0" /></defs>
      <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="60" cy="60" r="31" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text fill="currentColor" fontSize="11.5" fontWeight="700" letterSpacing="2.2">
        <textPath href={`#stamp-${label}`}>{`MYLKIO  ✦  ${label.toUpperCase()}  ✦`}</textPath>
      </text>
      <path d="M47 61 l9 9 l18 -20" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const MarketingLandingPage: React.FC<MarketingLandingPageProps> = ({
  onOpenAuth,
  onExploreDemo,
}) => {
  const content = useSiteContent();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('dashboard');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Free checklist
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadCounty, setLeadCounty] = useState('');
  const [leadCows, setLeadCows] = useState('5');
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  // Contact form
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactCounty, setContactCounty] = useState('');
  const [contactCows, setContactCows] = useState('6-15');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactSending, setContactSending] = useState(false);
  const [contactError, setContactError] = useState('');

  const { contact, prices } = content;
  const faqs = useMemo(() => content.faqs ?? buildFaqs(prices), [content.faqs, prices]);
  const approvedTestimonials = (content.testimonials ?? SAMPLE_TESTIMONIALS).filter((t) => t.approved);
  const onlySamples = approvedTestimonials.every((t) => t.sample);
  const someSamples = approvedTestimonials.some((t) => t.sample);
  // Until a real support number is set, "WhatsApp" buttons are not shown and enquiries go by the form or email.
  const hasWhatsapp = hasDialableNumber(contact.whatsapp);
  const whatsappUrl = `https://wa.me/${whatsappDigits(contact)}?text=Hello%20Mylkio,%20I%20would%20like%20to%20inquire%20about%20the%20dairy%20management%20system.`;
  const customWhatsappUrl = `https://wa.me/${whatsappDigits(contact)}?text=${encodeURIComponent('Hello Mylkio, I would like to talk about a Custom plan for my farm or cooperative.')}`;

  // "Talk to us" on the Custom plan: opens the contact form with the subject filled in.
  const openCustomEnquiry = () => {
    setContactMessage((m) => (m.startsWith(CUSTOM_PLAN_SUBJECT) ? m : `${CUSTOM_PLAN_SUBJECT} ${m}`.trimEnd() + (m ? '' : ' ')));
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => document.getElementById('contact-message')?.focus({ preventScroll: true }), 600);
  };
  // The sign-up box links here (#custom-plan) because a Custom plan cannot be chosen at sign-up.
  useEffect(() => {
    const check = () => { if (window.location.hash === '#custom-plan') { openCustomEnquiry(); history.replaceState(null, '', window.location.pathname + window.location.search); } };
    check();
    window.addEventListener('hashchange', check);
    return () => window.removeEventListener('hashchange', check);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The phone menu: closes on Escape, and the page behind it does not scroll while it is open.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

  useEffect(() => {
    if (!checklistOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeChecklist(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [checklistOpen]);

  // Enquiries are stored on the server. The visitor is only told "received" once that has happened.
  const sendLead = async (payload: Record<string, unknown>): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const response = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (response.ok) return { ok: true };
      const result = await response.json().catch(() => ({}));
      return { ok: false, error: result.error || 'We could not send your message. Please try again, or contact us on WhatsApp.' };
    } catch {
      return { ok: false, error: 'We could not reach the server. Check your connection and try again, or contact us on WhatsApp.' };
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim() || contactSending) return;
    setContactSending(true);
    setContactError('');
    const result = await sendLead({
      name: contactName.trim(),
      phone: contactPhone.trim(),
      county: contactCounty.trim() || undefined,
      cowsCount: contactCows === 'cooperative' ? 100 : Number(contactCows.split('-')[0]) || 10,
      preferredContact: 'call',
      message: contactMessage.trim() || 'Inquiry from Website Contact Form',
      source: 'Website Contact Section',
    });
    setContactSending(false);
    if (!result.ok) {
      setContactSubmitted(false);
      setContactError(result.error);
      return;
    }
    setContactSubmitted(true);
    setContactName('');
    setContactPhone('');
    setContactCounty('');
    setContactMessage('');
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !leadPhone.trim()) return;
    // The visitor asked for the checklist, so they get it even if recording their details fails.
    void sendLead({
      name: leadName.trim(),
      phone: leadPhone.trim(),
      county: leadCounty.trim() || undefined,
      cowsCount: Number(leadCows) || undefined,
      preferredContact: 'whatsapp',
      message: 'Downloaded Free Dairy Farm Record-Keeping Checklist',
      source: 'Lead Magnet Modal',
    });
    setLeadSubmitted(true);
  };

  const downloadChecklist = () => {
    const blob = new Blob([checklistText(contact)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Mylkio_Dairy_Record_Checklist_${farmToday()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  function closeChecklist() {
    setChecklistOpen(false);
    setLeadSubmitted(false);
  }

  const startTrial = (plan?: SelfServePlanId) => onOpenAuth('signup', plan);
  const solidHeader = scrolled || menuOpen;

  return (
    <div id="top" className="min-h-screen overflow-x-clip bg-milk font-sans font-medium text-charcoal antialiased selection:bg-chit/60">
      {/* ───────────── Header: clear over the dark hero, milk-white once the page scrolls ───────────── */}
      <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${solidHeader ? 'border-b border-rule bg-milk/95 backdrop-blur-xl' : 'border-b border-transparent'}`}>
        <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-20">
          <a href="#top" className="flex shrink-0 items-center gap-3" aria-label="Mylkio home">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-chit font-display text-xl font-bold text-forest">M</span>
            <span className="leading-tight">
              <span className={`block font-display text-xl font-bold tracking-tight ${solidHeader ? 'text-charcoal' : 'text-white'}`}>Mylkio</span>
              <span className={`hidden whitespace-nowrap text-xs font-semibold xl:block ${solidHeader ? 'text-charcoal-muted' : 'text-white/70'}`}>by Versaly, for Kenyan dairy</span>
            </span>
          </a>

          <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={`link-slide whitespace-nowrap text-sm font-semibold ${solidHeader ? 'text-charcoal hover:text-sage' : 'text-white/90 hover:text-white'}`}>{link.label}</a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <button onClick={() => onOpenAuth('login')} className={`btn ${solidHeader ? 'btn-ghost' : 'text-white hover:bg-white/10'}`}>Sign in</button>
            <button onClick={onExploreDemo} className={`btn hidden xl:inline-flex ${solidHeader ? 'btn-secondary' : 'btn-on-dark'}`}>Explore demo</button>
            <button onClick={() => startTrial()} className={solidHeader ? 'btn btn-primary' : CHIT_BTN}>Start free trial</button>
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <button onClick={() => onOpenAuth('login')} className={`btn px-3 ${solidHeader ? 'btn-ghost' : 'text-white hover:bg-white/10'}`}>Sign in</button>
            <button
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className={`flex h-11 w-11 items-center justify-center rounded-full ${solidHeader ? 'text-charcoal hover:bg-sage/10' : 'text-white hover:bg-white/10'}`}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div id="mobile-menu" className="max-h-[calc(100dvh-4rem)] animate-fade-in overflow-y-auto border-t border-rule bg-milk lg:hidden">
            <div className="container-page py-4">
              {ALL_LINKS.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="flex min-h-14 items-center justify-between border-b border-rule px-1 text-lg font-semibold text-charcoal">
                  <span>{link.label}</span>
                  <ChevronRight className="h-5 w-5 text-charcoal-subtle" />
                </a>
              ))}
              <div className="grid grid-cols-1 gap-3 pt-5 sm:grid-cols-2">
                <button onClick={() => { setMenuOpen(false); onExploreDemo(); }} className="btn btn-secondary btn-lg">Explore the demo farm</button>
                <button onClick={() => { setMenuOpen(false); startTrial(); }} className="btn btn-primary btn-lg">Start free trial</button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ───────────── Hero: the pasture under a flat forest wash, and the day's milk slip ───────────── */}
      <section className="relative isolate bg-forest text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${HERO_PHOTO}&w=1600&q=70`}
          srcSet={`${HERO_PHOTO}&w=800&q=60 800w, ${HERO_PHOTO}&w=1600&q=70 1600w, ${HERO_PHOTO}&w=2400&q=70 2400w`}
          sizes="100vw"
          alt=""
          aria-hidden
          fetchPriority="high"
          className="absolute inset-0 -z-10 h-full w-full object-cover object-[35%_50%]"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-forest/70 lg:bg-gradient-to-r lg:from-forest/90 lg:from-25% lg:via-forest/55 lg:to-forest/5" />

        <div className="container-page grid grid-cols-1 items-center gap-14 pb-16 pt-28 sm:pt-32 lg:min-h-[min(100svh,54rem)] lg:grid-cols-12 lg:gap-10 lg:pb-20 lg:pt-28">
          <div className="lg:col-span-7">
            <h1 className="font-display text-display-xl text-white lg:text-[clamp(3.5rem,1rem+3.9vw,4.75rem)] [text-wrap:balance]">
              Every litre counted. Every shilling accounted for.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl">
              Track every litre of milk, manage your cows, and know where your farm income goes, all from your phone.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button onClick={() => startTrial()} className={`${CHIT_BTN} btn-lg w-full sm:w-auto`}>Start managing your farm</button>
              <button onClick={onExploreDemo} className="btn btn-lg btn-on-dark w-full sm:w-auto">See how Mylkio works</button>
            </div>
            <p className="mt-8 text-sm font-semibold text-white/70">{HERO_PROOF.join(". ")}.</p>
          </div>

          {/* The right side tells the morning in two objects: the reminder on the phone, then the day's slip. */}
          <div className="relative mx-auto w-full max-w-sm pt-20 sm:pt-24 lg:col-span-5 lg:mr-0 lg:max-w-[27rem] lg:pt-28 xl:max-w-[30rem]">
            <div className="absolute left-0 right-8 top-0 z-10 rotate-[2deg] animate-rise rounded-2xl bg-white/95 p-4 text-charcoal shadow-[0_24px_50px_-20px_rgba(10,25,18,0.6)] backdrop-blur sm:-left-10 sm:right-12 lg:-left-6 lg:right-14 lg:p-5" style={{ animationDelay: '0.25s' }}>
              <div className="flex items-center gap-2.5">
                <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-forest text-sm font-bold text-chit">M</span>
                <p className="text-sm font-bold">Mylkio</p>
                <p className="ml-auto text-xs font-semibold text-charcoal-muted">6:30 AM</p>
              </div>
              <p className="mt-2 font-bold leading-snug">2 reminders today (1 overdue)</p>
              <p className="text-sm text-charcoal-light">Deworm calves; Vaccinate Zawadi</p>
            </div>
            <Slip className="rotate-[-1.5deg] animate-rise">
              <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-forest/30 pb-3">
                <p className="text-lg font-bold">Green Hills Dairy</p>
                <p className="whitespace-nowrap text-sm font-semibold text-forest/70">Tue 24 Nov</p>
              </div>
              <dl className="space-y-2.5 py-4 text-[0.95rem]">
                <Leader k="Morning milking" v="24.0 L" />
                <Leader k="Evening milking" v="18.5 L" />
                <Leader k="To Baraka Co-op" v="34.0 L" />
                <Leader k="Household and calves" v="8.5 L" />
              </dl>
              <div className="flex items-baseline justify-between gap-3 border-t-2 border-forest pt-3">
                <p className="font-semibold">Owed at KSh 50 a litre</p>
                <p className="whitespace-nowrap font-display text-2xl font-bold tabular-nums">KSh 1,700</p>
              </div>
              <p className="mt-3 text-xs font-semibold text-forest/60">Sample farm data</p>
              <Stamp className="absolute -bottom-10 -right-4 h-24 w-24 -rotate-12 text-sage sm:-right-8" label="Synced offline" />
            </Slip>
          </div>
        </div>
      </section>

      {/* ───────────── The problem, beside a farm that has it sorted ───────────── */}
      <section className={SEC}>
        <div className="container-page grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <SectionHeading title="Running a dairy farm is hard enough. Your records shouldn't make it harder." />
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-charcoal-light">
              When records are scattered, it is harder to spot missing deliveries, follow up on payments, or see how costs affect income.
            </p>
            <ul className="mt-10 border-b border-rule">
              {PROBLEMS.map(({ icon: Icon, title, body, href, tab }) => (
                <li key={title} className="grid grid-cols-[2rem_1fr] gap-x-4 border-t border-rule py-6 sm:grid-cols-[2.5rem_1fr]">
                  <Icon aria-hidden strokeWidth={1.5} className="mt-0.5 h-7 w-7 text-sage" />
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-charcoal">{title}</h3>
                    <p className="mt-2 max-w-xl leading-relaxed text-charcoal-light">{body}</p>
                    <a href={href} onClick={() => setPreviewTab(tab)} className="link-slide mt-3 inline-block text-sm font-bold text-sage">See how Mylkio helps</a>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <figure className="lg:col-span-5">
            <div className="relative overflow-hidden rounded-2xl lg:sticky lg:top-28">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/hero-dairy.jpg" alt="Holstein cows at the feed barrier on a dairy farm" width={1200} height={800} loading="lazy" className="aspect-[4/5] w-full object-cover" />
              <div className="absolute inset-x-4 bottom-4 rounded-xl bg-white p-4 sm:inset-x-5 sm:bottom-5">
                <div className="flex items-center justify-between gap-3 border-b border-rule pb-3">
                  <span className="truncate text-sm font-bold">Green Hills Dairy, Nakuru</span>
                  <span className="whitespace-nowrap text-xs font-bold text-sage">Synced offline</span>
                </div>
                <dl className="grid grid-cols-3 gap-2 pt-3">
                  {[
                    { k: 'Today', v: '42.5 L' },
                    { k: 'To co-op', v: '34.0 L' },
                    { k: 'This month', v: 'KSh 48,200' },
                  ].map(({ k, v }) => (
                    <div key={k}>
                      <dt className="whitespace-nowrap text-xs font-semibold text-charcoal-muted">{k}</dt>
                      <dd className="whitespace-nowrap text-base font-bold tabular-nums sm:text-lg">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
            <figcaption className="mt-3 text-sm text-charcoal-muted">Sample farm data. There&apos;s a simpler way to manage it all.</figcaption>
          </figure>
        </div>
      </section>

      {/* ───────────── Features: an index, not a wall of cards ───────────── */}
      <section id="features" className={`${SEC} scroll-mt-20 bg-white`}>
        <div className="container-page">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7"><SectionHeading title="Milk, herd care, sales and farm costs in one system." /></div>
            <p className="max-w-md text-lg leading-relaxed text-charcoal-light lg:col-span-5 lg:justify-self-end">
              Record daily production, follow cow health and breeding, reconcile deliveries, and review expenses from your phone, even when signal is limited.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body, points }) => (
              <article key={title} className="border-t border-rule pt-6">
                <Icon aria-hidden strokeWidth={1.5} className="h-8 w-8 text-sage" />
                <h3 className="mt-5 text-xl font-bold leading-snug tracking-tight text-charcoal">{title}</h3>
                <p className="mt-3 leading-relaxed text-charcoal-light">{body}</p>
                <ul className="mt-4 space-y-2">
                  {points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm text-charcoal-muted">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" strokeWidth={2.5} />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Milk payments: the statement, as a slip ───────────── */}
      <section id="payments" className={`${SEC} scroll-mt-20 bg-forest text-white`}>
        <div className="container-page grid grid-cols-1 items-center gap-14 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <SectionHeading light title="Delivered the milk? Keep track of every shilling you're owed." />
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">
              Whether you sell to a cooperative or individual customers, Mylkio keeps a clear record of milk delivered, payments received, and outstanding balances.
            </p>
            <p className="mt-8 max-w-xl border-l-2 border-chit pl-5 leading-relaxed text-white/85">
              <strong className="font-bold text-chit">Keep a dated record of every delivery.</strong> At month-end, compare your Mylkio records with the co-op statement and follow up on any differences in litres, deductions, or payments.
            </p>
          </div>

          <div className="lg:col-span-6">
            <Slip className="mx-auto max-w-md rotate-[1deg] lg:mr-0">
              <div className="border-b border-dashed border-forest/30 pb-4">
                <p className="text-sm font-semibold text-forest/70">Monthly statement, example</p>
                <h3 className="mt-1 text-xl font-bold">Baraka Dairy Farmers Co-op</h3>
              </div>
              <dl className="space-y-3 py-5">
                <Leader k="Milk delivered" v="850 litres" />
                <Leader k="Agreed price" v="KSh 50 a litre" />
                <Leader k="Gross value" v="KSh 42,500" />
                <Leader k="Recorded deductions" v="− KSh 2,500" tone="text-[#8E2A22]" />
              </dl>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t-2 border-forest pt-4">
                <p className="font-bold">Expected net payment</p>
                <p className="whitespace-nowrap font-display text-4xl font-bold tabular-nums">KSh 40,000</p>
              </div>
              <p className="mt-4 text-xs font-semibold text-forest/60">Illustrative reconciliation, calculated from logged deliveries.</p>
              <Stamp className="absolute -right-4 -top-14 h-28 w-28 rotate-12 text-sage sm:-right-10" label="Reconciled" />
            </Slip>
          </div>
        </div>
      </section>

      {/* ───────────── Community ───────────── */}
      <section id="community" className={`${SEC} scroll-mt-20`}>
        <div className="container-page grid grid-cols-1 items-center gap-14 lg:grid-cols-12">
          <div className="lg:order-2 lg:col-span-7">
            <SectionHeading title={COMMUNITY_SECTION.title} />
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-charcoal-light">{COMMUNITY_SECTION.intro}</p>
            <ul className="mt-8 border-b border-rule">
              {COMMUNITY_SECTION.points.map((point) => (
                <li key={point} className="flex items-start gap-3 border-t border-rule py-3.5 text-charcoal-light">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-sage" strokeWidth={2.5} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => startTrial('farm_pro')} className="btn btn-lg btn-primary">Try it with Farm Pro</button>
              <button onClick={openCustomEnquiry} className="btn btn-lg btn-secondary">Run a SACCO? Talk to us</button>
            </div>
          </div>

          <div className="lg:order-1 lg:col-span-5">
            <div className="rounded-2xl border border-rule bg-white p-5 sm:p-7">
              <div className="flex items-center gap-3 border-b border-rule pb-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage text-white"><MessageSquare className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold">{COMMUNITY_SECTION.example.group}</h3>
                  <p className="text-sm text-charcoal-muted">Set up by Mylkio. An example group.</p>
                </div>
              </div>
              <ul className="space-y-4 pt-5">
                {COMMUNITY_SECTION.example.posts.map((post, i) => (
                  <li key={post.text} className={`max-w-[88%] ${i % 2 ? 'ml-auto' : ''}`}>
                    <div className={`rounded-2xl px-4 py-3 ${i % 2 ? 'rounded-br-md bg-sage text-white' : 'rounded-bl-md bg-milk text-charcoal'}`}>
                      <p className={`text-xs font-bold ${i % 2 ? 'text-white/75' : 'text-charcoal-muted'}`}>{post.who}</p>
                      <p className="mt-1">{post.text}</p>
                    </div>
                    <p className={`mt-1.5 text-xs font-semibold text-sage ${i % 2 ? 'text-right' : ''}`}>{post.replies === 0 ? 'Reply' : `${post.replies} replies`}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-rule pt-4 text-xs text-charcoal-muted">
                Guidance from neighbours is not a diagnosis: call a vet for a sick animal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── How it works: a real sequence, so it is numbered ───────────── */}
      <section id="how-it-works" className={`${SEC} scroll-mt-20 bg-white`}>
        <div className="container-page">
          <SectionHeading title="From notebook to organised farm records in three steps." />
          <ol className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, index) => (
              <li key={step.title} className="border-t-2 border-forest pt-6">
                <span className="font-display text-5xl font-bold tabular-nums text-sage">{index + 1}</span>
                <h3 className="mt-4 text-xl font-bold tracking-tight">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-charcoal-light">{step.body}</p>
              </li>
            ))}
          </ol>
          <button onClick={() => startTrial()} className="btn btn-primary btn-lg mt-12">Get started with Mylkio</button>
        </div>
      </section>

      {/* ───────────── Product preview: the app as people use it, on a phone ───────────── */}
      <section id="preview" className={`${SEC} scroll-mt-20 overflow-hidden`}>
        <div className="container-page grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <SectionHeading title="See what a more organised dairy farm looks like." />
            <div role="tablist" aria-label="Product preview" aria-orientation="vertical" className="mt-10 border-b border-rule">
              {PREVIEW_TABS.map((tab) => {
                const on = previewTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    role="tab"
                    id={`preview-tab-${tab.key}`}
                    aria-selected={on}
                    aria-controls="preview-panel"
                    onClick={() => setPreviewTab(tab.key)}
                    className={`group grid w-full grid-cols-[1fr_auto] items-center gap-x-4 border-t border-rule py-4 text-left transition-colors ${on ? '' : 'hover:text-sage'}`}
                  >
                    <span className={`text-xl font-bold tracking-tight ${on ? 'text-charcoal' : 'text-charcoal-muted group-hover:text-sage'}`}>{tab.label}</span>
                    <span aria-hidden className={`h-2.5 w-2.5 rounded-full transition-colors ${on ? 'bg-chit-deep ring-4 ring-chit/40' : 'bg-rule'}`} />
                    {on && <span className="col-span-2 mt-1.5 max-w-md animate-fade-in leading-relaxed text-charcoal-light">{PREVIEW_NOTES[tab.key]}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative mx-auto w-full max-w-[330px]">
              <div aria-hidden className="absolute -inset-x-16 top-16 bottom-8 -z-10 rounded-full bg-sage-200/60 blur-3xl" />
              <div className="rounded-[2.75rem] bg-forest p-2.5 shadow-[0_40px_80px_-30px_rgba(20,41,31,0.55)]">
                <div className="overflow-hidden rounded-[2.25rem] bg-milk">
                  <div className="bg-forest px-5 pb-4 pt-3 text-white">
                    <div aria-hidden className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-white/20" />
                    <p className="text-xs font-semibold text-white/60">Green Hills Dairy, Nakuru</p>
                    <p className="text-lg font-bold">{PREVIEW_TABS.find((t) => t.key === previewTab)?.label}</p>
                  </div>
                  <div role="tabpanel" id="preview-panel" aria-labelledby={`preview-tab-${previewTab}`} className="h-[400px] animate-fade-in overflow-hidden p-4" key={previewTab}>
                    <PreviewPanel tab={previewTab} />
                  </div>
                  <div aria-hidden className="grid grid-cols-5 border-t border-rule bg-white px-1 py-2.5">
                    {PREVIEW_TABS.map((tab) => (
                      <span key={tab.key} className={`truncate px-0.5 text-center text-[0.65rem] font-bold ${tab.key === previewTab ? 'text-sage' : 'text-charcoal-subtle'}`}>{tab.label.split(' ').pop()}</span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-center text-sm text-charcoal-muted">Sample farm data</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── Pricing ───────────── */}
      <section id="pricing" className={`${SEC} scroll-mt-20 bg-white`}>
        <div className="container-page">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7"><SectionHeading title="Simple pricing for farms of every size." /></div>
            <p className="max-w-md text-lg leading-relaxed text-charcoal-light lg:col-span-5 lg:justify-self-end">
              Every plan starts with a {TRIAL_DAYS}-day free trial. Pay monthly once it ends.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4">
            {PLAN_ORDER.map((id) => {
              const plan = PLANS[id];
              const copy = PLAN_COPY[id];
              const on = copy.featured;
              return (
                <article key={id} className={`relative flex flex-col rounded-2xl p-6 sm:p-7 ${on ? 'bg-forest text-white' : 'border border-rule bg-milk'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className={`font-bold ${on ? 'text-chit' : 'text-sage'}`}>{plan.name}</p>
                    {on && <span className="whitespace-nowrap rounded-full bg-chit px-3 py-1 text-xs font-bold text-forest">Recommended</span>}
                  </div>
                  <h3 className="mt-2 text-xl font-bold tracking-tight">{copy.headline}</h3>
                  <p className={`mt-1 text-sm ${on ? 'text-white/75' : 'text-charcoal-muted'}`}>{copy.blurb}</p>

                  <p className={`mt-6 flex items-baseline gap-1.5 whitespace-nowrap border-y py-5 ${on ? 'border-white/15' : 'border-rule'}`}>
                    <span className="font-display text-[2.25rem] font-bold leading-none tracking-tight tabular-nums">{formatKsh(priceOf(prices, id))}</span>
                    <span className={`text-sm ${on ? "text-white/70" : "text-charcoal-muted"}`}>a month</span>
                  </p>

                  <ul className="mt-6 flex-1 space-y-3">
                    {[copy.points[0], ...planFeatureLines(id), ...copy.points.slice(1)].map((point) => (
                      <li key={point} className={`flex items-start gap-2.5 text-[0.95rem] ${on ? 'text-white/85' : 'text-charcoal-light'}`}>
                        <Check className={`mt-1 h-4 w-4 shrink-0 ${on ? 'text-chit' : 'text-sage'}`} strokeWidth={2.5} />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>

                  <button onClick={() => startTrial(id)} className={`btn btn-lg mt-8 w-full ${on ? CHIT_BTN : 'btn-secondary'}`}>
                    Start {TRIAL_DAYS}-day free trial
                  </button>
                </article>
              );
            })}

            {/* Custom: quoted per farm, never chosen at sign-up */}
            <article className="relative flex flex-col rounded-2xl border border-dashed border-sage/50 p-6 sm:p-7">
              <p className="font-bold text-sage">{PLANS.custom.name}</p>
              <h3 className="mt-2 text-xl font-bold tracking-tight">For cooperatives and very large farms</h3>
              <p className="mt-1 text-sm text-charcoal-muted">A plan shaped around your farm or group, with a price agreed with you.</p>
              <p className="mt-6 whitespace-nowrap border-y border-rule py-5 font-display text-[2.5rem] font-bold leading-none tracking-tight">Talk to us</p>
              <ul className="mt-6 flex-1 space-y-3">
                {['Everything in Farm Pro', 'Team size set for your farm', 'Monthly price agreed with you', 'Anything beyond this is quoted and agreed with you first'].map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-[0.95rem] text-charcoal-light">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-sage" strokeWidth={2.5} />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <button onClick={openCustomEnquiry} className="btn btn-lg btn-secondary mt-8 w-full">Talk to us</button>
              {hasWhatsapp && <a href={customWhatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-lg btn-ghost mt-3 w-full">Message us on WhatsApp</a>}
            </article>
          </div>
        </div>
      </section>

      {/* ───────────── Farmer stories (real or clearly marked examples) ───────────── */}
      {approvedTestimonials.length > 0 && (
        <section className={SEC}>
          <div className="container-page">
            <SectionHeading title={onlySamples ? 'Built with Kenyan dairy farmers in mind.' : 'What dairy farmers say about Mylkio.'} />
            <p className="mt-5 max-w-2xl leading-relaxed text-charcoal-light">
              {!onlySamples ? (someSamples ? 'Feedback from farmers using Mylkio. Any story marked as an example is illustrative and not a real review.' : 'Feedback from farmers using Mylkio.') : 'These are example stories written to show how a farm could use Mylkio. They are not reviews from customers, and the names and figures are illustrative. Real farmer feedback will appear here once pilot farms agree to share it.'}
            </p>
            <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
              {approvedTestimonials.map((t) => (
                <figure key={t.id} className="flex flex-col justify-between gap-6 border-t border-rule pt-6">
                  <div>
                    {t.sample && <span className="inline-block whitespace-nowrap rounded-full bg-chit/70 px-3 py-1 text-xs font-bold text-forest">Example, not a real review</span>}
                    <blockquote className="mt-4 text-xl font-semibold leading-snug tracking-tight text-charcoal">&ldquo;{t.quote}&rdquo;</blockquote>
                  </div>
                  <figcaption>
                    <p className="font-bold">{t.farmerName}{t.sample && <span className="font-medium text-charcoal-muted"> (example)</span>}</p>
                    <p className="text-sm text-charcoal-muted">{[t.farmName, t.county].filter(Boolean).join(', ')}, {t.cowsCount} cows</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────────── Free checklist ───────────── */}
      <section className="pb-16 sm:pb-20">
        <div className="container-page">
          <div className="grid grid-cols-1 items-center gap-6 rounded-2xl border border-rule bg-white p-7 sm:p-10 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <h2 className="font-display text-display-md [text-wrap:balance]">Not ready for software yet? Start with better farm records.</h2>
              <p className="mt-3 max-w-2xl leading-relaxed text-charcoal-light">
                Get our free dairy farm record-keeping checklist covering daily milk production, milk deliveries, cow health dates, breeding activities, farm expenses, and customer payments.
              </p>
            </div>
            <div className="lg:col-span-4 lg:justify-self-end">
              <button onClick={() => setChecklistOpen(true)} className="btn btn-primary btn-lg w-full sm:w-auto">
                <Download className="h-5 w-5" />
                <span>Get the free checklist</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── FAQs ───────────── */}
      <section id="faqs" className={`${SEC} scroll-mt-20 bg-white`}>
        <div className="container-page grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeading title="Questions farmers ask us" />
          </div>
          <div className="border-b border-rule lg:col-span-8">
            {faqs.map((faq, index) => {
              const open = openFaq === index;
              return (
                <div key={faq.q} className="border-t border-rule">
                  <h3>
                    <button
                      onClick={() => setOpenFaq(open ? null : index)}
                      aria-expanded={open}
                      aria-controls={`faq-${index}`}
                      className="flex min-h-16 w-full items-center justify-between gap-4 py-4 text-left text-lg font-bold text-charcoal hover:text-sage"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown className={`h-5 w-5 shrink-0 text-sage transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
                    </button>
                  </h3>
                  {open && (
                    <div id={`faq-${index}`} className="animate-fade-in max-w-2xl pb-6 leading-relaxed text-charcoal-light">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────── Contact ───────────── */}
      <section id="contact" className={`${SEC} scroll-mt-20`}>
        <div className="container-page grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading title="Talk directly with our Kenyan team." />
            <p className="mt-5 max-w-md text-lg leading-relaxed text-charcoal-light">
              Questions about getting your farm started, cooperative payment tracking, or subscribing? We are here to help.
            </p>
            <ul className="mt-8 border-b border-rule">
              {[
                { href: phoneHref(contact), icon: Phone, label: 'Call us', value: contact.phone, note: 'Monday to Saturday, 7:00 AM to 7:00 PM', external: false },
                ...(hasWhatsapp ? [{ href: whatsappUrl as string | undefined, icon: MessageSquare, label: 'WhatsApp', value: contact.whatsapp, note: 'Quick answers on setup and questions', external: true }] : []),
                { href: `mailto:${contact.email}` as string | undefined, icon: Mail, label: 'Email', value: contact.email, note: 'For cooperative partnerships and billing', external: false },
              ].map(({ href, icon: Icon, label, value, note, external }) => (
                <li key={label} className="border-t border-rule">
                  <a
                    {...(href ? { href } : {})}
                    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="group grid grid-cols-[2rem_1fr] gap-x-3 py-4"
                  >
                    <Icon aria-hidden strokeWidth={1.75} className="mt-0.5 h-6 w-6 text-sage" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-charcoal-muted">{label}</span>
                      <span className="block truncate text-lg font-bold group-hover:text-sage">{value}</span>
                      <span className="block text-sm text-charcoal-muted">{note}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-rule bg-white p-6 sm:p-8 lg:col-span-7">
            <h3 className="font-display text-2xl font-bold tracking-tight">Send us a message</h3>
            <p className="mb-6 mt-1 text-charcoal-muted">Fill in the details below and our team will get back to you shortly.</p>

            <form onSubmit={handleContactSubmit} className="space-y-4">
              {contactError && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                  {contactError}{' '}
                  {hasWhatsapp ? <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-bold underline">Message us on WhatsApp</a> : <a href={`mailto:${contact.email}`} className="font-bold underline">Email us</a>}
                </div>
              )}
              {contactSubmitted && (
                <div role="status" className="flex items-start gap-2 rounded-xl border border-sage-300 bg-sage/10 p-4 text-sm font-semibold text-charcoal">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                  <span>Thank you! Your message has been received. Our team will contact you shortly via phone or WhatsApp.</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="field-label">Your name *</label>
                  <input id="contact-name" type="text" required value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. John Mwangi" className="field" autoComplete="name" />
                </div>
                <div>
                  <label htmlFor="contact-phone" className="field-label">Phone / WhatsApp *</label>
                  <input id="contact-phone" type="tel" required value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="e.g. 0718 123 456" className="field" autoComplete="tel" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-county" className="field-label">County / location</label>
                  <input id="contact-county" type="text" value={contactCounty} onChange={(e) => setContactCounty(e.target.value)} placeholder="e.g. Nakuru, Kiambu, Meru" className="field" />
                </div>
                <div>
                  <label htmlFor="contact-herd" className="field-label">Estimated herd size</label>
                  <select id="contact-herd" value={contactCows} onChange={(e) => setContactCows(e.target.value)} className="field">
                    <option value="1-5">1 – 5 cows (Starter)</option>
                    <option value="6-15">6 – 15 cows (Farmer)</option>
                    <option value="16-30">16 – 30 cows (Pro)</option>
                    <option value="31+">31+ cows (Commercial)</option>
                    <option value="cooperative">Dairy cooperative / group</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="contact-message" className="field-label">Message or question</label>
                <textarea id="contact-message" rows={4} value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} placeholder="Tell us about your dairy farm or ask any questions" className="field" />
              </div>
              <button type="submit" disabled={contactSending} className="btn btn-primary btn-lg w-full sm:w-auto">
                {contactSending ? 'Sending…' : 'Send message'}
              </button>
              <p className="text-sm text-charcoal-muted">We use your details only to reply to you. See our <a href="/privacy" className="font-bold text-sage underline">Privacy notice</a>.</p>
            </form>
          </div>
        </div>
      </section>

      {/* ───────────── Final call to action, then the footer, on one forest ground ───────────── */}
      <footer className="bg-forest text-white">
        <div className="container-page pb-10 pt-16 sm:pt-20">
          <div className="relative flex flex-col gap-8 border-b border-white/15 pb-14 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="font-display text-display-lg [text-wrap:balance]">Your farm deserves better than guesswork.</h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/75">
                Bring your cows, milk records, farm activities, and payments into one simple place with Mylkio.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={() => startTrial()} className={`${CHIT_BTN} btn-lg w-full sm:w-auto`}>Start managing your farm</button>
              {hasWhatsapp
                ? <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn btn-lg btn-on-dark w-full sm:w-auto"><MessageCircle className="h-5 w-5" /><span>Talk to our team</span></a>
                : <a href="#contact" className="btn btn-lg btn-on-dark w-full sm:w-auto"><MessageCircle className="h-5 w-5" /><span>Talk to our team</span></a>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-10 pt-12 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-chit font-display text-xl font-bold text-forest">M</span>
                <span className="font-display text-xl font-bold">Mylkio</span>
              </div>
              <p className="mt-4 max-w-xs leading-relaxed text-white/70">Smarter dairy farming, made simple. Mylkio is developed by Versaly, building practical software for Kenyan dairy farmers.</p>
            </div>
            <nav aria-label="Footer">
              <p className="font-bold text-chit">Explore</p>
              <ul className="mt-4 space-y-2.5">
                {ALL_LINKS.map((link) => (
                  <li key={link.href}><a href={link.href} className="link-slide whitespace-nowrap text-white/80 hover:text-white">{link.label}</a></li>
                ))}
              </ul>
            </nav>
            <div>
              <p className="font-bold text-chit">Get in touch</p>
              <ul className="mt-4 space-y-2.5">
                <li>{phoneHref(contact) ? <a href={phoneHref(contact)} className="whitespace-nowrap text-white/80 hover:text-white">{contact.phone}</a> : <span className="text-white/80">{contact.phone}</span>}</li>
                <li><a href={`mailto:${contact.email}`} className="break-all text-white/80 hover:text-white">{contact.email}</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-2 border-t border-white/15 pt-6 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Mylkio by Versaly. Built for Kenyan dairy farmers.</span>
            <span className="flex flex-wrap gap-x-5 gap-y-1">
              <a href="/privacy" className="link-slide whitespace-nowrap hover:text-white">Privacy notice</a>
              <a href="/terms" className="link-slide whitespace-nowrap hover:text-white">Terms of use</a>
            </span>
          </div>
        </div>
      </footer>

      {/* ───────────── Free checklist dialog ───────────── */}
      {checklistOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-charcoal/60 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4" onClick={closeChecklist}>
          <div role="dialog" aria-modal="true" aria-labelledby="checklist-title" onClick={(e) => e.stopPropagation()} className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-ivory-border bg-white p-6 shadow-lift sm:rounded-3xl sm:p-8">
            <button onClick={closeChecklist} aria-label="Close" className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-charcoal-muted hover:bg-sage/10 hover:text-charcoal">
              <X className="h-5 w-5" />
            </button>

            {!leadSubmitted ? (
              <form onSubmit={handleLeadSubmit} className="space-y-4">
                <span className="icon-tile"><FileText className="h-6 w-6" /></span>
                <div>
                  <h3 id="checklist-title" className="font-display text-2xl font-medium leading-tight">Get our free dairy farm record-keeping checklist</h3>
                  <p className="mt-2 text-base text-charcoal-muted">Add your details to unlock an immediate download of the checklist.</p>
                </div>
                <div>
                  <label htmlFor="lead-name" className="field-label">Your name *</label>
                  <input id="lead-name" type="text" required value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="e.g. David Mwangi" className="field" autoComplete="name" />
                </div>
                <div>
                  <label htmlFor="lead-phone" className="field-label">Phone / WhatsApp *</label>
                  <input id="lead-phone" type="tel" required value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} placeholder="e.g. 0718 123 456" className="field" autoComplete="tel" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="lead-county" className="field-label">County</label>
                    <input id="lead-county" type="text" value={leadCounty} onChange={(e) => setLeadCounty(e.target.value)} placeholder="e.g. Nakuru" className="field" />
                  </div>
                  <div>
                    <label htmlFor="lead-cows" className="field-label">Cows</label>
                    <input id="lead-cows" type="number" inputMode="numeric" min={0} value={leadCows} onChange={(e) => setLeadCows(e.target.value)} placeholder="e.g. 6" className="field" />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-lg mt-2 w-full">
                  <Download className="h-5 w-5" />
                  <span>Get the free checklist</span>
                </button>
              </form>
            ) : (
              <div className="animate-fade-in space-y-5 py-6 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sage/10 text-sage"><Check className="h-7 w-7 stroke-[3]" /></span>
                <div>
                  <h3 className="font-display text-2xl font-medium">Your checklist is ready</h3>
                  <p className="mt-2 text-base text-charcoal-muted">Thank you, {leadName}. Click the button below to download your printable file immediately.</p>
                </div>
                <button onClick={downloadChecklist} className="btn btn-primary btn-lg w-full">
                  <Download className="h-5 w-5" />
                  <span>Save checklist (.txt)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/** What each preview screen is for, shown beside the phone. */
const PREVIEW_NOTES: Record<PreviewTab, string> = {
  dashboard: "At a glance: today's milk, active cows, co-op deliveries, and the next vet follow-up.",
  milk: 'Record the farm total in under 20 seconds, or log cow by cow, with morning and evening summaries.',
  herd: 'Ear tags, breed, pregnancy status and lactation count, with a warning while a cow is on a milk withdrawal.',
  sales: 'Deliveries to your co-op and direct customers, with what each one has paid and still owes.',
  finance: 'Milk income against feed, vet and labour costs, so you see what the farm really earns.',
};

/** The five preview screens, drawn for the phone frame. Every figure is sample data. */
function PreviewPanel({ tab }: { tab: PreviewTab }) {
  const box = 'rounded-xl border border-rule bg-white p-3.5';
  if (tab === 'dashboard') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { k: "Today's milk", v: '42 L' },
            { k: 'Active cows', v: '6' },
            { k: 'Month sales', v: 'KSh 38,500' },
            { k: 'To the co-op', v: '34 L' },
          ].map(({ k, v }) => (
            <div key={k} className={box}>
              <p className="text-xs font-semibold text-charcoal-muted">{k}</p>
              <p className="mt-0.5 whitespace-nowrap text-lg font-bold tabular-nums">{v}</p>
            </div>
          ))}
        </div>
        <div className={box}>
          <p className="text-xs font-semibold text-charcoal-muted">Next activity</p>
          <p className="mt-0.5 font-bold">Pregnancy check, Zawadi</p>
          <p className="text-sm text-charcoal-muted">Due Thursday</p>
        </div>
        <div className={`${box} flex items-end gap-1.5`} aria-hidden>
          {[30, 34, 33, 38, 36, 41, 42].map((h, i) => (
            <span key={i} className={`flex-1 rounded-t ${i === 6 ? 'bg-sage' : 'bg-sage-200'}`} style={{ height: `${h * 1.6}px` }} />
          ))}
        </div>
      </div>
    );
  }
  if (tab === 'milk') {
    return (
      <div className="space-y-3">
        {[
          { shift: 'Morning milking', l: '24.0 L', parts: ['18 L to Baraka Co-op', '4 L to Green Garden Hotel', '2 L household and calves'] },
          { shift: 'Evening milking', l: '18.0 L', parts: ['16 L to Baraka Co-op', '2 L household and calves'] },
        ].map(({ shift, l, parts }) => (
          <div key={shift} className={box}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-bold">{shift}</p>
              <p className="whitespace-nowrap text-lg font-bold tabular-nums text-sage">{l}</p>
            </div>
            <ul className="mt-2 space-y-1 border-t border-rule pt-2 text-sm text-charcoal-muted">
              {parts.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
        ))}
        <p className="rounded-xl bg-sage px-4 py-3 text-center font-bold text-white">Record milk</p>
      </div>
    );
  }
  if (tab === 'herd') {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5">
          <p className="flex items-start gap-2 font-bold text-rose-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />Amani (GH-04): do not sell milk until Oct 26</p>
          <p className="mt-1 text-sm text-charcoal-light">PenStrep given Oct 22. Milk withdrawal is active.</p>
        </div>
        {[
          { n: 'Zawadi', t: 'GH-01, Friesian', s: 'In calf, 5 months' },
          { n: 'Baraka', t: 'GH-02, Ayrshire', s: 'Lactation 3' },
          { n: 'Neema', t: 'GH-03, Friesian', s: 'Served 12 days ago' },
        ].map(({ n, t, s: st }) => (
          <div key={n} className={`${box} flex items-center justify-between gap-3`}>
            <div>
              <p className="font-bold">{n}</p>
              <p className="text-sm text-charcoal-muted">{t}</p>
            </div>
            <p className="text-right text-xs font-bold text-sage">{st}</p>
          </div>
        ))}
      </div>
    );
  }
  if (tab === 'sales') {
    return (
      <div className="space-y-3">
        {[
          { n: 'Baraka Dairy Co-op', d: 'Daily pickup, KSh 50 a litre', s: 'Owed: KSh 40,000', owed: true },
          { n: 'Green Garden Hotel', d: 'Direct customer, KSh 60 a litre', s: 'Paid: KSh 7,200 by M-Pesa', owed: false },
        ].map(({ n, d, s: st, owed }) => (
          <div key={n} className={box}>
            <p className="font-bold">{n}</p>
            <p className="text-sm text-charcoal-muted">{d}</p>
            <p className={`mt-2 border-t border-rule pt-2 font-bold ${owed ? 'text-charcoal' : 'text-sage'}`}>{st}</p>
          </div>
        ))}
        <p className="rounded-xl border border-dashed border-sage/50 px-4 py-3 text-center text-sm font-bold text-sage">Statement matches your records</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <dl className={`${box} space-y-2.5 text-sm`}>
        <div className="flex justify-between gap-3"><dt className="text-charcoal-muted">Milk sales</dt><dd className="whitespace-nowrap font-bold">KSh 47,200</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-charcoal-muted">Feed</dt><dd className="whitespace-nowrap font-bold text-rose-800">− KSh 11,400</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-charcoal-muted">Vet and medicine</dt><dd className="whitespace-nowrap font-bold text-rose-800">− KSh 2,600</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-charcoal-muted">Labour</dt><dd className="whitespace-nowrap font-bold text-rose-800">− KSh 2,800</dd></div>
      </dl>
      <div className="rounded-xl bg-forest p-4 text-white">
        <p className="text-sm font-semibold text-white/70">What the farm earned this month</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">KSh 30,400</p>
      </div>
    </div>
  );
}
