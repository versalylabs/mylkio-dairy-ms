import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { freshDatabase } from '../db/harness';
import {
  adminResetSiteContent, adminSetSiteContent, adminSiteContentMeta, adminUpdateSubscription, getSiteContent,
  onboard, type Db, type OnboardingInput, type SessionUser,
} from '@/lib/server/farm-api';
import { DEFAULT_SITE_CONTENT, contactSchema, faqsSchema, mergeSiteContent, pricesSchema, testimonialsSchema, whatsappDigits } from '@/lib/site-content';

const asDb = (pg: PGlite): Db => ({ query: async (text, params) => (await pg.query(text, params as never)).rows as never });
const user = (id: string): SessionUser => ({ id, email: `${id}@example.test`, name: `Name of ${id}` });
const details = (plan: OnboardingInput['plan']): OnboardingInput => ({ name: 'Farmer', phone: '0712345678', farmName: 'Farm', county: 'Nakuru', plan, language: 'en' });

let pg: PGlite;
let db: Db;
const farmOf = async (id: string) => (await pg.query<{ farm_id: string }>('select farm_id from public.farm_memberships where user_id = $1', [id])).rows[0].farm_id;
const subscription = async (id: string) => (await pg.query<{ details: { plan: string; monthlyPriceKsh: number } }>('select details from public.subscriptions where farm_id = $1', [await farmOf(id)])).rows[0].details;

beforeAll(async () => {
  pg = await freshDatabase();
  db = asDb(pg);
  for (const id of ['boss', 'amina', 'baraka']) await onboard(db, user(id), details('farmer'));
  await pg.query(`update public.profiles set role = 'super_admin' where id = 'boss'`);
}, 60_000);

const contact = { phone: '+254 700 111 222', whatsapp: '+254 700 111 222', email: 'help@example.test' };

describe('saved website content', () => {
  it('starts empty, so the website uses its built-in wording', async () => {
    expect(await getSiteContent(db)).toEqual({});
    expect(mergeSiteContent({})).toEqual(DEFAULT_SITE_CONTENT);
  });

  it('is readable by anyone but changeable only by a platform administrator', async () => {
    for (const actor of ['amina', 'nobody']) {
      await expect(adminSetSiteContent(db, actor, 'contact', contact)).rejects.toMatchObject({ status: 403 });
      await expect(adminResetSiteContent(db, actor, 'contact')).rejects.toMatchObject({ status: 403 });
      await expect(adminSiteContentMeta(db, actor)).rejects.toMatchObject({ status: 403 });
    }
    expect(await getSiteContent(db)).toEqual({});
  });

  it('saves a part, replaces it, and keeps the earlier value in the history', async () => {
    await adminSetSiteContent(db, 'boss', 'contact', contact);
    expect(mergeSiteContent(await getSiteContent(db)).contact).toEqual(contact);
    await adminSetSiteContent(db, 'boss', 'contact', { ...contact, email: 'other@example.test' });
    expect(mergeSiteContent(await getSiteContent(db)).contact.email).toBe('other@example.test');
    const history = (await pg.query<{ value: { email: string }; changed_by: string }>(`select value, changed_by from public.site_content_history where key = 'contact'`)).rows;
    expect(history).toHaveLength(1);
    expect(history[0].value.email).toBe('help@example.test');
    expect(history[0].changed_by).toBe('boss');
    const meta = await adminSiteContentMeta(db, 'boss');
    expect(meta.contact.updatedBy).toBe('Farmer');
  });

  it('refuses an unknown part and an oversized value', async () => {
    await expect(adminSetSiteContent(db, 'boss', 'secrets', {})).rejects.toMatchObject({ status: 400 });
    await expect(adminSetSiteContent(db, 'boss', 'faqs', { text: 'x'.repeat(120_000) })).rejects.toMatchObject({ status: 400 });
  });

  it('goes back to the built-in wording when reset, keeping what was removed', async () => {
    await adminResetSiteContent(db, 'boss', 'contact');
    expect(mergeSiteContent(await getSiteContent(db)).contact).toEqual(DEFAULT_SITE_CONTENT.contact);
    const { rows } = await pg.query(`select count(*)::int as n from public.site_content_history where key = 'contact'`);
    expect(rows[0]).toEqual({ n: 2 });
  });
});

