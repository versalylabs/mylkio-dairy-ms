'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { Testimonial, PlatformSettings } from '@/types';
import { farmToday } from '@/lib/dates';
import { PLANS, PLAN_ORDER, TRIAL_DAYS, formatKsh, type PlanId } from '@/lib/plans';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
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
  Milk,
  Phone,
  Play,
  ShieldCheck,
  Smartphone,
  Tractor,
  X,
} from 'lucide-react';
import { ABOUT_POINTS, ALL_LINKS, FEATURES, HERO_PROOF, NAV_LINKS, PREVIEW_TABS, PROBLEMS, STEPS, buildFaqs, type PreviewTab } from './content';

interface MarketingLandingPageProps {
  onOpenAuth: (mode: 'login' | 'signup', plan?: PlanId) => void;
  onExploreDemo: () => void;
  testimonials: Testimonial[];
  settings: PlatformSettings;
}

const PLAN_COPY: Record<PlanId, { headline: string; blurb: string; points: string[]; featured?: boolean }> = {
  starter: {
    headline: 'For farmers going digital',
    blurb: 'For farmers beginning to digitize their farm records.',
    points: [`Up to ${PLANS.starter.cowLimit} cows`, 'Daily milk production tracking', 'Co-op and buyer sales logging', 'Works offline on your smartphone'],
  },
  farmer: {
    headline: 'For growing dairy farms',
    blurb: 'For growing dairy farms needing additional tracking and reporting.',
    points: [`Up to ${PLANS.farmer.cowLimit} cows`, 'Cow identification, photos and pedigree', 'AI breeding, calving dates and reminders', 'Antibiotic milk withdrawal alert notices', 'CSV export and full database backup'],
    featured: true,
  },
  farm_pro: {
    headline: 'For commercial herds',
    blurb: 'For larger operations requiring advanced features.',
    points: ['Unlimited herd capacity', 'Multiple farm worker logins (coming soon)', 'Priority WhatsApp and phone assistance', 'Operating profit and net margin ledger'],
  },
};

const CHECKLIST_TEXT = `MYLKIO FREE DAIRY FARM RECORD-KEEPING CHECKLIST
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
Support Phone & WhatsApp: +254 184 129145
Support Email: versalylabs@gmail.com`;

/** Eyebrow, serif headline and intro, shared by every section so they read as one system. */
function SectionHeading({ eyebrow, title, intro, align = 'center', light = false }: {
  eyebrow: string; title: React.ReactNode; intro?: string; align?: 'center' | 'left'; light?: boolean;
}) {
  return (
    <div className={`${align === 'center' ? 'mx-auto text-center' : ''} max-w-3xl`}>
      <span className={`eyebrow ${light ? 'eyebrow-light' : ''}`}>{eyebrow}</span>
      <h2 className={`mt-4 font-display text-display-lg [text-wrap:balance] ${light ? 'text-white' : 'text-charcoal'}`}>{title}</h2>
      {intro && <p className={`mt-5 text-base leading-relaxed sm:text-lg ${align === 'center' ? 'mx-auto max-w-2xl' : ''} ${light ? 'text-ivory/85' : 'text-charcoal-light'}`}>{intro}</p>}
    </div>
  );
}

