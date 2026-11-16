// The parts of the website an administrator can change without a code release: contact details, plan prices,
// testimonials and the FAQ. Shared by the browser and the server, so there are no Next.js imports here.
//
// Every key has a built-in default. "Never saved" means the website shows the built-in wording; saving a value
// replaces it; "reset" removes the saved value. A saved value that fails validation (say, an old shape) is ignored
// in favour of the default, so a bad row can never break the website.

import { z } from 'zod';
import { PLANS, PLAN_ORDER, type PlanId } from './plans';
import { SUPPORT_EMAIL, SUPPORT_PHONE_DIGITS, SUPPORT_PHONE_DISPLAY } from './contact';

export const SITE_CONTENT_KEYS = ['contact', 'prices', 'testimonials', 'faqs'] as const;
export type SiteContentKey = (typeof SITE_CONTENT_KEYS)[number];

const digitsOnly = (value: string) => value.replace(/\D/g, '');

export const contactSchema = z.object({
  /** How the phone number is written on the website, for example "+254 184 129145". */
  phone: z.string().trim().min(7).max(32).refine((v) => /^[+0-9 ()-]+$/.test(v) && digitsOnly(v).length >= 9 && digitsOnly(v).length <= 15, 'Use digits, spaces and a leading +.'),
  /** The WhatsApp number. Only its digits are used, in the wa.me link. */
  whatsapp: z.string().trim().min(7).max(32).refine((v) => /^[+0-9 ()-]+$/.test(v) && digitsOnly(v).length >= 9 && digitsOnly(v).length <= 15, 'Use digits, spaces and a leading +.'),
  email: z.string().trim().toLowerCase().max(160).pipe(z.email()),
}).strict();

export const pricesSchema = z.object({
  starter: z.number().int().min(1).max(1_000_000),
  farmer: z.number().int().min(1).max(1_000_000),
  farm_pro: z.number().int().min(1).max(1_000_000),
}).strict();

export const testimonialSchema = z.object({
  id: z.string().trim().min(1).max(60),
  farmerName: z.string().trim().min(1).max(80),
  farmName: z.string().trim().max(100),
  county: z.string().trim().max(80),
  cowsCount: z.number().int().min(0).max(10_000),
  quote: z.string().trim().min(10).max(600),
  rating: z.number().int().min(1).max(5),
  /** Shown on the website. Unticked means saved but hidden. */
  approved: z.boolean(),
  /** An invented example, not a real farmer. The website labels these "Sample stories". */
  sample: z.boolean(),
}).strict();
export const testimonialsSchema = z.array(testimonialSchema).max(30);

export const faqSchema = z.object({
  id: z.string().trim().min(1).max(60),
  q: z.string().trim().min(5).max(200),
  a: z.string().trim().min(10).max(1200),
}).strict();
export const faqsSchema = z.array(faqSchema).max(30);

export const siteContentSchemas = {
  contact: contactSchema,
  prices: pricesSchema,
  testimonials: testimonialsSchema,
  faqs: faqsSchema,
} as const;

export type SiteContact = z.infer<typeof contactSchema>;
export type SitePrices = z.infer<typeof pricesSchema>;
export type SiteTestimonial = z.infer<typeof testimonialSchema>;
export type SiteFaq = z.infer<typeof faqSchema>;

export interface SiteContent {
  contact: SiteContact;
  prices: SitePrices;
  /** null: show the built-in sample stories. A saved list (even an empty one) replaces them. */
  testimonials: SiteTestimonial[] | null;
  /** null: show the built-in questions. */
  faqs: SiteFaq[] | null;
}

export const DEFAULT_PRICES: SitePrices = {
  starter: PLANS.starter.priceKsh,
  farmer: PLANS.farmer.priceKsh,
  farm_pro: PLANS.farm_pro.priceKsh,
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  contact: { phone: SUPPORT_PHONE_DISPLAY, whatsapp: `+${SUPPORT_PHONE_DIGITS}`, email: SUPPORT_EMAIL },
  prices: DEFAULT_PRICES,
  testimonials: null,
  faqs: null,
};

/** Whatever the database holds, checked key by key. Anything missing or invalid falls back to the default. */
export function mergeSiteContent(stored: unknown): SiteContent {
  const raw = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>;
  const contact = contactSchema.safeParse(raw.contact);
  const prices = pricesSchema.safeParse(raw.prices);
  const testimonials = testimonialsSchema.safeParse(raw.testimonials);
  const faqs = faqsSchema.safeParse(raw.faqs);
  return {
    contact: contact.success ? contact.data : DEFAULT_SITE_CONTENT.contact,
    prices: prices.success ? prices.data : DEFAULT_SITE_CONTENT.prices,
    testimonials: testimonials.success ? testimonials.data : null,
    faqs: faqs.success && faqs.data.length > 0 ? faqs.data : null,
  };
}

export const whatsappDigits = (contact: SiteContact) => digitsOnly(contact.whatsapp);
export const phoneHref = (contact: SiteContact) => `tel:+${digitsOnly(contact.phone)}`;

/** The price of a plan, from the saved prices. */
export const priceOf = (prices: SitePrices, plan: PlanId | string): number =>
  (prices as Record<string, number>)[plan] ?? PLANS[plan as PlanId]?.priceKsh ?? 0;

export const PLAN_IDS = PLAN_ORDER;

export type SiteContentMeta = Partial<Record<SiteContentKey, { updatedAt: string; updatedBy: string | null }>>;

/** A short, unique id for a new list item (testimonial or question). */
export const newItemId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
