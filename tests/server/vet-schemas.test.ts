import { describe, expect, it } from 'vitest';
import { adminVetInput, myVetInput, vetSuggestionInput } from '@/lib/server/vet-schemas';

const suggestion = { name: 'Dr Wanjiru', kind: 'veterinarian', county: 'Nairobi', phone: '0712 345 678' };

describe('vet request validation', () => {
  it('accepts a saved vet with an optional note, and trims it', () => {
    expect(myVetInput.parse({ name: '  Dr Otieno ', kind: 'agrovet', phone: ' 0722 111 222 ', notes: '  night calls  ' }))
      .toEqual({ name: 'Dr Otieno', kind: 'agrovet', phone: '0722 111 222', notes: 'night calls' });
    expect(myVetInput.parse({ name: 'Dr Otieno', kind: 'agrovet', phone: '0722 111 222', notes: '   ' }).notes).toBeUndefined();
  });

  it('refuses a name that is too short, a kind that does not exist, or a number without enough digits', () => {
    expect(() => myVetInput.parse({ name: 'x', kind: 'agrovet', phone: '0722 111 222' })).toThrow();
    expect(() => myVetInput.parse({ name: 'Dr X', kind: 'wizard', phone: '0722 111 222' })).toThrow();
    expect(() => myVetInput.parse({ name: 'Dr X', kind: 'agrovet', phone: '123' })).toThrow();
    expect(() => myVetInput.parse({ name: 'Dr X', kind: 'agrovet', phone: '1'.repeat(16) })).toThrow();
  });

  it('refuses fields it does not know about', () => {
    expect(() => myVetInput.parse({ name: 'Dr X', kind: 'agrovet', phone: '0722 111 222', status: 'confirmed' })).toThrow();
    expect(() => vetSuggestionInput.parse({ ...suggestion, status: 'confirmed' })).toThrow();
  });

  it('keeps a farmer from choosing a status or a confirmation day, which only an administrator can set', () => {
    expect(() => vetSuggestionInput.parse({ ...suggestion, confirmedOn: '2026-11-15' })).toThrow();
    expect(vetSuggestionInput.parse(suggestion)).not.toHaveProperty('status');
  });

  it('lets an administrator set a status and the day they rang, in a real date format', () => {
    expect(adminVetInput.parse({ ...suggestion, status: 'confirmed', confirmedOn: '2026-11-15' })).toMatchObject({ status: 'confirmed', confirmedOn: '2026-11-15' });
    expect(() => adminVetInput.parse({ ...suggestion, status: 'confirmed', confirmedOn: '15/11/2026' })).toThrow();
    expect(() => adminVetInput.parse({ ...suggestion, status: 'maybe' })).toThrow();
    expect(adminVetInput.parse({ ...suggestion, status: 'pending', id: null }).id).toBeNull();
  });
});
