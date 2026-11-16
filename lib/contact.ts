// How to reach Mylkio. One place, used by the website, Settings, the legal pages and the administration screens.
// The administrator's "Website" tab can override these without a release (see lib/site-content.ts); these are what
// shows until something is saved there.
//
// OWNER DECISION NEEDED: the support phone number. The number that used to be here was not a valid Kenyan format
// and nobody should be told to pay or call it, so it has been replaced by a clearly marked placeholder. Until a real
// number is set (here, or in Admin > Website > Contact), phone and WhatsApp buttons are hidden and the website
// shows the placeholder text, so nobody is sent to a wrong number.
export const SUPPORT_PHONE_DISPLAY = '+254 7XX XXX XXX (to be confirmed)';
export const SUPPORT_PHONE_DIGITS = '';
export const SUPPORT_EMAIL = 'versalylabs@gmail.com';

/** True when a phone number has real digits (a placeholder has none, so links built from it are not shown). */
export const hasDialableNumber = (digitsOrDisplay: string) => digitsOrDisplay.replace(/\D/g, '').length >= 9;

export const whatsappLink = (digits: string, text: string) =>
  `https://wa.me/${digits.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;

/** Where a "message Mylkio" button goes: WhatsApp when there is a real number, otherwise an email, never a dead link. */
export const supportMessageHref = (contact: { whatsapp: string; email: string }, text: string) =>
  hasDialableNumber(contact.whatsapp)
    ? whatsappLink(contact.whatsapp, text)
    : `mailto:${contact.email}?subject=${encodeURIComponent('Mylkio')}&body=${encodeURIComponent(text)}`;
