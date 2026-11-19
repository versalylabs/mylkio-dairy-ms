import {
  Activity,
  Calendar,
  Banknote,
  Download,
  FileText,
  Milk,
  Receipt,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { TRIAL_DAYS, pricingSentence } from '@/lib/plans';
import { initialTestimonials } from '@/lib/mock-data';
import type { SiteTestimonial } from '@/lib/site-content';

// The words and structure of the website live here, apart from how they are drawn.

export type PreviewTab = 'dashboard' | 'milk' | 'herd' | 'sales' | 'finance';

export const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faqs', label: 'FAQs' },
  { href: '#contact', label: 'Contact' },
];

// The footer and the phone menu also list the milk-sales section.
export const ALL_LINKS = [
  NAV_LINKS[0],
  NAV_LINKS[1],
  { href: '#payments', label: 'Milk sales' },
  ...NAV_LINKS.slice(2),
];

export interface Problem {
  icon: LucideIcon;
  tone: 'sage' | 'gold';
  title: string;
  body: string;
  href: string;
  tab: PreviewTab;
}

export const PROBLEMS: Problem[] = [
  {
    icon: FileText, tone: 'sage', title: 'Milk records everywhere',
    body: 'You record milk in notebooks, on paper, or sometimes just try to remember the numbers. Papers get lost or smudged with milk.',
    href: '#preview', tab: 'milk',
  },
  {
    icon: Receipt, tone: 'gold', title: 'Confusing payments',
    body: "At the end of the month, you're unsure whether every litre delivered has been accounted for. Unrecorded transport deductions reduce your earnings.",
    href: '#payments', tab: 'sales',
  },
  {
    icon: Calendar, tone: 'sage', title: 'Missed farm activities',
    body: 'Important dates like pregnancy checks, treatments, and vaccinations are easy to forget when they are written on separate slips.',
    href: '#preview', tab: 'herd',
  },
  {
    icon: Banknote, tone: 'gold', title: 'Unclear farm profits',
    body: 'You sell milk regularly, but calculating what your farm actually earns is another story once feed and veterinary bills arrive.',
    href: '#preview', tab: 'finance',
  },
];

export interface Feature {
  icon: LucideIcon;
  tone: 'sage' | 'gold';
  title: string;
  body: string;
  points: string[];
}

export const FEATURES: Feature[] = [
  {
    icon: Milk, tone: 'sage', title: 'Know exactly how much milk your farm produces',
    body: 'Record daily milk output, compare production over time, and understand how your farm is performing without tedious calculations.',
    points: ['Quick farm-total recording (under 20 seconds)', 'Optional cow-by-cow recording and shift tallies'],
  },
  {
    icon: Users, tone: 'sage', title: 'Every cow has a story. Keep track of it.',
    body: 'Manage cow profiles, important dates, health records, parity counts, and production history with smartphone photo attachments.',
    points: ['Ear-tag identification and breed registry', 'Pregnancy status and lactation tracking'],
  },
  {
    icon: Activity, tone: 'gold', title: 'Stay ahead of important farm activities',
    body: 'Keep track of upcoming veterinary activities, breeding events, and expected calving dates with automated withdrawal alert banners.',
    points: ['Milk withdrawal warnings protect co-op sales', 'AI sire records and gestation projections'],
  },
  {
    icon: Truck, tone: 'sage', title: 'Every litre sold should be accounted for',
    body: 'Record deliveries to cooperatives, collection centres, and individual customers. Track prices per litre, transport deductions, and balances.',
    points: ['Delivery history and monthly co-op tallies', 'M-Pesa and cash payment receipts'],
  },
  {
    icon: Banknote, tone: 'sage', title: 'Know where your farm money goes',
    body: 'Track dairy meal, silage, fodder, veterinary fees, worker wages, transport, and maintenance costs against your milk receipts.',
    points: ['Categorized expenses in Kenyan shillings', 'Real net profit margin calculation'],
  },
  {
    icon: Download, tone: 'gold', title: 'Understand your farm at a glance',
    body: 'View useful summaries of milk production, sales, expenses, and farm activity. Export full CSV spreadsheets or complete database backups.',
    points: ['One-click CSV exports for bank and SACCO records', 'Instant full JSON database backup'],
  },
];

export const STEPS = [
  { title: 'Set up your farm', body: 'Create your farm profile and add your cows. Enter their ear tags or start with a clean slate.' },
  { title: 'Record daily activities', body: 'Log milk production, sales, expenses, and important cow activities with touch buttons on your phone.' },
  { title: 'Understand your farm', body: "Use your dashboard and reports to see what's happening, who owes you, and what needs attention." },
];

export const PREVIEW_TABS: { key: PreviewTab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'milk', label: 'Milk records' },
  { key: 'herd', label: 'My cows' },
  { key: 'sales', label: 'Milk sales' },
  { key: 'finance', label: 'Farm finances' },
];

export const ABOUT_POINTS = [
  'Quick farm-total recording in under 20 seconds',
  'Cow ear-tag identification, breed registry and photos',
  'Antibiotic milk withdrawal warnings prevent co-op penalties',
  'Reconcile cooperative delivery slips against expected payout',
];

export const HERO_PROOF = [
  `${TRIAL_DAYS}-day free trial`,
  'Works without signal',
  'Made for Kenyan dairy farms',
];

/** The built-in example stories, shown until an administrator saves their own list. They are invented, and labelled so. */
export const SAMPLE_TESTIMONIALS: SiteTestimonial[] = initialTestimonials.map((t) => ({
  id: t.id, farmerName: t.farmerName, farmName: t.farmName, county: t.county, cowsCount: t.cowsCount, quote: t.quote,
  rating: t.rating, approved: t.isApproved, sample: true,
}));

export function buildFaqs(prices?: Record<'starter' | 'farmer' | 'farm_pro', number>) {
  return [
    {
      q: 'Do I need computer skills to use Mylkio?',
      a: 'Not at all. Mylkio is built specifically for smartphones with big touch buttons, clear Kenyan farming terms (like chits, morning/evening milking, and cooperatives), and simple screens that take less than 20 seconds to fill out.',
    },
    {
      q: 'Can I use Mylkio on my Android phone when offline?',
      a: 'The demo works on this device. After a farm account is connected, records can be saved on this device and synchronized with the farm cloud when connectivity returns.',
    },
    {
      q: 'Can I record farm milk totals without entering each cow individually?',
      a: 'Yes. Most Kenyan farmers record a single morning and evening farm total. Mylkio defaults to farm-total entry for speed, while also giving you a one-click toggle to log individual cows when you want to see top performers.',
    },
    {
      q: 'How does Mylkio prevent cooperative payment disputes?',
      a: 'Each delivery to your co-op or collection centre is saved with its date, shift, litres, and deductions. At month-end, compare your delivery records with the payment slip and follow up on any differences.',
    },
    {
      q: 'How does the milk withdrawal period warning work?',
      a: 'When you log a veterinary treatment, Mylkio shows the withdrawal period on your dashboard and milk screen. Check the warning before recording or selling milk, and follow your veterinarian’s guidance on when it is safe to sell.',
    },
    {
      q: 'How much does Mylkio cost?',
      a: `${pricingSentence(prices)} Every new account begins with a ${TRIAL_DAYS}-day free trial with no payment required upfront.`,
    },
    {
      q: 'Is my farm data private and safe?',
      a: 'Yes. Your farm records are isolated in your own private tenant account. You can export complete backups in CSV or JSON anytime with one click for safekeeping.',
    },
  ];
}
