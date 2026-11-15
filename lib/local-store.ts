// Where a farm's records live on the phone.
//
// Until now the whole farm (every record plus the queue of unsent changes) was written as one big string to
// localStorage on every save. localStorage holds about 5 MB per site and throws when it is full, so a farm with a
// few photos could stop saving on the phone, and nothing told the farmer. This module replaces it:
//
//   * IndexedDB holds the data (hundreds of MB, and the browser can be asked not to evict it).
//   * Saves are coalesced: many saves in the same moment become one write of the latest state.
//   * A failed write never throws into the app. It is reported (`status().error`) so the screen can say
//     "this phone could not save your changes" instead of failing silently, and the next save tries again.
//   * localStorage is the fallback where IndexedDB is unavailable (some private windows), and the source the
//     old data is moved from the first time (the old copy is removed only after the new one is read back).
//
// The pure logic takes a backend, so tests can drive it with a fake that fails on demand.

export interface KeyValueBackend {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface LocalStoreStatus {
  /** Which backend is in use: 'indexeddb', 'localstorage' (fallback) or 'memory' (nothing available). */
  backend: string;
  /** Set when the last write failed; cleared by the next write that succeeds. */
  error: string;
  /** A write is waiting or running. */
  saving: boolean;
}

/** The old place the farm lived. Read once, moved, then removed. */
export interface LegacySource {
  read(key: string): unknown | null;
  remove(key: string): void;
}

const describe = (error: unknown) => {
  const e = error as { name?: string; message?: string } | null;
  if (e?.name === 'QuotaExceededError' || /quota|full/i.test(e?.message ?? '')) {
    return 'This phone is out of storage space, so your latest changes could not be saved on it. Free up space on the phone, or make room by shrinking photos in Settings.';
  }
  return 'This phone could not save your latest changes. Your records are not lost, but keep the app open and try again, or make a backup in Settings.';
};

export function createLocalStore(backend: KeyValueBackend, backendName: string, legacy?: LegacySource) {
  const pending = new Map<string, unknown>();
  let writing: Promise<void> | null = null;
  let error = '';
  let scheduled = false;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((fn) => { try { fn(); } catch { /* A listener must not break saving. */ } });

  async function drain() {
    while (pending.size > 0) {
      const batch = [...pending.entries()];
      pending.clear();
      for (const [key, value] of batch) {
        try {
          await backend.set(key, value);
          if (error) { error = ''; notify(); }
        } catch (cause) {
          error = describe(cause);
          // Keep the newest value so the next attempt (or the next save) writes it.
          if (!pending.has(key)) pending.set(key, value);
          notify();
          return; // Do not spin on a failing disk: the next save retries.
        }
      }
    }
  }

  function startWriting() {
    scheduled = false;
    if (writing) return;
    writing = drain().finally(() => {
      writing = null;
      // A save that arrived during the last write is picked up by the next one.
      if (pending.size > 0 && !error) startWriting();
      notify();
    });
  }

  return {
    /** Queues the latest value for `key`. Never throws. */
    save(key: string, value: unknown) {
      pending.set(key, value);
      if (!scheduled && !writing) {
        scheduled = true;
        queueMicrotask(startWriting);
      }
      notify();
    },

    /** Resolves when everything saved so far has been written (or has failed and been reported). */
    async flush() {
      if (scheduled && !writing) startWriting();
      while (writing) await writing;
      if (pending.size > 0 && !error) { startWriting(); while (writing) await writing; }
    },

    /** Reads a value. If there is none yet, moves it over from the legacy place. */
    async load<T>(key: string): Promise<T | null> {
      let value: unknown | null = null;
      try { value = await backend.get(key); } catch { value = null; }
      if (value != null) return value as T;
      const old = legacy?.read(key) ?? null;
      if (old == null) return null;
      try {
        await backend.set(key, old);
        const back = await backend.get(key);
        // Only remove the old copy once the new one reads back.
        if (back != null && JSON.stringify(back) === JSON.stringify(old)) legacy?.remove(key);
      } catch (cause) {
        error = describe(cause);
        notify();
      }
      return old as T;
    },

    async remove(key: string) {
      pending.delete(key);
      try { await backend.remove(key); } catch { /* Nothing to clean up. */ }
    },

    status(): LocalStoreStatus {
      return { backend: backendName, error, saving: writing !== null || pending.size > 0 || scheduled };
    },

    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  };
}

// ---- Real backends (browser only) ----

function indexedDbBackend(): KeyValueBackend | null {
  if (typeof indexedDB === 'undefined') return null;
  let opening: Promise<IDBDatabase> | null = null;
  const open = () => (opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('mylkio', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('kv'); };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); opening = null; };
      resolve(db);
    };
    request.onerror = () => { opening = null; reject(request.error); };
    request.onblocked = () => { opening = null; reject(new Error('Storage is busy in another tab.')); };
  }));
  const run = async <T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction('kv', mode);
      const request = work(tx.objectStore('kv'));
      let result: T;
      request.onsuccess = () => { result = request.result; };
      // Resolve on the transaction completing, not the request: that is when the data is really stored.
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error ?? request.error);
      tx.onabort = () => reject(tx.error ?? new DOMException('Storage write was aborted.', 'AbortError'));
    });
  };
  return {
    get: async (key) => (await run('readonly', (s) => s.get(key))) ?? null,
    set: async (key, value) => { await run('readwrite', (s) => s.put(value, key)); },
    remove: async (key) => { await run('readwrite', (s) => s.delete(key)); },
  };
}