export const MarketingLandingPage: React.FC<MarketingLandingPageProps> = ({
  onOpenAuth,
  onExploreDemo,
  testimonials,
  settings,
}) => {
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

  const faqs = useMemo(buildFaqs, []);
  const approvedTestimonials = testimonials.filter((t) => t.isApproved);
  const cleanPhone = (settings.supportWhatsApp || '+254184129145').replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=Hello%20Mylkio,%20I%20would%20like%20to%20inquire%20about%20the%20dairy%20management%20system.`;

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
    const blob = new Blob([CHECKLIST_TEXT], { type: 'text/plain;charset=utf-8' });
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

  const startTrial = (plan?: PlanId) => onOpenAuth('signup', plan);

  return (
    <div id="top" className="min-h-screen overflow-x-clip bg-ivory font-sans text-charcoal antialiased selection:bg-sage/15">
      {/* ───────────── Header ───────────── */}
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled || menuOpen ? 'border-b border-ivory-border bg-ivory/90 shadow-soft backdrop-blur-xl' : 'border-b border-transparent'}`}>
        <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-20">
          <a href="#top" className="flex shrink-0 items-center gap-3" aria-label="Mylkio home">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal font-display text-lg font-medium text-white">M</span>
            <span className="leading-tight">
              <span className="flex items-center gap-2">
                <span className="font-display text-xl font-medium tracking-tight">Mylkio</span>
                <span className="hidden rounded-full bg-sage/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-sage sm:inline">Kenya</span>
              </span>
              <span className="hidden whitespace-nowrap text-xs text-charcoal-muted xl:block">A product by Versaly</span>
            </span>
          </a>

          <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="whitespace-nowrap text-sm font-medium text-charcoal transition-colors hover:text-sage">{link.label}</a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button onClick={() => onOpenAuth('login')} className="btn btn-ghost">Sign in</button>
            <button onClick={onExploreDemo} className="btn btn-secondary hidden xl:inline-flex">
              <Tractor className="h-4 w-4 text-sage" />
              <span>Explore demo</span>
            </button>
            <button onClick={() => startTrial()} className="btn btn-primary">
              <span>Start free trial</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <button onClick={() => onOpenAuth('login')} className="btn btn-ghost px-3">Sign in</button>
            <button
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="flex h-11 w-11 items-center justify-center rounded-full text-charcoal hover:bg-sage/10"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div id="mobile-menu" className="max-h-[calc(100dvh-4rem)] animate-fade-in overflow-y-auto border-t border-ivory-border bg-ivory lg:hidden">
            <div className="container-page space-y-1 py-4">
              {ALL_LINKS.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="flex min-h-12 items-center justify-between rounded-xl px-3 text-lg font-medium text-charcoal hover:bg-sage/10">
                  <span>{link.label}</span>
                  <ChevronRight className="h-5 w-5 text-charcoal-subtle" />
                </a>
              ))}
              <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2">
                <button onClick={() => { setMenuOpen(false); onExploreDemo(); }} className="btn btn-secondary btn-lg">
                  <Tractor className="h-5 w-5 text-sage" />
                  <span>Explore demo farm</span>
                </button>
                <button onClick={() => { setMenuOpen(false); startTrial(); }} className="btn btn-primary btn-lg">
                  <span>Start free trial</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ───────────── Hero ───────────── */}
      <section className="relative overflow-hidden pt-28 sm:pt-32 lg:pt-36">
        {/* A faded photo of the herd behind the headline. Decorative only: low opacity keeps the text easy to read, and it fades out towards the bottom so it melts into the page. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] bg-cover bg-[position:70%_88%] lg:bottom-0 lg:h-auto opacity-[0.17] [mask-image:linear-gradient(to_bottom,black_50%,transparent_96%)] sm:bg-[position:center_88%]"
          style={{ backgroundImage: "url('/images/hero-cows.jpg')" }}
        />
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-sage-200/50 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -left-40 top-1/2 h-[26rem] w-[26rem] rounded-full bg-gold-200/40 blur-3xl" />

        <div className="container-page relative pb-28 pt-4 sm:pb-32 lg:pb-40 lg:pt-8">
          <div className="mx-auto max-w-4xl animate-rise text-center">
            <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-ivory-border bg-white/80 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-sage shadow-soft backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-sage" />
              Mobile-first dairy management
            </span>

            <h1 className="mt-7 font-display text-display-xl text-charcoal [text-wrap:balance]">
              Your dairy farm. <span className="whitespace-nowrap text-sage">Under control.</span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-charcoal-light sm:text-xl">
              Track every litre of milk, manage your cows, and know where your farm income goes, all from your phone.
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-charcoal-muted">
              Mylkio brings your milk records, cow health, breeding activities, sales, and farm expenses into one simple system built for everyday dairy farming. No complicated paperwork. No scattered records. Just a clearer picture of your farm.
            </p>

            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <button onClick={() => startTrial()} className="btn btn-primary btn-lg group w-full sm:w-auto">
                <span>Start managing your farm</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
              <button onClick={onExploreDemo} className="btn btn-secondary btn-lg w-full sm:w-auto">
                <Play className="h-4 w-4 fill-sage text-sage" />
                <span>See how Mylkio works</span>
              </button>
            </div>

            <ul className="mt-9 flex flex-wrap justify-center gap-x-7 gap-y-2">
              {HERO_PROOF.map((item) => (
                <li key={item} className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-charcoal-light">
                  <CheckCircle2 className="h-4 w-4 text-sage" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Facts ribbon */}
      <section aria-label="Highlights" className="container-page relative z-10 -mt-10 sm:-mt-14">
        <div className="card grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-ivory-border">
          {[
            { icon: Smartphone, title: 'Offline', text: 'Saves records without signal', gold: false },
            { icon: Milk, title: '1 entry', text: "Logs the day's milk total", gold: false },
            { icon: ShieldCheck, title: 'Co-op', text: 'Statements checked against your records', gold: true },
            { icon: Calendar, title: `${TRIAL_DAYS} days`, text: 'Full free trial', gold: false },
          ].map(({ icon: Icon, title, text, gold }) => (
            <div key={title} className="flex items-center gap-4 lg:px-7 lg:first:pl-0 lg:last:pr-0">
              <span className={`icon-tile ${gold ? 'icon-tile-gold' : ''}`}><Icon className="h-6 w-6" /></span>
              <div>
                <p className="whitespace-nowrap font-display text-2xl font-medium">{title}</p>
                <p className="text-sm text-charcoal-muted">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────── Problems ───────────── */}
      <section className="section">
        <div className="container-page">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              align="left"
              eyebrow="Sound familiar?"
              title={<>Running a dairy farm is hard enough. Your records <span className="text-sage">shouldn&apos;t make it harder.</span></>}
            />
            <div className="max-w-md space-y-3">
              <p className="text-base leading-relaxed text-charcoal-light">
                Most Kenyan dairy farmers lose money not from bad cows, but from missing records and unreconciled deliveries.
              </p>
              <a href="#features" className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-sage hover:underline">
                Explore all solutions <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PROBLEMS.map(({ icon: Icon, tone, title, body, href, tab }) => (
              <article key={title} className="card card-hover group flex flex-col justify-between gap-5 p-6">
                <div className="space-y-4">
                  <span className={`icon-tile ${tone === 'gold' ? 'icon-tile-gold' : ''}`}><Icon className="h-6 w-6" /></span>
                  <h3 className="text-lg font-semibold text-charcoal">{title}</h3>
                  <p className="text-base leading-relaxed text-charcoal-light">{body}</p>
                </div>
                <a href={href} onClick={() => setPreviewTab(tab)} className="inline-flex w-fit items-center gap-1 whitespace-nowrap text-sm font-semibold text-sage">
                  See how Mylkio helps <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
              </article>
            ))}
          </div>

          <p className="mt-14 text-center font-display text-2xl text-charcoal">There&apos;s a simpler way to manage it all.</p>
        </div>
      </section>

      {/* ───────────── About ───────────── */}
      <section className="section bg-white">
        <div className="container-page grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              align="left"
              eyebrow="About Mylkio"
              title={<>Everything you need to run your dairy farm, <span className="text-sage">in one simple place.</span></>}
              intro="From your first milk record to your monthly payments, Mylkio helps you stay organized and make more informed farming decisions."
            />
            <ul className="mt-8 space-y-4">
              {ABOUT_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3 text-base text-charcoal">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sage" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <button onClick={() => startTrial()} className="btn btn-primary btn-lg mt-10 w-full sm:w-auto">
              <span>Start {TRIAL_DAYS}-day free trial</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-ivory-border shadow-lift">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=1200&q=80"
              alt="Dairy cows on a Kenyan farm"
              width={1200}
              height={900}
              loading="lazy"
              className="aspect-[4/5] w-full object-cover sm:aspect-[4/3]"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/10 to-transparent" />
            <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/40 bg-white/95 p-4 shadow-lift backdrop-blur sm:inset-x-6 sm:bottom-6 sm:p-5">
              <div className="flex items-center justify-between gap-3 border-b border-ivory-border pb-3">
                <span className="truncate text-sm font-semibold">Green Hills Dairy • Nakuru</span>
                <span className="hidden shrink-0 whitespace-nowrap rounded-full bg-sage/10 px-2.5 py-0.5 text-xs font-semibold text-sage sm:inline">● Synced offline</span>
              </div>
              <dl className="grid grid-cols-3 gap-2 pt-3 text-center">
                {[
                  { k: 'Today (L)', v: '42.5', c: 'text-charcoal' },
                  { k: 'Co-op (L)', v: '34.0', c: 'text-sage' },
                  { k: 'Month (KSh)', v: '48,200', c: 'text-gold-600' },
                ].map(({ k, v, c }) => (
                  <div key={k}>
                    <dt className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-charcoal-muted">{k}</dt>
                    <dd className={`text-lg font-bold tabular-nums sm:text-xl ${c}`}>{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-center text-xs text-charcoal-muted">Sample farm data</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── Features ───────────── */}
      <section id="features" className="section scroll-mt-20">
        <div className="container-page">
          <SectionHeading
            eyebrow="The complete solution"
            title="Everything you need to run your dairy farm. In one place."
            intro="From your first milk record to your monthly payments, Mylkio helps you stay organized and make more informed farming decisions."
          />
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, tone, title, body, points }) => (
              <article key={title} className="card card-hover flex flex-col p-7">
                <span className={`icon-tile ${tone === 'gold' ? 'icon-tile-gold' : ''}`}><Icon className="h-6 w-6" /></span>
                <h3 className="mt-5 text-lg font-semibold leading-snug text-charcoal">{title}</h3>
                <p className="mt-3 text-base leading-relaxed text-charcoal-light">{body}</p>
                <ul className="mt-5 space-y-2.5 border-t border-ivory-border pt-5">
                  {points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm text-charcoal-light">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Milk payments ───────────── */}
      <section id="payments" className="section relative scroll-mt-20 overflow-hidden bg-sage text-white">
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
        <div className="container-page relative grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <SectionHeading
              align="left"
              light
              eyebrow="Milk payments"
              title={<>Delivered the milk? <span className="text-gold">Keep track of every shilling you&apos;re owed.</span></>}
              intro="Whether you sell to a cooperative or individual customers, Mylkio helps you maintain a clear record of milk delivered, payments received, and outstanding balances."
            />
            <p className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-5 text-base leading-relaxed text-ivory backdrop-blur">
              <strong className="text-gold">No more relying on memory to reconcile your milk sales.</strong> At month-end, simply pull up your logged deliveries against the cooperative slip to confirm accuracy before payment is finalized.
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-3xl bg-white p-6 text-charcoal shadow-lift sm:p-8">
              <div className="flex items-start justify-between gap-3 border-b border-ivory-border pb-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Monthly statement (example)</p>
                  <h3 className="mt-1 text-base font-semibold">Baraka Dairy Farmers Co-op</h3>
                </div>
                <span className="shrink-0 rounded-full bg-sage/10 px-2.5 py-0.5 text-xs font-semibold text-sage">Reconciled</span>
              </div>
              <dl className="space-y-3 pt-4 text-sm">
                {[
                  ['Milk delivered', '850 litres'],
                  ['Agreed price', 'KSh 50 per litre'],
                  ['Gross value', 'KSh 42,500'],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 border-b border-ivory-border pb-3">
                    <dt className="whitespace-nowrap text-charcoal-muted">{k}</dt>
                    <dd className="whitespace-nowrap font-semibold">{v}</dd>
                  </div>
                ))}
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 border-b border-ivory-border pb-3 text-rose-800">
                  <dt className="whitespace-nowrap">Recorded deductions</dt>
                  <dd className="whitespace-nowrap font-semibold">− KSh 2,500</dd>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-1">
                  <dt className="whitespace-nowrap font-semibold">Expected net payment</dt>
                  <dd className="whitespace-nowrap font-display text-3xl font-medium text-sage">KSh 40,000</dd>
                </div>
              </dl>
              <p className="mt-5 rounded-xl border border-ivory-border bg-ivory p-3 text-center text-xs italic text-charcoal-muted">
                Illustrative monthly reconciliation example calculated from logged deliveries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── How it works ───────────── */}
      <section id="how-it-works" className="section scroll-mt-20">
        <div className="container-page">
          <SectionHeading eyebrow="How it works" title="From notebook to organized farm records in three simple steps." />
          <ol className="relative mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div aria-hidden className="absolute left-[16%] right-[16%] top-10 hidden h-px bg-gradient-to-r from-transparent via-gold to-transparent md:block" />
            {STEPS.map((step, index) => (
              <li key={step.title} className="card relative p-8 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sage font-display text-2xl font-medium text-white shadow-glow ring-8 ring-ivory">{index + 1}</span>
                <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-charcoal-light">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 text-center">
            <button onClick={() => startTrial()} className="btn btn-primary btn-lg">
              <span>Get started with Mylkio</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ───────────── Product preview ───────────── */}
      <section id="preview" className="section scroll-mt-20 bg-white">
        <div className="container-page">
          <SectionHeading eyebrow="Product preview" title="See what a more organized dairy farm looks like." />

          {/* Tabs scroll sideways on a phone rather than wrapping. */}
          <div className="-mx-4 mt-10 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            <div role="tablist" aria-label="Product preview" className="mx-auto flex w-max gap-1 rounded-full border border-ivory-border bg-ivory p-1.5">
              {PREVIEW_TABS.map((tab) => (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={previewTab === tab.key}
                  onClick={() => setPreviewTab(tab.key)}
                  className={`min-h-11 whitespace-nowrap rounded-full px-5 text-sm font-semibold transition-all ${previewTab === tab.key ? 'bg-sage text-white shadow-soft' : 'text-charcoal-muted hover:text-charcoal'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-3xl border border-ivory-border bg-ivory shadow-lift">
            <div className="flex items-center gap-2 border-b border-ivory-border bg-white px-5 py-3.5">
              <span className="h-3 w-3 rounded-full bg-rose-300" /><span className="h-3 w-3 rounded-full bg-gold" /><span className="h-3 w-3 rounded-full bg-sage-300" />
              <span className="ml-3 truncate text-sm text-charcoal-muted">Mylkio · Sample farm</span>
            </div>
            <div role="tabpanel" className="animate-fade-in p-6 sm:p-9" key={previewTab}>
              <PreviewPanel tab={previewTab} />
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── Pricing ───────────── */}
      <section id="pricing" className="section scroll-mt-20">
        <div className="container-page">
          <SectionHeading
            eyebrow="Pricing"
            title="Simple pricing for farms of every size."
            intro="Whether you're managing a few cows or a growing dairy farm, Mylkio has a suitable option."
          />
          <div className="mt-16 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
            {PLAN_ORDER.map((id) => {
              const plan = PLANS[id];
              const copy = PLAN_COPY[id];
              return (
                <article
                  key={id}
                  className={`card relative flex flex-col p-6 sm:p-8 ${copy.featured ? 'border-2 border-sage shadow-lift lg:-translate-y-3' : 'card-hover'}`}
                >
                  {copy.featured && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-4 py-1 text-xs font-bold uppercase tracking-wider text-charcoal shadow-soft">
                      Recommended
                    </span>
                  )}
                  <p className="eyebrow">{plan.name}</p>
                  <h3 className="mt-3 text-xl font-semibold">{copy.headline}</h3>
                  <p className="mt-2 text-base text-charcoal-muted">{copy.blurb}</p>

                  <div className="mt-6 border-y border-ivory-border py-6">
                    <p className="flex items-baseline gap-1.5 whitespace-nowrap">
                      <span className="font-display text-[clamp(2rem,8.5vw,3rem)] font-medium tracking-tight sm:text-5xl">{formatKsh(plan.priceKsh)}</span>
                      <span className="text-base text-charcoal-muted">/ month</span>
                    </p>
                    <p className="mt-2 text-sm text-charcoal-muted">Pay monthly once your free trial ends</p>
                  </div>

                  <ul className="mt-6 flex-1 space-y-3.5">
                    {copy.points.map((point) => (
                      <li key={point} className="flex items-start gap-3 text-base text-charcoal-light">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-sage" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>

                  <button onClick={() => startTrial(id)} className={`btn btn-lg mt-8 w-full ${copy.featured ? 'btn-primary' : 'btn-secondary'}`}>
                    Start {TRIAL_DAYS}-day free trial
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────── Sample stories ───────────── */}
      {approvedTestimonials.length > 0 && (
        <section className="section bg-white">
          <div className="container-page">
            <SectionHeading
              eyebrow="Sample stories"
              title="Built with Kenyan dairy farmers in mind."
              intro="These are example stories written to show how a farm could use Mylkio. They are not reviews from customers, and the names and figures are illustrative. Real farmer feedback will appear here once pilot farms agree to share it."
            />
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {approvedTestimonials.map((t) => (
                <figure key={t.id} className="card flex flex-col justify-between gap-6 bg-ivory p-7">
                  <div>
                    <span className="inline-block whitespace-nowrap rounded-full border border-gold/50 bg-gold/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold-600">
                      Example, not a real review
                    </span>
                    <blockquote className="mt-4 border-l-2 border-sage pl-4 font-display text-lg leading-relaxed text-charcoal">
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                  </div>
                  <figcaption className="border-t border-ivory-border pt-4">
                    <p className="text-base font-semibold">{t.farmerName} <span className="font-normal text-charcoal-muted">(example)</span></p>
                    <p className="text-sm font-medium text-sage">{t.farmName} • {t.county}</p>
                    <p className="text-sm text-charcoal-muted">{t.cowsCount} cows</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────────── Free checklist ───────────── */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=1920&q=70"
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-ivory/85 via-ivory/90 to-ivory/85" />
        <div className="container-page relative">
          <div className="mx-auto max-w-3xl space-y-5 rounded-3xl border border-ivory-border bg-white p-8 text-center shadow-lift sm:p-14">
            <span className="eyebrow justify-center">Free resource</span>
            <h2 className="font-display text-display-md [text-wrap:balance]">Not ready for software yet? Start with better farm records.</h2>
            <p className="mx-auto max-w-xl text-base leading-relaxed text-charcoal-light">
              Get our free dairy farm record-keeping checklist covering daily milk production, milk deliveries, cow health dates, breeding activities, farm expenses, and customer payments.
            </p>
            <div className="pt-2">
              <button onClick={() => setChecklistOpen(true)} className="btn btn-primary btn-lg">
                <Download className="h-5 w-5" />
                <span>Get the free checklist</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── FAQs ───────────── */}
      <section id="faqs" className="section scroll-mt-20">
        <div className="container-page max-w-3xl">
          <SectionHeading eyebrow="FAQs" title="Frequently asked questions" />
          <div className="mt-12 space-y-3">
            {faqs.map((faq, index) => {
              const open = openFaq === index;
              return (
                <div key={faq.q} className={`card overflow-hidden transition-colors ${open ? 'border-sage-300' : ''}`}>
                  <h3>
                    <button
                      onClick={() => setOpenFaq(open ? null : index)}
                      aria-expanded={open}
                      aria-controls={`faq-${index}`}
                      className="flex min-h-14 w-full items-center justify-between gap-4 px-6 py-4 text-left text-base font-semibold text-charcoal"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown className={`h-5 w-5 shrink-0 text-sage transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
                    </button>
                  </h3>
                  {open && (
                    <div id={`faq-${index}`} className="animate-fade-in border-t border-ivory-border px-6 pb-6 pt-4 text-base leading-relaxed text-charcoal-light">
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
      <section id="contact" className="section scroll-mt-20 bg-white">
        <div className="container-page">
          <SectionHeading
            eyebrow="Contact and support"
            title="Talk directly with our Kenyan team."
            intro="Have questions about getting your farm started, cooperative payment tracking, or subscribing? We are here to help."
          />

          <div className="mx-auto mt-14 grid grid-cols-1 max-w-5xl items-start gap-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-5">
              {[
                { href: `tel:+${cleanPhone}`, icon: Phone, label: 'Direct phone', value: '+254 184 129145', note: 'Monday – Saturday, 7:00 AM – 7:00 PM', gold: false, external: false },
                { href: whatsappUrl, icon: MessageSquare, label: 'WhatsApp line', value: '+254 184 129145', note: 'Quick responses on setup and questions', gold: true, external: true },
                { href: 'mailto:versalylabs@gmail.com', icon: Mail, label: 'Email inquiry', value: 'versalylabs@gmail.com', note: 'For cooperative partnerships and billing', gold: false, external: false },
              ].map(({ href, icon: Icon, label, value, note, gold, external }) => (
                <a
                  key={label}
                  href={href}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="card card-hover group flex items-center gap-4 p-5"
                >
                  <span className={`icon-tile transition-colors group-hover:bg-sage group-hover:text-white ${gold ? 'icon-tile-gold' : ''}`}><Icon className="h-5 w-5" /></span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-charcoal-muted">{label}</span>
                    <span className="block truncate text-base font-semibold">{value}</span>
                    <span className="block text-sm text-charcoal-muted">{note}</span>
                  </span>
                </a>
              ))}
            </div>

            <div className="card p-6 sm:p-8 lg:col-span-7">
              <h3 className="font-display text-2xl font-medium">Send us a message</h3>
              <p className="mb-6 mt-1 text-base text-charcoal-muted">Fill in the details below and our team will get back to you shortly.</p>

              <form onSubmit={handleContactSubmit} className="space-y-4">
                {contactError && (
                  <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
                    {contactError}{' '}
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-bold underline">Message us on WhatsApp</a>
                  </div>
                )}
                {contactSubmitted && (
                  <div role="status" className="flex items-start gap-2 rounded-2xl border border-sage-300 bg-sage/10 p-4 text-sm font-medium text-charcoal">
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
                  <span>{contactSending ? 'Sending…' : 'Send message'}</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
                <p className="text-sm text-charcoal-muted">We use your details only to reply to you. See our <a href="/privacy" className="font-semibold text-sage underline">Privacy notice</a>.</p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── Final call to action ───────────── */}
      <section className="section">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-[2rem] bg-sage px-6 py-16 text-center text-white shadow-lift sm:px-12 sm:py-20">
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-gold/25 blur-3xl" />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="font-display text-display-lg [text-wrap:balance]">Your farm deserves better than guesswork.</h2>
              <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-ivory/85">
                Bring your cows, milk records, farm activities, and payments into one simple place with Mylkio.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button onClick={() => startTrial()} className="btn btn-lg w-full bg-white text-sage-700 shadow-soft hover:bg-ivory sm:w-auto">
                  <span>Start managing your farm</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
                <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn btn-lg btn-on-dark w-full sm:w-auto">
                  <MessageCircle className="h-5 w-5" />
                  <span>Talk to our team</span>
                </a>
              </div>
              <p className="mt-8 text-sm text-ivory/75">Mylkio is developed by Versaly, building practical software solutions for Kenyan dairy farmers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── Footer ───────────── */}
      <footer className="bg-sage-900 text-ivory">
        <div className="container-page py-14">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-display text-lg font-medium text-sage">M</span>
                <span className="font-display text-xl font-medium">Mylkio</span>
              </div>
              <p className="mt-4 max-w-xs text-base leading-relaxed text-sage-200">Smarter dairy farming, made simple. A product by Versaly.</p>
            </div>
            <nav aria-label="Footer">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Explore</p>
              <ul className="mt-4 space-y-2.5">
                {ALL_LINKS.map((link) => (
                  <li key={link.href}><a href={link.href} className="whitespace-nowrap text-base text-ivory/85 transition-colors hover:text-gold">{link.label}</a></li>
                ))}
              </ul>
            </nav>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Get in touch</p>
              <ul className="mt-4 space-y-2.5 text-base">
                <li><a href={`tel:+${cleanPhone}`} className="whitespace-nowrap text-ivory/85 transition-colors hover:text-gold">+254 184 129145</a></li>
                <li><a href="mailto:versalylabs@gmail.com" className="break-all text-ivory/85 transition-colors hover:text-gold">versalylabs@gmail.com</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-sage-200 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Mylkio by Versaly. Built for Kenyan dairy farmers.</span>
            <span className="flex flex-wrap gap-x-5 gap-y-1">
              <a href="/privacy" className="whitespace-nowrap transition-colors hover:text-gold">Privacy notice</a>
              <a href="/terms" className="whitespace-nowrap transition-colors hover:text-gold">Terms of use</a>
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
                  <p className="mt-2 text-base text-charcoal-muted">Enter where to send your checklist and instant download link.</p>
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

/** The five product-preview panels. Every figure is sample data. */
function PreviewPanel({ tab }: { tab: PreviewTab }) {
  const head = (title: string, badge: React.ReactNode) => (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ivory-border pb-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      {badge}
    </div>
  );
  const pill = (text: string, tone: 'sage' | 'rose' = 'sage') => (
    <span className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold ${tone === 'rose' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-sage-300 bg-sage/10 text-sage'}`}>{text}</span>
  );

  if (tab === 'dashboard') {
    return (
      <div className="space-y-6">
        {head('Dashboard overview', <span className="text-sm font-semibold text-sage">Green Hills Dairy, Nakuru</span>)}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: "Today's milk", v: '42 L', c: 'text-charcoal' },
            { k: 'Active cows', v: '6', c: 'text-charcoal' },
            { k: 'Month sales', v: 'KSh 38,500', c: 'text-sage' },
            { k: 'Next activity', v: 'Pregnancy check', c: 'text-charcoal' },
          ].map(({ k, v, c }) => (
            <div key={k} className="rounded-2xl border border-ivory-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-muted">{k}</p>
              <p className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${c}`}>{v}</p>
            </div>
          ))}
        </div>
        <p className="text-base text-charcoal-light">At a glance: today&apos;s milk totals, active cow counts, co-op deliveries, and upcoming veterinary follow-ups.</p>
      </div>
    );
  }
  if (tab === 'milk') {
    return (
      <div className="space-y-6">
        {head('Daily milk production logging', <span className="text-sm font-semibold text-sage">Fast entry under 20 seconds</span>)}
        <div className="space-y-2 rounded-2xl border border-ivory-border bg-white p-5">
          <div className="flex justify-between gap-4 font-semibold">
            <span>Morning milking</span>
            <span className="whitespace-nowrap text-sage">24.0 litres</span>
          </div>
          <p className="text-sm text-charcoal-muted">Allocation: 18 L to Baraka Co-op • 4 L direct to Green Garden Hotel • 2 L household and calves</p>
        </div>
        <p className="text-base text-charcoal-light">Quick farm-total recording or cow-by-cow logging with morning and evening summaries.</p>
      </div>
    );
  }
  if (tab === 'herd') {
    return (
      <div className="space-y-6">
        {head('Cow profiles and antibiotic withdrawal safety', pill('Active warning', 'rose'))}
        <div className="space-y-1.5 rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <p className="flex items-center gap-2 font-semibold text-rose-900"><AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />Amani (GH-04): milk withdrawal active until Oct 26</p>
          <p className="text-sm text-charcoal-light">PenStrep administered Oct 22. Milk must NOT be sold to the cooperative collection centre.</p>
        </div>
        <p className="text-base text-charcoal-light">Ear-tag identification, breed, pregnancy status, lactation count, and safety warnings.</p>
      </div>
    );
  }
  if (tab === 'sales') {
    return (
      <div className="space-y-6">
        {head('Milk deliveries and buyer records', pill('Reconciled'))}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { n: 'Baraka Dairy Co-op', d: 'Daily pickup • KSh 50/L', s: 'Pending: KSh 40,000' },
            { n: 'Green Garden Hotel', d: 'Direct customer • KSh 60/L', s: 'Paid: KSh 7,200 (M-Pesa)' },
          ].map(({ n, d, s }) => (
            <div key={n} className="rounded-2xl border border-ivory-border bg-white p-5">
              <p className="font-semibold">{n}</p>
              <p className="text-sm text-charcoal-muted">{d}</p>
              <p className="mt-1 font-semibold text-sage">{s}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {head('Farm finances and operating margin', pill('Profitable'))}
      <dl className="space-y-3 rounded-2xl border border-ivory-border bg-white p-5 text-base">
        <div className="flex justify-between gap-4"><dt className="text-charcoal-muted">Total milk sales revenue</dt><dd className="whitespace-nowrap font-semibold">KSh 47,200</dd></div>
        <div className="flex justify-between gap-4 text-rose-800"><dt>Operating expenses (feed, vet, labour)</dt><dd className="whitespace-nowrap font-semibold">− KSh 16,800</dd></div>
        <div className="flex justify-between gap-4 border-t border-ivory-border pt-3 text-lg font-semibold"><dt>Net farm operating profit</dt><dd className="whitespace-nowrap text-sage">KSh 30,400</dd></div>
      </dl>
    </div>
  );
}
