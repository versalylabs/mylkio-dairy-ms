// Phone numbers for vets: calling and WhatsApp links from whatever way a farmer typed the number.

export const VET_KINDS = {
  veterinarian: 'Veterinarian',
  animal_health_assistant: 'Animal health assistant',
  co_op_vet: 'Co-op vet',
  agrovet: 'Agrovet',
  clinic: 'Clinic',
} as const;

export type VetKindId = keyof typeof VET_KINDS;
export const VET_KIND_IDS = Object.keys(VET_KINDS) as VetKindId[];

const digits = (phone: string) => phone.replace(/[^0-9]/g, '');

/** True when there are enough digits to be a phone number (matches the database rule: 9 to 15). */
export function usablePhone(phone: string): boolean {
  const n = digits(phone).length;
  return n >= 9 && n <= 15;
}

/**
 * The number in international form without a plus sign, for wa.me links: 0712 345 678 and +254 712 345 678
 * both become 254712345678. A number that already starts with another country code is left as it is.
 */
export function toInternational(phone: string): string {
  const d = digits(phone);
  if (d.startsWith('00')) return d.slice(2);
  if (/^0\d{9}$/.test(d)) return `254${d.slice(1)}`;
  if (/^[17]\d{8}$/.test(d)) return `254${d}`;
  return d;
}

export const telHref = (phone: string) => `tel:+${toInternational(phone)}`;

export const whatsappHref = (phone: string, text?: string) =>
  `https://wa.me/${toInternational(phone)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