function localStorageBackend(): KeyValueBackend | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return {
      get: async (key) => { const raw = localStorage.getItem(key); return raw == null ? null : JSON.parse(raw); },
      set: async (key, value) => { localStorage.setItem(key, JSON.stringify(value)); },
      remove: async (key) => { localStorage.removeItem(key); },
    };
  } catch { return null; }
}

const memory = new Map<string, unknown>();
const memoryBackend: KeyValueBackend = {
  get: async (key) => (memory.has(key) ? structuredClone(memory.get(key)) : null),
  set: async (key, value) => { memory.set(key, structuredClone(value)); },
  remove: async (key) => { memory.delete(key); },
};

const legacyLocalStorage: LegacySource | undefined = typeof localStorage === 'undefined' ? undefined : {
  read(key) {
    try { const raw = localStorage.getItem(key); return raw == null ? null : JSON.parse(raw); }
    catch { throw new Error('Your local farm cache needs recovery. Contact support before clearing it.'); }
  },
  remove(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } },
};

/** The store the app uses. IndexedDB, else localStorage, else memory (nothing survives a reload). */
export const LocalStore = (() => {
  const idb = indexedDbBackend();
  if (idb) return createLocalStore(idb, 'indexeddb', legacyLocalStorage);
  const ls = localStorageBackend();
  if (ls) return createLocalStore(ls, 'localstorage');
  return createLocalStore(memoryBackend, 'memory');
})();

// ---- Storage health and persistence ----

export interface StorageHealth {
  /** Bytes used by this site, and what the browser allows it. Null where the browser does not say. */
  usage: number | null;
  quota: number | null;
  /** True when the browser has promised not to clear this site's data to make room. */
  persistent: boolean | null;
}

/** Asks the browser not to evict the farm's data, and reports how much space is used. Safe to call often. */
export async function checkStorage(requestPersistence = false): Promise<StorageHealth> {
  const health: StorageHealth = { usage: null, quota: null, persistent: null };
  if (typeof navigator === 'undefined' || !navigator.storage) return health;
  try {
    if (requestPersistence && navigator.storage.persist && !(await navigator.storage.persisted?.())) await navigator.storage.persist();
    if (navigator.storage.persisted) health.persistent = await navigator.storage.persisted();
    if (navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      health.usage = estimate.usage ?? null;
      health.quota = estimate.quota ?? null;
    }
  } catch { /* Health is informational. */ }
  return health;
}

/** Writes anything still waiting when the app is hidden or closed. */
export function flushOnLeave() {
  if (typeof window === 'undefined') return;
  const flush = () => { void LocalStore.flush(); };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
}
