// Makes the app open with no internet on a returning visit.
//
// The service worker (public/sw.js) saves a page or script only when it passes through the worker. On the very first
// visit the worker is still installing while the page's scripts, styles and fonts load, so they never pass through it,
// and a phone that goes offline right after the first visit could open the page shell but not run it. After the worker
// is active, the page tells it which files it loaded, and the worker saves them.

/** The files under /_next/static/ that this page has loaded, as paths. */
export function loadedStaticFiles(entries: { name: string }[], origin: string): string[] {
  const found = new Set<string>();
  for (const entry of entries) {
    try {
      const url = new URL(entry.name, origin);
      if (url.origin === origin && url.pathname.startsWith('/_next/static/')) found.add(url.pathname + url.search);
    } catch { /* Not a URL. */ }
  }
  return [...found];
}

/** Seconds to wait before handing the files over again after some could not be saved, or null to stop trying. */
export const RETRY_AFTER_SECONDS = [3, 10, 30, 60];
export const retryDelay = (attempt: number): number | null => (attempt >= 0 && attempt < RETRY_AFTER_SECONDS.length ? RETRY_AFTER_SECONDS[attempt] * 1000 : null);

/** Registers the worker and hands it the page's files. Production only: development file names change on every start. */
export function registerOfflineApp() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (process.env.NODE_ENV !== 'production') {
    void navigator.serviceWorker.getRegistrations().then((list) => list.forEach((r) => void r.unregister()));
    if (typeof caches !== 'undefined') void caches.keys().then((keys) => keys.filter((k) => k.startsWith('mylkio-cache-')).forEach((k) => void caches.delete(k)));
    return;
  }
  navigator.serviceWorker.register('/sw.js').catch(() => {});
  let attempt = 0;
  const handOver = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const urls = loadedStaticFiles(performance.getEntriesByType('resource'), window.location.origin);
      registration.active?.postMessage({ type: 'CACHE_URLS', urls });
    } catch { /* Offline readiness is best effort. */ }
  };
  // The worker says how many files it could not save (a weak network): try again a few times, then stop.
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== 'CACHE_RESULT' || !(event.data.failed > 0)) return;
    const wait = retryDelay(attempt++);
    if (wait !== null) window.setTimeout(() => void handOver(), wait);
  });
  // A worker that takes control later (first visit) gets the files too.
  navigator.serviceWorker.addEventListener('controllerchange', () => { window.setTimeout(() => void handOver(), 500); });
  if (document.readyState === 'complete') void handOver();
  else window.addEventListener('load', () => { window.setTimeout(() => void handOver(), 1500); }, { once: true });
}
