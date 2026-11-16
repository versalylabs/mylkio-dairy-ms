import { describe, expect, it } from 'vitest';
import { SUPPORT_EMAIL, SUPPORT_PHONE_DIGITS, SUPPORT_PHONE_DISPLAY, hasDialableNumber, supportMessageHref, whatsappLink } from '@/lib/contact';
import { DEFAULT_SITE_CONTENT, mergeSiteContent, phoneHref } from '@/lib/site-content';
import { PRIVACY, TERMS, withSupportEmail } from '@/lib/legal';

describe('support contact details', () => {
  it('does not present a made-up phone number: the built-in number is a marked placeholder', () => {
    expect(SUPPORT_PHONE_DISPLAY).toMatch(/to be confirmed/);
    expect(SUPPORT_PHONE_DIGITS).toBe('');
    expect(hasDialableNumber(SUPPORT_PHONE_DISPLAY)).toBe(false);
    expect(hasDialableNumber(SUPPORT_PHONE_DIGITS)).toBe(false);
    expect(hasDialableNumber('+254 712 345 678')).toBe(true);
  });

  it('never builds a dead WhatsApp link: with no number, "message Mylkio" becomes an email', () => {
    const none = { whatsapp: '', email: SUPPORT_EMAIL };
    const href = supportMessageHref(none, 'Hello Mylkio, I would like to pay.');
    expect(href.startsWith(`mailto:${SUPPORT_EMAIL}?`)).toBe(true);
    expect(href).toContain(encodeURIComponent('Hello Mylkio, I would like to pay.'));
    expect(supportMessageHref({ whatsapp: '+254 712 345 678', email: SUPPORT_EMAIL }, 'Hi')).toBe(whatsappLink('254712345678', 'Hi'));
  });

  it('shows no phone link on the website until a real number is saved in Admin > Website', () => {
    expect(phoneHref(DEFAULT_SITE_CONTENT.contact)).toBeUndefined();
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