describe('plan prices', () => {
  it('record the built-in price on a new subscription until the administrator saves a different one', async () => {
    expect((await subscription('amina')).monthlyPriceKsh).toBe(1000);
    await adminUpdateSubscription(db, 'boss', await farmOf('baraka'), 'starter', 'active');
    expect((await subscription('baraka')).monthlyPriceKsh).toBe(500);
  });

  it('apply to new sign-ups and plan changes, never to existing subscriptions', async () => {
    await adminSetSiteContent(db, 'boss', 'prices', { starter: 600, farmer: 1200, farm_pro: 3000 });
    expect((await subscription('amina')).monthlyPriceKsh).toBe(1000); // already subscribed: untouched
    await onboard(db, user('chebet'), details('farm_pro'));
    expect((await subscription('chebet')).monthlyPriceKsh).toBe(3000);
    await adminUpdateSubscription(db, 'boss', await farmOf('baraka'), 'farmer', 'active');
    expect((await subscription('baraka')).monthlyPriceKsh).toBe(1200);
  });

  it('fall back to the built-in price if the saved value is damaged', async () => {
    await pg.query(`update public.site_content set value = '{"starter":"cheap"}'::jsonb where key = 'prices'`);
    const { rows } = await pg.query<{ p: number }>(`select public.plan_price('starter') as p`);
    expect(rows[0].p).toBe(500);
    await adminResetSiteContent(db, 'boss', 'prices');
  });
});

describe('what the website accepts', () => {
  it('rejects bad contact details and accepts normal ones', () => {
    expect(contactSchema.safeParse(contact).success).toBe(true);
    expect(contactSchema.safeParse({ ...contact, email: 'not-an-email' }).success).toBe(false);
    expect(contactSchema.safeParse({ ...contact, phone: 'call me' }).success).toBe(false);
    expect(contactSchema.safeParse({ ...contact, whatsapp: '123' }).success).toBe(false);
    expect(contactSchema.safeParse({ ...contact, extra: 'x' }).success).toBe(false);
    expect(whatsappDigits(contactSchema.parse(contact))).toBe('254700111222');
  });

  it('rejects prices that are not whole positive amounts', () => {
    expect(pricesSchema.safeParse({ starter: 500, farmer: 1000, farm_pro: 2500 }).success).toBe(true);
    expect(pricesSchema.safeParse({ starter: 0, farmer: 1000, farm_pro: 2500 }).success).toBe(false);
    expect(pricesSchema.safeParse({ starter: 50.5, farmer: 1000, farm_pro: 2500 }).success).toBe(false);
    expect(pricesSchema.safeParse({ starter: -5, farmer: 1000, farm_pro: 2500 }).success).toBe(false);
  });

  it('requires a real quote and a name for a testimonial, and limits how many there can be', () => {
    const story = { id: 's1', farmerName: 'Joseph', farmName: '', county: '', cowsCount: 4, quote: 'Mylkio saved me hours every month.', rating: 5, approved: true, sample: false };
    expect(testimonialsSchema.safeParse([story]).success).toBe(true);
    expect(testimonialsSchema.safeParse([{ ...story, quote: 'ok' }]).success).toBe(false);
    expect(testimonialsSchema.safeParse([{ ...story, farmerName: ' ' }]).success).toBe(false);
    expect(testimonialsSchema.safeParse(Array.from({ length: 31 }, (_, i) => ({ ...story, id: `s${i}` }))).success).toBe(false);
  });

  it('ignores a saved value of the wrong shape instead of breaking the website', () => {
    const merged = mergeSiteContent({ contact: { phone: 1 }, prices: 'free', testimonials: 'x', faqs: [{ q: 1 }] });
    expect(merged).toEqual(DEFAULT_SITE_CONTENT);
    expect(mergeSiteContent({ faqs: [] }).faqs).toBeNull(); // an empty FAQ is treated as "use the built-in one"
    expect(faqsSchema.safeParse([{ id: 'a', q: 'How much?', a: 'It depends on the plan.' }]).success).toBe(true);
  });

  it('keeps a saved, empty testimonials list distinct from "never saved"', () => {
    expect(mergeSiteContent({ testimonials: [] }).testimonials).toEqual([]);
    expect(mergeSiteContent({}).testimonials).toBeNull();
  });
});
