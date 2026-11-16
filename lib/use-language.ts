'use client';
import { useEffect, useState } from 'react';

export type Lang = 'en' | 'sw';

const KEY = 'mylkio_language';
const EVENT = 'mylkio_language_changed';

const read = (): Lang => {
  try { return localStorage.getItem(KEY) === 'sw' ? 'sw' : 'en'; } catch { return 'en'; }
};

/**
 * The language this person chose (English until they pick Kiswahili), kept in step when it changes anywhere in the
 * app. For screens that are not handed `lang` by their parent. It starts as English and reads the saved choice
 * right after the first paint, so the server-rendered page and the first client render always agree.
 */
export function useLanguage(): [Lang, (next: Lang) => void] {
  const [lang, setLang] = useState<Lang>('en');
  useEffect(() => {
    setLang(read());
    const update = () => setLang(read());
    window.addEventListener(EVENT, update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener(EVENT, update); window.removeEventListener('storage', update); };
  }, []);
  const choose = (next: Lang) => {
    try { localStorage.setItem(KEY, next); } catch { /* The choice only lasts for this visit. */ }
    setLang(next);
    window.dispatchEvent(new Event(EVENT));
  };
  return [lang, choose];
}
