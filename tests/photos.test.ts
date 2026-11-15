import { describe, expect, it } from 'vitest';
import {
  MAX_PHOTOS_PER_COW, PHOTO_MAX_EDGE, PHOTO_MAX_INPUT_BYTES, PHOTO_RECORD_BUDGET, PHOTO_TARGET_BYTES, SHRINK_STEPS,
  dataUrlBytes, fitWithin, needsShrinking, photoChars, photoProblem, photoSavings, primaryPhoto, shrinkCowPhotos,
} from '@/lib/photos';
import { MAX_RECORD_BYTES } from '@/lib/backend-contract';

/** A fake photo of a chosen size in decoded bytes. */
const photo = (bytes: number, tag = 'x') => `data:image/jpeg;base64,${Buffer.alloc(bytes, tag).toString('base64')}`;

describe('sizing a photo', () => {
  it('keeps small pictures as they are and scales large ones down to the long edge', () => {
    expect(fitWithin(640, 480)).toEqual({ width: 640, height: 480 });
    expect(fitWithin(4000, 3000)).toEqual({ width: PHOTO_MAX_EDGE, height: Math.round(3000 * (PHOTO_MAX_EDGE / 4000)) });
    expect(fitWithin(3000, 4000)).toEqual({ width: Math.round(3000 * (PHOTO_MAX_EDGE / 4000)), height: PHOTO_MAX_EDGE });
  });

  it('never makes a side zero, and copes with an unreadable size', () => {
    expect(fitWithin(10000, 1)).toEqual({ width: PHOTO_MAX_EDGE, height: 1 });
    expect(fitWithin(0, 100)).toEqual({ width: 0, height: 0 });
    expect(fitWithin(Number.NaN, 100)).toEqual({ width: 0, height: 0 });
  });

  it('works out the size of a saved picture from its data address', () => {
    expect(dataUrlBytes(photo(1000))).toBe(1000);
    expect(dataUrlBytes(photo(1001))).toBe(1001);
    expect(dataUrlBytes(photo(1002))).toBe(1002);
    expect(dataUrlBytes('https://example.com/cow.jpg')).toBe(0);
    expect(dataUrlBytes('data:image/jpeg;base64')).toBe(0);
  });

  it('only wants to shrink saved photos that are larger than the target', () => {
    expect(needsShrinking(photo(PHOTO_TARGET_BYTES + 5000))).toBe(true);
    expect(needsShrinking(photo(PHOTO_TARGET_BYTES - 5000))).toBe(false);
    expect(needsShrinking('https://example.com/cow.jpg')).toBe(false);
    expect(needsShrinking('data:text/plain;base64,aGVsbG8=')).toBe(false);
  });

  it('tries smaller and smaller steps, ending well below the first', () => {
    for (let i = 1; i < SHRINK_STEPS.length; i++) {
      const [a, b] = [SHRINK_STEPS[i - 1], SHRINK_STEPS[i]];
      expect(b.edge <= a.edge && b.quality <= a.quality && (b.edge < a.edge || b.quality < a.quality)).toBe(true);
    }
    expect(SHRINK_STEPS[0].edge).toBe(PHOTO_MAX_EDGE);
  });
});

describe('what a farmer may pick', () => {
  it('accepts a normal phone photo and refuses a non-picture or a huge file', () => {
    expect(photoProblem({ type: 'image/jpeg', size: 6 * 1024 * 1024 })).toBeNull(); // the old 3.5 MB limit refused this
    expect(photoProblem({ type: 'application/pdf', size: 1000 })).toMatch(/not a picture/);
    expect(photoProblem({ type: 'image/png', size: PHOTO_MAX_INPUT_BYTES + 1 })).toMatch(/25 MB/);
  });
});

describe('fitting photos inside one cow record', () => {
  it('lets the most photos at the target size sit comfortably under the cloud limit, counting the text overhead', () => {
    const worstCase = Array.from({ length: MAX_PHOTOS_PER_COW }, () => photo(PHOTO_TARGET_BYTES));
    expect(photoChars(worstCase)).toBeLessThanOrEqual(PHOTO_RECORD_BUDGET);
    expect(PHOTO_RECORD_BUDGET + 5_000).toBeLessThan(MAX_RECORD_BYTES);
  });

  it('shows a cow by her first photo, falling back to the older single-photo field', () => {
    expect(primaryPhoto({ photoUrls: ['a', 'b'], photoUrl: 'old' })).toBe('a');
    expect(primaryPhoto({ photoUrl: 'old' })).toBe('old');
    expect(primaryPhoto({})).toBeUndefined();
  });

  it('counts what shrinking would free without changing anything', () => {
    const big = photo(400_000); const small = photo(50_000, 'y');
    const cows = [{ photoUrl: big, photoUrls: [big, small] }, { photoUrl: 'https://example.com/a.jpg' }, {}];
    const savings = photoSavings(cows);
    expect(savings.photos).toBe(2); // the first photo is saved twice in an old record but counted once
    expect(savings.large).toBe(1);
    expect(savings.bytes).toBe(450_000);
  });
});

describe('shrinking the photos on a cow', () => {
  const halve = async (url: string) => photo(Math.floor(dataUrlBytes(url) / 2));

  it('shrinks each photo, and keeps ONE list so an old record that stored the first photo twice gets smaller', async () => {
    const a = photo(400_000, 'a'); const b = photo(300_000, 'b');
    const cow = { id: 'c1', tag: 'GH-1', photoUrl: a, photoUrls: [a, b] };
    const result = await shrinkCowPhotos(cow, halve);
    expect(result.photoUrl).toBeUndefined();
    expect(result.photoUrls).toHaveLength(2);
    expect(dataUrlBytes(result.photoUrls![0])).toBe(200_000);
    expect(JSON.stringify(result).length).toBeLessThan(JSON.stringify(cow).length / 2);
    expect(result.tag).toBe('GH-1');
  });

  it('adopts a lone older photoUrl into the list', async () => {
    const a = photo(400_000);
    const result = await shrinkCowPhotos<{ photoUrl?: string; photoUrls?: string[] }>({ photoUrl: a }, halve);
    expect(result.photoUrls).toHaveLength(1);
  });

  it('leaves a cow with no photos exactly as she was', async () => {
    const cow: { id: string; photoUrl?: string; photoUrls?: string[] } = { id: 'c1' };
    expect(await shrinkCowPhotos(cow, halve)).toBe(cow);
  });

  it('keeps a photo it cannot read rather than losing it', async () => {
    const a = photo(400_000);
    const broken = async () => { throw new Error('unreadable'); };
    const result = await shrinkCowPhotos({ photoUrls: [a] }, broken);
    expect(result.photoUrls).toEqual([a]);
  });
});
