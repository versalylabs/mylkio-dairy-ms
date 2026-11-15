import { describe, expect, it } from 'vitest';
import { VET_KINDS, VET_KIND_IDS, telHref, toInternational, usablePhone, whatsappHref } from '@/lib/vet/phone';

describe('vet phone numbers', () => {
  it('turns every common way of writing a Kenyan mobile number into the international form', () => {
    for (const written of ['0712 345 678', '0712345678', '+254 712 345 678', '254712345678', '712345678', '00254 712 345 678', '(0712) 345-678']) {
      expect(toInternational(written), written).toBe('254712345678');
    }
    expect(toInternational('0112 345 678')).toBe('254112345678');
  });

  it('handles a Nairobi landline and leaves another country code alone', () => {
    expect(toInternational('020 8043441')).toBe('254208043441');
    expect(toInternational('+256 772 123 456')).toBe('256772123456');
  });

  it('builds a call link and a WhatsApp link, with the message encoded', () => {
    expect(telHref('0712 345 678')).toBe('tel:+254712345678');
    expect(whatsappHref('0712 345 678')).toBe('https://wa.me/254712345678');
    expect(whatsappHref('0712 345 678', 'Hello & thanks\nLine 2')).toBe('https://wa.me/254712345678?text=Hello%20%26%20thanks%0ALine%202');
  });

  it('accepts only numbers with 9 to 15 digits, like the database', () => {
    expect(usablePhone('0712 345 678')).toBe(true);
    expect(usablePhone('12')).toBe(false);
    expect(usablePhone('no digits')).toBe(false);
    expect(usablePhone('1234567890123456')).toBe(false);
  });

  it('names every kind of vet that the database accepts', () => {
    expect(VET_KIND_IDS.sort()).toEqual(['agrovet', 'animal_health_assistant', 'clinic', 'co_op_vet', 'veterinarian']);
    for (const id of VET_KIND_IDS) expect(VET_KINDS[id].length).toBeGreaterThan(3);
  });
});
