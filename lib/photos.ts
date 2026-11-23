// Cow photos, made small enough to keep.
//
// A phone camera photo is 3 to 8 MB. Stored as it came, two or three of them filled the phone's storage and any
// record over 1 MB was refused by the cloud, so a cow with a photo could stop syncing. Photos are now shrunk on
// the phone, before saving, to a sensible size for identifying an animal: long edge 960 px, JPEG, about 60 to
// 90 KB. Several photos must also fit in ONE cow record, which the cloud limits to 1 MB (see PHOTO_RECORD_BUDGET). The sizes and limits are plain numbers and functions here so they can be tested; the picture work uses
// the browser's canvas.

export const PHOTO_MAX_EDGE = 960;
/** Photos at or below this size (decoded bytes) are kept as they are. */
export const PHOTO_TARGET_BYTES = 90_000;
/**
 * All of one cow's photos, as saved text, must stay under this many characters so the whole cow record stays
 * well under the cloud's 1 MB limit (a data address is about a third longer than the picture it holds).
 */
export const PHOTO_RECORD_BUDGET = 850_000;
/** What a farmer may pick. A larger original is refused before it is read into memory. */
export const PHOTO_MAX_INPUT_BYTES = 25 * 1024 * 1024;
export const MAX_PHOTOS_PER_COW = 6;

/** The picture shown for a cow in lists: her first photo. */
export const primaryPhoto = (cow: { photoUrl?: string; photoUrls?: string[] }) => cow.photoUrls?.[0] ?? cow.photoUrl;

/** Characters the photos take up in the saved record. */
export const photoChars = (photos: string[]) => photos.reduce((sum, p) => sum + p.length, 0);

/** The size to draw a picture at so its longer edge is at most `max`, keeping its shape. */
export function fitWithin(width: number, height: number, max: number = PHOTO_MAX_EDGE): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Bytes of the picture inside a `data:` address (the base64 part, decoded). Zero for anything else. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:') || comma < 0) return 0;
  const payload = dataUrl.slice(comma + 1);
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

export const isImageDataUrl = (value: unknown): value is string => typeof value === 'string' && value.startsWith('data:image/');

/** True for a saved photo that is worth shrinking. */
export const needsShrinking = (dataUrl: string) => isImageDataUrl(dataUrl) && dataUrlBytes(dataUrl) > PHOTO_TARGET_BYTES;

/** The steps tried, from best quality down, until the photo is small enough. */
export const SHRINK_STEPS: { edge: number; quality: number }[] = [
  { edge: 960, quality: 0.7 },
  { edge: 960, quality: 0.6 },
  { edge: 800, quality: 0.55 },
  { edge: 640, quality: 0.5 },
  { edge: 512, quality: 0.45 },
];

/** Reports why a file cannot be used as a photo, or null if it can. */
export function photoProblem(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith('image/')) return 'That file is not a picture.';
  if (file.size > PHOTO_MAX_INPUT_BYTES) return 'That photo is larger than 25 MB. Choose a smaller one.';
  return null;
}

function loadImage(source: Blob): Promise<{ draw: (context: CanvasRenderingContext2D, w: number, h: number) => void; width: number; height: number; close: () => void }> {
  // createImageBitmap applies the camera's rotation, so portrait photos are not saved sideways.
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(source, { imageOrientation: 'from-image' }).then((bitmap) => ({
      width: bitmap.width, height: bitmap.height,
      draw: (context, w, h) => context.drawImage(bitmap, 0, 0, w, h),
      close: () => bitmap.close(),
    }));
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const image = new Image();
    image.onload = () => resolve({
      width: image.naturalWidth, height: image.naturalHeight,
      draw: (context, w, h) => context.drawImage(image, 0, 0, w, h),
      close: () => URL.revokeObjectURL(url),
    });
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That picture could not be read.')); };
    image.src = url;
  });
}

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('That picture could not be read.')));
  reader.onerror = () => reject(new Error('That picture could not be read.'));
  reader.readAsDataURL(blob);
});

/** Shrinks a picture (a file, or the Blob of a saved one) to a JPEG data address of about 90 KB or less. */
export async function shrinkPhoto(source: Blob): Promise<string> {
  const image = await loadImage(source);
  try {
    let best = '';
    for (const step of SHRINK_STEPS) {
      const { width, height } = fitWithin(image.width, image.height, step.edge);
      if (!width) throw new Error('That picture could not be read.');
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('This phone cannot prepare the picture.');
      // A white base so a transparent PNG does not turn black as a JPEG.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      image.draw(context, width, height);
      const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', step.quality));
      if (!jpeg) throw new Error('This phone cannot prepare the picture.');
      best = await blobToDataUrl(jpeg);
      if (dataUrlBytes(best) <= PHOTO_TARGET_BYTES) break;
    }
    return best;
  } finally {
    image.close();
  }
}

/** Shrinks a photo already saved as a data address. Anything already small, or not a picture, is returned as it is. */
export async function shrinkSavedPhoto(dataUrl: string): Promise<string> {
  if (!needsShrinking(dataUrl)) return dataUrl;
  const blob = await (await fetch(dataUrl)).blob();
  const smaller = await shrinkPhoto(blob);
  return dataUrlBytes(smaller) < dataUrlBytes(dataUrl) ? smaller : dataUrl;
}

/** Remembers, per farm and per phone, that old photos have already been shrunk in the background. */
export const autoShrinkKey = (farmId: string) => `mylkio_photos_auto_shrunk_${farmId}`;

/**
 * Whether the app should shrink this farm's old photos by itself, once, when it is opened. Only for a real farm (not
 * the demo), for someone who may change cows (a worker may not), once the cows have loaded, and only if the farm has
 * not already had it done on this phone. The "Shrink photos" button in Settings stays, for doing it by hand.
 */
export function shouldAutoShrinkPhotos(input: { demo: boolean; canEditCows: boolean; alreadyDone: boolean; cowsLoaded: boolean }): boolean {
  return !input.demo && input.canEditCows && !input.alreadyDone && input.cowsLoaded;
}

/** What shrinking the saved photos of these cows would free, without changing anything. */
export function photoSavings(cows: { photoUrl?: string; photoUrls?: string[] }[]): { photos: number; large: number; bytes: number } {
  let photos = 0; let large = 0; let bytes = 0;
  for (const cow of cows) {
    for (const url of new Set([cow.photoUrl, ...(cow.photoUrls ?? [])].filter(isImageDataUrl))) {
      photos += 1;
      const size = dataUrlBytes(url);
      bytes += size;
      if (size > PHOTO_TARGET_BYTES) large += 1;
    }
  }
  return { photos, large, bytes };
}

/**
 * A cow's photos with every large one shrunk, kept as ONE list (older records stored the first photo twice, which
 * doubled their size). A cow with no photos is returned unchanged. `shrink` is replaceable so this can be tested
 * without a canvas.
 */
export async function shrinkCowPhotos<T extends { photoUrl?: string; photoUrls?: string[] }>(
  cow: T,
  shrink: (dataUrl: string) => Promise<string> = shrinkSavedPhoto,
): Promise<T> {
  const all = [...new Set([...(cow.photoUrls ?? []), ...(cow.photoUrl ? [cow.photoUrl] : [])])];
  if (all.length === 0) return cow;
  const smaller: string[] = [];
  for (const url of all) {
    try { smaller.push(await shrink(url)); } catch { smaller.push(url); } // A picture that cannot be read is kept as it is.
  }
  return { ...cow, photoUrl: undefined, photoUrls: smaller };
}
