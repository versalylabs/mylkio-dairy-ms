import { describe, expect, it } from 'vitest';
import { isNewFarm } from '@/components/dashboard/FarmStart';
import { START_COPY } from '@/lib/start-copy';
import { autoShrinkKey, shouldAutoShrinkPhotos } from '@/lib/photos';
import { canWrite } from '@/lib/team';

describe('the three-step start on Home', () => {
  it('shows for a farm with no cows, no milk and nothing to attend to, and for no other', () => {
    expect(isNewFarm({ cows: 0, milk: 0, openReminders: 0 })).toBe(true);
    expect(isNewFarm({ cows: 1, milk: 0, openReminders: 0 })).toBe(false);
    expect(isNewFarm({ cows: 0, milk: 1, openReminders: 0 })).toBe(false);
    expect(isNewFarm({ cows: 0, milk: 0, openReminders: 1 })).toBe(false);
  });

  it('names the three steps in order, milk first and needing no cow, in both languages', () => {
    for (const lang of ['en', 'sw'] as const) {
      expect(Object.keys(START_COPY[lang].steps)).toEqual(['milk', 'cow', 'buyer']);
    }
    expect(START_COPY.en.steps.milk.hint).toMatch(/do not need to add any cows first/);
    expect(START_COPY.en.heading).toBe('Start your farm in three steps');
  });

  it('leaves out a step the person may not take: a worker records milk but cannot add a cow or a buyer', () => {
    expect(canWrite('worker', 'milk')).toBe(true);
    expect(canWrite('worker', 'cows')).toBe(false);
    expect(canWrite('worker', 'buyers')).toBe(false);
    expect(canWrite('owner', 'cows') && canWrite('owner', 'buyers') && canWrite('manager', 'milk')).toBe(true);
  });
});

describe('shrinking old photos by itself', () => {
  const base = { demo: false, canEditCows: true, alreadyDone: false, cowsLoaded: true };

  it('runs once for a real farm, for someone who may change cows, when the cows have loaded', () => {
    expect(shouldAutoShrinkPhotos(base)).toBe(true);
  });

  it('does not run for the demo, for a worker, before the cows have loaded, or when it has been done', () => {
    expect(shouldAutoShrinkPhotos({ ...base, demo: true })).toBe(false);
    expect(shouldAutoShrinkPhotos({ ...base, canEditCows: false })).toBe(false);
    expect(shouldAutoShrinkPhotos({ ...base, cowsLoaded: false })).toBe(false);
    expect(shouldAutoShrinkPhotos({ ...base, alreadyDone: true })).toBe(false);
  });

  it('remembers it per farm, so another farm on the same phone is looked at too', () => {
    expect(autoShrinkKey('farm-a')).not.toBe(autoShrinkKey('farm-b'));
    expect(autoShrinkKey('farm-a')).toContain('farm-a');
  });
});
