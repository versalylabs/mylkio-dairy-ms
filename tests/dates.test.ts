import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, farmToday, isFarmDate, monthRange, previousMonthRange, toFarmDate, trailingRange } from '@/lib/dates';

describe('farm dates (Africa/Nairobi)', () => {
  it('uses the Kenyan date between midnight and 03:00, when UTC is still the previous day', () => {
    const lateNightUtc = new Date('2026-11-07T22:30:00Z'); // 01:30 on 8 Nov in Nairobi
    expect(lateNightUtc.toISOString().slice(0, 10)).toBe('2026-11-07');
    expect(farmToday(lateNightUtc)).toBe('2026-11-08');
  });

  it('keeps the same date late in the Kenyan evening', () => {
    expect(toFarmDate('2026-11-08T20:59:00Z')).toBe('2026-11-08'); // 23:59 EAT
    expect(toFarmDate('2026-11-08T21:00:00Z')).toBe('2026-11-09'); // 00:00 EAT
  });

  it('does calendar arithmetic across month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(daysBetween('2026-11-01', '2026-11-08')).toBe(7);
  });

  it('builds month and trailing ranges', () => {
    expect(monthRange('2026-02-14')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(previousMonthRange('2026-01-10')).toEqual({ from: '2025-12-01', to: '2025-12-31' });
    expect(trailingRange('2026-11-08', 7)).toEqual({ from: '2026-11-02', to: '2026-11-08' });
  });

  it('validates farm dates', () => {
    expect(isFarmDate('2026-11-08')).toBe(true);
    expect(isFarmDate('2026-02-30')).toBe(false);
    expect(isFarmDate('2026-11-08T00:00:00Z')).toBe(false);
  });
});
