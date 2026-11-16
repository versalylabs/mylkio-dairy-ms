import { describe, expect, it } from 'vitest';
import { SUPPORT_EMAIL, SUPPORT_PHONE_DIGITS, SUPPORT_PHONE_DISPLAY, hasDialableNumber, supportMessageHref, whatsappLink } from '@/lib/contact';
import { DEFAULT_SITE_CONTENT, mergeSiteContent, phoneHref } from '@/lib/site-content';
import { PRIVACY, TERMS, withSupportEmail } from '@/lib/legal';

describe('support contact details', () => {
  it('has the support number the owner gave, and treats a missing number as no number', () => {
    expect(SUPPORT_PHONE_DISPLAY).toBe('+254 184 129145');
    expect(SUPPORT_PHONE_DIGITS).toBe('254184129145');
    expect(hasDialableNumber(SUPPORT_PHONE_DIGITS)).toBe(true);
    expect(hasDialableNumber('')).toBe(false);
    expect(hasDialableNumber('+254 7XX XXX XXX (to be confirmed)')).toBe(false);
    expect(hasDialableNumber('+254 712 345 678')).toBe(true);
  });

  it('never builds a dead WhatsApp link: with no number, "message Mylkio" becomes an email', () => {
    const none = { whatsapp: '', email: SUPPORT_EMAIL };
    const href = supportMessageHref(none, 'Hello Mylkio, I would like to pay.');
    expect(href.startsWith(`mailto:${SUPPORT_EMAIL}?`)).toBe(true);
    expect(href).toContain(encodeURIComponent('Hello Mylkio, I would like to pay.'));
    expect(supportMessageHref({ whatsapp: '+254 712 345 678', email: SUPPORT_EMAIL }, 'Hi')).toBe(whatsappLink('254712345678', 'Hi'));
  });

  it('links the phone number, and shows no phone link when there is none', () => {
    expect(phoneHref(DEFAULT_SITE_CONTENT.contact)).toBe('tel:+254184129145');
    expect(phoneHref({ ...DEFAULT_SITE_CONTENT.contact, phone: '' })).toBeUndefined();
    const saved = mergeSiteContent({ contact: { phone: '+254 712 345 678', whatsapp: '+254 712 345 678', email: 'help@example.test' } });
    expect(phoneHref(saved.contact)).toBe('tel:+254712345678');
    expect(saved.contact.email).toBe('help@example.test');
  });
});

describe('the support email in the legal pages follows the one saved on the website', () => {
  const text = (doc: typeof PRIVACY) => doc.sections.flatMap((s) => [...(s.paragraphs ?? []), ...(s.bullets ?? [])]).join('\n');

  it('swaps the built-in address for the saved one, everywhere it appears, and changes nothing else', () => {
    for (const doc of [PRIVACY, TERMS]) {
      const swapped = withSupportEmail(doc, 'help@example.test');
      expect(text(swapped)).toContain('help@example.test');
      expect(text(swapped)).not.toContain(SUPPORT_EMAIL);
      expect(swapped.sections.map((s) => s.heading)).toEqual(doc.sections.map((s) => s.heading));
      expect(text(swapped).replace(/help@example\.test/g, SUPPORT_EMAIL)).toBe(text(doc));
    }
  });

  it('leaves the documents alone when the address has not been changed', () => {
    expect(withSupportEmail(PRIVACY, SUPPORT_EMAIL)).toBe(PRIVACY);
    expect(withSupportEmail(TERMS, '')).toBe(TERMS);
  });
});
