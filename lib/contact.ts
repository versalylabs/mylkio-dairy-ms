// How to reach Mylkio. One place, used by the website, Settings, the legal pages and the administration screens.
// The administrator's "Website" tab can override these without a release (see lib/site-content.ts); these are what
// shows until something is saved there.
//
// The phone number was given by the owner on 16 November 2026 (0184129145). Check it before the pilot: the "018"
// start is not one of the usual Kenyan mobile or landline prefixes, so ring it once to be sure it is answered.
// If it is wrong, change it here or in Admin > Website > Contact. With no number (an empty digits string) the phone
// and WhatsApp buttons are hidden and "message Mylkio" falls back to email, so nobody is sent to a dead number.
export const SUPPORT_PHONE_DISPLAY = '+254 184 129145';
export const SUPPORT_PHONE_DIGITS = '254184129145';
export const SUPPORT_EMAIL = 'versalylabs@gmail.com';

/** True when a phone number has real digits (an empty or placeholder value has none, so links built from it are not shown). */
export const hasDialableNumber = (digitsOrDisplay: string) => digitsOrDisplay.replace(/\D/g, '').length >= 9;

export const whatsappLink = (digits: string, text: string) =>
  `https://wa.me/${digits.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;

/** Where a "message Mylkio" button goes: WhatsApp when there is a real number, otherwise an email, never a dead link. */
export const supportMessageHref = (contact: { whatsapp: string; email: string }, text: string) =>
  hasDialableNumber(contact.whatsapp)
    ? whatsappLink(contact.whatsapp, text)
    : `mailto:${contact.email}?subject=${encodeURIComponent('Mylkio')}&body=${encodeURIComponent(text)}`;
