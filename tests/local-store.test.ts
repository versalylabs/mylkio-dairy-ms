import { describe, expect, it, vi } from 'vitest';
import { createLocalStore, type KeyValueBackend } from '@/lib/local-store';

/** An in-memory disk that can be slowed down or made to fail, and records every write. */
function fakeDisk(options: { delayMs?: number } = {}) {
  const data = new Map<string, unknown>();
  const writes: { key: string; value: unknown }[] = [];
  const control = { failWith: null as Error | null };
  const backend: KeyValueBackend = {
    get: async (key) => (data.has(key) ? structuredClone(data.get(key)) : null),
    set: async (key, value) => {
      if (options.delayMs) await new Promise((r) => setTimeout(r, options.delayMs));
      if (control.failWith) throw control.failWith;
      writes.push({ key, value: structuredClone(value) });
      data.set(key, structuredClone(value));
    },
    remove: async (key) => { data.delete(key); },
  };
  return { backend, data, writes, control };
}

const quota = () => Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' });

describe('saving the farm on the phone', () => {
  it('writes the latest state once when many saves arrive in the same moment', async () => {
    const disk = fakeDisk();
    const store = createLocalStore(disk.backend, 'test');
    for (let i = 1; i <= 5; i++) store.save('farm', { revision: i });
    await store.flush();
    expect(disk.writes).toHaveLength(1);
    expect(disk.writes[0].value).toEqual({ revision: 5 });
  });

  it('picks up a save that arrives while a write is running, so the last change is never lost', async () => {
    const disk = fakeDisk({ delayMs: 20 });
    const store = createLocalStore(disk.backend, 'test');
    store.save('farm', { revision: 1 });
    await new Promise((r) => setTimeout(r, 5)); // the first write is now in flight
    store.save('farm', { revision: 2 });
    await store.flush();
    expect(disk.data.get('farm')).toEqual({ revision: 2 });
  });

  it('reports itself as saving until the write has finished', async () => {
    const disk = fakeDisk({ delayMs: 10 });
    const store = createLocalStore(disk.backend, 'test');
    expect(store.status().saving).toBe(false);
    store.save('farm', { a: 1 });
    expect(store.status().saving).toBe(true);
    await store.flush();
    expect(store.status().saving).toBe(false);
  });

  it('keeps separate keys apart', async () => {
    const disk = fakeDisk();
    const store = createLocalStore(disk.backend, 'test');
    store.save('farm-a', { n: 1 });
    store.save('farm-b', { n: 2 });
    await store.flush();
    expect(disk.data.get('farm-a')).toEqual({ n: 1 });
    expect(disk.data.get('farm-b')).toEqual({ n: 2 });
  });
});

describe('when the phone cannot save', () => {
  it('never throws into the app, and says plainly that the phone is out of space', async () => {
    const disk = fakeDisk();
    disk.control.failWith = quota();
    const store = createLocalStore(disk.backend, 'test');
    expect(() => store.save('farm', { n: 1 })).not.toThrow();
    await store.flush();
    expect(store.status().error).toMatch(/out of storage space/);
    expect(store.status().error).toMatch(/shrinking photos/);
  });

  it('describes any other failure without blaming the wrong thing', async () => {
    const disk = fakeDisk();
    disk.control.failWith = new Error('disk on fire');
    const store = createLocalStore(disk.backend, 'test');
    store.save('farm', { n: 1 });
    await store.flush();
    expect(store.status().error).toMatch(/could not save your latest changes/);
    expect(store.status().error).not.toMatch(/out of storage space/);
  });

  it('keeps the newest value, retries on the next save, and clears the warning when a save works', async () => {
    const disk = fakeDisk();
    disk.control.failWith = quota();
    const store = createLocalStore(disk.backend, 'test');
    store.save('farm', { revision: 1 });
    await store.flush();
    expect(disk.data.has('farm')).toBe(false);
    expect(store.status().error).not.toBe('');

    disk.control.failWith = null; // the farmer freed some space
    store.save('farm', { revision: 2 });
    await store.flush();
    expect(disk.data.get('farm')).toEqual({ revision: 2 });
    expect(store.status().error).toBe('');
  });

  it('does not spin on a failing disk', async () => {
    const disk = fakeDisk();
    let attempts = 0;
    disk.backend.set = async () => { attempts++; throw quota(); };
    const store = createLocalStore(disk.backend, 'test');
    store.save('farm', { n: 1 });
    await store.flush();
    await new Promise((r) => setTimeout(r, 30));
    expect(attempts).toBe(1);
  });

  it('tells listeners when the state changes, and survives a listener that throws', async () => {
    const disk = fakeDisk();
    disk.control.failWith = quota();
    const store = createLocalStore(disk.backend, 'test');
    const seen = vi.fn();
    store.subscribe(() => { throw new Error('bad listener'); });
    store.subscribe(seen);
    store.save('farm', { n: 1 });
    await store.flush();
    expect(seen).toHaveBeenCalled();
    expect(store.status().error).not.toBe('');
  });
});

describe('moving the old localStorage copy over', () => {
  const legacyOf = (initial: Record<string, unknown>) => {
    const old = new Map(Object.entries(initial));
    return { old, source: { read: (k: string) => (old.has(k) ? structuredClone(old.get(k)) : null), remove: (k: string) => { old.delete(k); } } };
  };

  it('reads what is saved, and returns null for a farm that has never been saved', async () => {
    const disk = fakeDisk();
    const store = createLocalStore(disk.backend, 'test');
    expect(await store.load('farm')).toBeNull();
    store.save('farm', { n: 7 });
    await store.flush();
    expect(await store.load('farm')).toEqual({ n: 7 });
  });

  it('copies an old copy to the new place, then removes the old one only after it reads back', async () => {
    const disk = fakeDisk();
    const { old, source } = legacyOf({ farm: { cows: [{ id: 'c1' }] } });
    const store = createLocalStore(disk.backend, 'test', source);
    const loaded = await store.load<{ cows: unknown[] }>('farm');
    expect(loaded?.cows).toHaveLength(1);
    expect(disk.data.get('farm')).toEqual({ cows: [{ id: 'c1' }] });
    expect(old.has('farm')).toBe(false);
  });

  it('keeps the old copy, and still returns it, if the new place will not take it', async () => {
    const disk = fakeDisk();
    disk.control.failWith = quota();
    const { old, source } = legacyOf({ farm: { cows: [{ id: 'c1' }] } });
    const store = createLocalStore(disk.backend, 'test', source);
    const loaded = await store.load<{ cows: unknown[] }>('farm');
    expect(loaded?.cows).toHaveLength(1);
    expect(old.has('farm')).toBe(true);
    expect(store.status().error).not.toBe('');
  });

  it('prefers the new place and leaves the old copy alone when both exist', async () => {
    const disk = fakeDisk();
    disk.data.set('farm', { from: 'new' });
    const { old, source } = legacyOf({ farm: { from: 'old' } });
    const store = createLocalStore(disk.backend, 'test', source);
    expect(await store.load('farm')).toEqual({ from: 'new' });
    expect(old.has('farm')).toBe(true);
  });

  it('refuses to guess when the old copy is damaged, so it is never overwritten by an empty farm', async () => {
    const disk = fakeDisk();
    const source = { read: () => { throw new Error('Your local farm cache needs recovery. Contact support before clearing it.'); }, remove: () => undefined };
    const store = createLocalStore(disk.backend, 'test', source);
    await expect(store.load('farm')).rejects.toThrow(/needs recovery/);
  });
});
