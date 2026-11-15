# Phase 6: offline reliability

Status: built on 15 November 2026. No database changes. Code: `lib/local-store.ts`, `lib/photos.ts`, `lib/backup.ts`, `lib/offline-ready.ts`, `public/sw.js`; tests: `tests/local-store.test.ts`, `tests/photos.test.ts`, `tests/backup.test.ts`.

The server side of offline work (per-record sync, an outbox, retries that never duplicate, conflict review) was finished in Phase 2 (`docs/per-record-sync.md`). This phase fixes what could still lose or block a farmer's data **on the phone itself**.

## What was wrong

- **The phone copy lived in one 5 MB slot.** The whole farm and the queue of unsent changes were written as one string to `localStorage` on every save. When it filled, the write threw, nothing told the farmer, and a reload could lose recent changes.
- **Photos filled it.** A cow photo was stored as it came off the camera (3 to 8 MB) as text inside the cow's record. Two or three photos could fill the slot, and a record over 1 MB is refused by the cloud, so a cow with a photo could stop syncing. The form also refused any photo over 3.5 MB, which is most phone photos. The first photo was stored twice.
- **A backup made by the app could not be restored by the app.** The backup was written as schema 3 and the restore check refused anything above 2. The restore also refused big farms by a combined-size rule left over from the old bucket-level sync.
- **The app might not open offline right after a first visit.** The service worker only saves files that pass through it. On a first visit the scripts, styles and fonts load before the worker takes control, so they were never saved.
- No way to see how much space is used, whether the browser may clear the data, or when the last backup was.

## What changed

- **Storage moved to IndexedDB** (`lib/local-store.ts`), with `localStorage` as a fallback where IndexedDB is unavailable. Saves are coalesced (many saves in one moment become one write of the latest state), and a failed write **never throws into the app**: it is reported, and the next save retries. The first time, the old `localStorage` copy is moved across and removed only after the new copy reads back identically; a damaged old copy is never overwritten. The app asks the browser to keep the data (`navigator.storage.persist`) and flushes pending writes when the app is hidden or closed.
- **A red notice** appears if the phone cannot save ("This phone is out of storage space… free up space, or shrink photos in Settings"), with how many changes are not yet in the cloud. Nothing is silent any more.
- **Photos are shrunk on the phone** before they are kept (`lib/photos.ts`): long edge 960 px, JPEG, about 90 KB, camera rotation respected, up to 6 per cow and 25 MB per original. One copy of each photo is kept, and the budget is set so a cow with six photos stays well under the cloud's 1 MB record limit. In a real browser an 11.6 MB photo became 75 KB.
- **Settings has a "Backup and storage" card:** a Download backup button, when the last backup was (with a reminder after 30 days, or if a farm with 20 or more records has never backed up), how much space is used and whether the browser protects it, whether the app will **open without internet**, and a **Shrink photos** button for photos saved before this change.
- **Restore works.** The backup version check now matches what the app writes (and still refuses a newer one with a clear reason). A big farm is no longer refused for its total size. Big photos in a backup are shrunk as they are restored instead of blocking the restore. The restore screen is now headed "Restore from a backup". Records already in the farm are never overwritten.
- **Opening offline:** after the worker is active the page hands it the list of files it loaded, and the worker saves them (`CACHE_URLS`, same-origin `/_next/static/` only). The cache name moved to `v4`.

## How it was checked

In a real browser (production build), not just unit tests:
- An old `localStorage` farm was moved into IndexedDB, the old copy was removed, and new saves survived a reload.
- A noisy 12-megapixel JPEG was shrunk to 75 KB; a portrait photo stayed portrait; a small picture was left alone.
- From a simulated first visit (worker and caches wiped), every one of the 11 scripts, styles and fonts the page loaded was in the cache. Then the **server was switched off and the page reloaded: the app opened, ran, and the new Settings card reported "Ready".**
- The card and its buttons were checked at phone width. Tests: 308 pass (40 new in this phase). `next build` passes.

## Not covered

- The "phone is full" path (a real `QuotaExceededError`) is tested with a fake disk, not by filling a real phone.
- A farm signed in to the cloud was not exercised in a browser (it needs a live account); the storage layer under it was, with the cloud turned off.
- Existing farms are not shrunk automatically: the farmer taps **Shrink photos**. (No production farm had photos at the time of writing.)
- Records larger than 1 MB for any other reason are still set aside with an explanation, as before.
- Photos are still stored inside the cow's record. Moving them to separate storage (so they never travel with the record) would be a larger change and is not needed now that they are small.
- iOS Safari can clear a website's data after a few weeks of not opening it unless the app is added to the home screen. The card says so; a backup is the real protection.
